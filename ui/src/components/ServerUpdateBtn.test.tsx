import { screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ServerUpdateBtn from "components/ServerUpdateBtn";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { expectToast, renderWithProviders } from "test/render";
import { ApplicationVersionData, Server } from "types/server";

const changelogRoute = "GET /1.0/provisioning/servers/server01/changelog";
const update = "POST /1.0/provisioning/servers/server01/system/:update";

const changelog = {
  current_version: "202611180000",
  prior_version: "202611010000",
  channel: "stable",
  components: {},
};

const server = (
  osNeedsUpdate: boolean,
  applications: ApplicationVersionData[],
): Server =>
  ({
    name: "server01",
    version_data: {
      os: {
        name: "incusos",
        version: "1",
        version_next: "",
        needs_update: osNeedsUpdate,
      },
      applications,
      needs_update: true,
      needs_reboot: false,
      in_maintenance: 0,
    },
  }) as Server;

const apps = [
  { name: "incus", version: "1", needs_update: true },
  { name: "incus-ceph", version: "1", needs_update: true },
  { name: "migration-manager", version: "1", needs_update: false },
];

const openModal = async (s: Server, updateHandler: Handler = ok()) => {
  const api = mockFetch({
    [changelogRoute]: ok(changelog),
    [update]: updateHandler,
  });
  const view = renderWithProviders(<ServerUpdateBtn server={s} recommended />);

  await view.user.click(await screen.findByTitle("Update server"));
  const dialog = await screen.findByRole("dialog");

  return { ...view, api, dialog };
};

const body = (api: Awaited<ReturnType<typeof openModal>>["api"]) =>
  JSON.parse(api.calls(update)[0].body ?? "");

test("reports a failing changelog", async () => {
  mockFetch({ [changelogRoute]: apiError(500, "No changelog") });
  renderWithProviders(<ServerUpdateBtn server={server(true, [])} />);

  expect(
    await screen.findByText("Error while loading changelog"),
  ).toBeInTheDocument();
});

test("updates the operating system by default", async () => {
  const { user, dialog, api, queryClient } = await openModal(
    server(true, apps),
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  expect(
    within(dialog).getByText(/202611010000 -> 202611180000/),
  ).toBeInTheDocument();
  expect(
    within(dialog).getByLabelText("Operating system (incusos)"),
  ).toBeChecked();

  await user.click(within(dialog).getByRole("button", { name: "Update" }));

  await expectToast("Server update triggered", "success");
  expect(body(api)).toEqual({
    os: { name: "os", trigger_update: true },
    os_only: false,
    applications: [],
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
});

test("restricts the update to the operating system", async () => {
  const { user, dialog, api } = await openModal(server(true, apps));

  await user.click(
    within(dialog).getByLabelText(
      "Leave the installed applications on their current version",
    ),
  );
  await user.click(within(dialog).getByRole("button", { name: "Update" }));

  await waitFor(() => {
    expect(api.calls(update)).toHaveLength(1);
  });
  expect(body(api).os_only).toBe(true);
});

test("updates the selected applications", async () => {
  const { user, dialog, api } = await openModal(server(false, apps));

  expect(
    within(dialog).getByLabelText("Operating system (incusos)"),
  ).toBeDisabled();
  expect(
    within(dialog).getByLabelText("Individual applications"),
  ).toBeChecked();
  // Only the applications needing an update are offered, all preselected.
  expect(within(dialog).getByLabelText("incus")).toBeChecked();
  expect(within(dialog).getByLabelText("incus-ceph")).toBeChecked();
  expect(
    within(dialog).queryByLabelText("migration-manager"),
  ).not.toBeInTheDocument();

  await user.click(within(dialog).getByLabelText("incus-ceph"));
  await user.click(within(dialog).getByRole("button", { name: "Update" }));

  await waitFor(() => {
    expect(api.calls(update)).toHaveLength(1);
  });
  expect(body(api)).toEqual({
    os: { name: "os", trigger_update: false },
    os_only: false,
    applications: [{ name: "incus", trigger_update: true }],
  });
});

test("requires a selected application", async () => {
  const { user, dialog } = await openModal(server(false, apps));
  const button = within(dialog).getByRole("button", { name: "Update" });

  await user.click(within(dialog).getByLabelText("incus"));
  await user.click(within(dialog).getByLabelText("incus-ceph"));

  expect(button).toBeDisabled();
});

test("tells when nothing needs an update", async () => {
  const { dialog } = await openModal(server(false, []));

  expect(
    within(dialog).getByText("No component of this server needs an update."),
  ).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Update" })).toBeDisabled();
});

test.each([
  { handler: apiError(400, "Update in progress"), want: "Update in progress" },
  { handler: networkError(), want: /Error during server update: TypeError/ },
])("reports a failed update: $want", async ({ handler, want }) => {
  const { user, dialog } = await openModal(server(true, []), handler);

  await user.click(within(dialog).getByRole("button", { name: "Update" }));

  await expectToast(want, "error");
});
