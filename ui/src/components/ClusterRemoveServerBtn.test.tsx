import { screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ClusterRemoveServerBtn from "components/ClusterRemoveServerBtn";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Cluster } from "types/cluster";

const remove = "POST /1.0/provisioning/clusters/c1/:remove-servers";

const openRemove = async (handler: Handler) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": ok([{ name: "s1" }, { name: "s2" }]),
    [remove]: handler,
  });
  const view = renderWithProviders(
    <ClusterRemoveServerBtn cluster={{ name: "c1" } as Cluster} />,
  );
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  await view.user.click(screen.getByTitle("Remove server"));
  const dialog = screen.getByRole("dialog");
  const select = within(dialog).getByLabelText("Servers");
  await within(select).findByRole("option", { name: "s2" });

  const submit = async () => {
    await view.user.click(
      within(dialog).getByRole("button", { name: "Remove" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  };

  return { ...view, api, dialog, select, invalidate, submit };
};

test("removes the selected servers", async () => {
  const { user, api, dialog, select, invalidate, submit } =
    await openRemove(ok());

  // Only the servers of the cluster are offered.
  expect(
    decodeURIComponent(api.calls("GET /1.0/provisioning/servers")[0].url),
  ).toBe("/1.0/provisioning/servers?recursion=1&filter=cluster=='c1'");

  await user.selectOptions(select, "s2");
  await user.click(
    within(dialog).getByLabelText(
      "Remove the servers even if they are unreachable or not evacuated",
    ),
  );
  await submit();

  expect(JSON.parse(api.calls(remove)[0].body ?? "")).toEqual({
    server_names: ["s2"],
    force: true,
  });
  expect(screen.getByText("Server removed from cluster")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
});

test.each([
  {
    handler: apiError(400, "Server is the leader"),
    message: "Server is the leader",
  },
  {
    handler: networkError(),
    message: "Error during server removal: TypeError: Failed to fetch",
  },
])("reports a failure: $message", async ({ handler, message }) => {
  const { invalidate, submit } = await openRemove(handler);

  await submit();

  expect(screen.getByText(message)).toBeInTheDocument();
  expect(invalidate).not.toHaveBeenCalled();
});
