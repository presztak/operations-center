import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ClusterAddServerBtn from "components/ClusterAddServerBtn";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Cluster } from "types/cluster";

const add = "POST /1.0/provisioning/clusters/c1/:add-servers";

const openAdd = async (handler: Handler) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": ok([
      { name: "s1", server_type: "incus" },
      { name: "s2", server_type: "incus" },
      { name: "mm1", server_type: "migration-manager" },
    ]),
    [add]: handler,
  });
  const view = renderWithProviders(
    <ClusterAddServerBtn cluster={{ name: "c1" } as Cluster} />,
  );
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  await view.user.click(screen.getByTitle("Add server"));
  const dialog = screen.getByRole("dialog");
  const select = within(dialog).getByLabelText("Servers");
  await within(select).findByRole("option", { name: "s1" });

  const submit = async () => {
    await view.user.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  };

  return { ...view, api, dialog, select, invalidate, submit };
};

test("adds the selected servers", async () => {
  const { user, api, dialog, select, invalidate, submit } = await openAdd(ok());

  // Only unclustered Incus servers can join.
  expect(
    within(select)
      .getAllByRole("option")
      .map((o) => o.textContent),
  ).toEqual(["s1", "s2"]);

  await user.selectOptions(select, "s2");
  await user.click(
    within(dialog).getByLabelText("Skip the post join operations"),
  );
  await user.click(
    within(dialog).getByLabelText(
      "Copy the services config from an existing cluster member",
    ),
  );
  await submit();

  expect(JSON.parse(api.calls(add)[0].body ?? "")).toEqual({
    skip_post_join_operations: true,
    copy_services_config: false,
    server_names: ["s2"],
  });
  expect(screen.getByText("Server added to cluster")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["clusters"] });
});

test("selects all servers with Ctrl+A", async () => {
  const { api, select, submit } = await openAdd(ok());

  fireEvent.keyDown(select, { key: "a", ctrlKey: true });
  await submit();

  expect(JSON.parse(api.calls(add)[0].body ?? "")).toEqual({
    skip_post_join_operations: false,
    copy_services_config: true,
    server_names: ["s1", "s2"],
  });
});

test.each([
  { handler: apiError(400, "Server is offline"), message: "Server is offline" },
  {
    handler: networkError(),
    message: "Error during server adding: TypeError: Failed to fetch",
  },
])("reports a failure: $message", async ({ handler, message }) => {
  const { invalidate, submit } = await openAdd(handler);

  await submit();

  expect(screen.getByText(message)).toBeInTheDocument();
  expect(invalidate).not.toHaveBeenCalled();
});
