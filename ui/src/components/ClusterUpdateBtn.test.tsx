import { screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ClusterUpdateBtn from "components/ClusterUpdateBtn";
import { apiError, Handler, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Cluster } from "types/cluster";

const cluster = { name: "c1" } as Cluster;
const update = "POST /1.0/provisioning/clusters/c1/:update";

const servers = [
  {
    name: "s1",
    cluster: "c1",
    version_data: {
      applications: [
        { name: "incus", needs_update: true },
        { name: "incus-ceph", needs_update: true },
      ],
    },
  },
  {
    name: "s2",
    cluster: "c1",
    version_data: {
      applications: [
        { name: "incus", needs_update: true },
        { name: "incus-linstor", needs_update: false },
      ],
    },
  },
  {
    name: "s3",
    cluster: "other",
    version_data: {
      applications: [{ name: "migration-manager", needs_update: true }],
    },
  },
];

const openUpdate = async (
  updateHandler: Handler = ok(),
  serversHandler: Handler = ok(servers),
) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": serversHandler,
    [update]: updateHandler,
  });
  const view = renderWithProviders(<ClusterUpdateBtn cluster={cluster} />);
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  await view.user.click(screen.getByTitle("Update cluster"));
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).getByText(
      'Are you sure you want to update the cluster "c1"?',
    ),
  ).toBeInTheDocument();

  const submit = async () => {
    await view.user.click(
      within(dialog).getByRole("button", { name: "Update" }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    return JSON.parse(api.calls(update)[0].body ?? "");
  };

  return { ...view, api, dialog, invalidate, submit };
};

test("updates the OS and applications with a reboot by default", async () => {
  const { submit, invalidate } = await openUpdate();

  expect(await submit()).toEqual({
    reboot: true,
    applications: [],
    os_only: false,
  });
  expect(screen.getByText("Cluster update triggered")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["clusters"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
});

test("updates only the OS without a reboot", async () => {
  const { user, dialog, submit } = await openUpdate();

  await user.click(
    within(dialog).getByLabelText(
      "Leave the installed applications on their current version",
    ),
  );
  await user.click(
    within(dialog).getByLabelText(
      "Perform a rolling reboot following the installation of the update",
    ),
  );

  expect(await submit()).toEqual({
    reboot: false,
    applications: [],
    os_only: true,
  });
});

test("updates the selected applications of the cluster", async () => {
  const { user, dialog, submit } = await openUpdate();

  const applications = within(dialog).getByLabelText("Individual applications");
  await waitFor(() => {
    expect(applications).toBeEnabled();
  });
  await user.click(applications);

  // Only the applications of the cluster, which need an update, are offered and preselected.
  expect(within(dialog).getByLabelText("incus")).toBeChecked();
  expect(within(dialog).getByLabelText("incus-ceph")).toBeChecked();
  expect(
    within(dialog).queryByLabelText("incus-linstor"),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).queryByLabelText("migration-manager"),
  ).not.toBeInTheDocument();

  // Without any application, there is nothing to update.
  await user.click(within(dialog).getByLabelText("incus"));
  await user.click(within(dialog).getByLabelText("incus-ceph"));
  expect(within(dialog).getByRole("button", { name: "Update" })).toBeDisabled();

  await user.click(within(dialog).getByLabelText("incus-ceph"));

  expect(await submit()).toEqual({
    reboot: false,
    applications: ["incus-ceph"],
    os_only: false,
  });
});

test("offers no application update, if none is needed", async () => {
  const { dialog } = await openUpdate(ok(), ok([]));

  await waitFor(() => {
    expect(
      within(dialog).queryByText("Loading the applications ..."),
    ).not.toBeInTheDocument();
  });
  expect(
    within(dialog).getByLabelText("Individual applications"),
  ).toBeDisabled();
});

test("reports failing to load the applications", async () => {
  const { dialog } = await openUpdate(
    ok(),
    apiError(500, "Database unavailable"),
  );

  expect(
    await within(dialog).findByText(
      "Failed to load the applications: Database unavailable",
    ),
  ).toBeInTheDocument();
});

test("reports a failed update", async () => {
  const { submit, invalidate } = await openUpdate(
    apiError(400, "Cluster is busy"),
  );

  await submit();

  expect(screen.getByText("Cluster is busy")).toBeInTheDocument();
  expect(invalidate).not.toHaveBeenCalled();
});
