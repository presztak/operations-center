import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import Update from "pages/Update";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const update = {
  uuid: "6e0e6d4b-30a1-4c4c-b0d6-3d5ba6d6bdd4",
  version: "202611100000",
  published_at: "2026-11-10T12:00:00",
  severity: "low",
  origin: "images.linuxcontainers.org",
  channels: ["testing"],
  upstream_channels: ["stable", "testing"],
  changelog: "",
  update_status: "ready",
};

const updatePath = `/1.0/provisioning/updates/${update.uuid}`;

const renderUpdates = (routes: Record<string, Handler> = {}, tab = "") => {
  const api = mockFetch({
    "GET /1.0/provisioning/updates": ok([update]),
    "GET /1.0/provisioning/channels": ok([
      { name: "stable", description: "", last_updated: "" },
      { name: "testing", description: "", last_updated: "" },
    ]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/updates-view" element={<Update />} />
      <Route
        path="/ui/provisioning/updates-view/:activeTab"
        element={<Update />}
      />
    </Routes>,
    { route: `/ui/provisioning/updates-view${tab}` },
  );

  return { ...view, api };
};

test("lists the updates", async () => {
  renderUpdates();

  const link = await screen.findByText("202611100000");
  const row = link.closest("tr")!;
  expect(link).toHaveAttribute(
    "href",
    `/ui/provisioning/updates/${update.uuid}`,
  );
  expect(within(row).getByText("2026-11-10 12:00")).toBeInTheDocument();
  expect(within(row).getByText("low")).toBeInTheDocument();
  expect(within(row).getByText("stable, testing")).toBeInTheDocument();
  expect(within(row).getByText("testing")).toBeInTheDocument();
  expect(within(row).getByText("ready")).toBeInTheDocument();
});

test("reports a failure to load the updates", async () => {
  renderUpdates({
    "GET /1.0/provisioning/updates": apiError(500, "Database down"),
  });

  expect(
    await screen.findByText("Error while loading updates: Database down"),
  ).toBeInTheDocument();
});

test("switches to the channels", async () => {
  // Every channel row loads its changelog.
  const { user } = renderUpdates({
    "GET /1.0/provisioning/channels/stable/changelog": ok([]),
    "GET /1.0/provisioning/channels/testing/changelog": ok([]),
  });

  await user.click(await screen.findByRole("tab", { name: "Channels" }));

  expect(
    await screen.findByRole("button", { name: "Create channel" }),
  ).toBeInTheDocument();
});

test.each([
  {
    name: "success",
    handler: ok(),
    want: "Updates refresh triggered successfully",
  },
  {
    name: "API error",
    handler: apiError(503, "Upstream unreachable"),
    want: "Upstream unreachable",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during refreshing updates: TypeError: Failed to fetch",
  },
])("refreshes the updates ($name)", async ({ handler, want }) => {
  const { user, api } = renderUpdates({
    "POST /1.0/provisioning/updates/:refresh": handler,
  });

  await user.click(await screen.findByRole("button", { name: "Refresh" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
  expect(api.calls("POST /1.0/provisioning/updates/:refresh")).toHaveLength(1);
});

test.each([
  {
    name: "success",
    handler: ok(),
    want: "Updates cleanup performed successfully",
  },
  {
    name: "API error",
    handler: apiError(500, "Cleanup failed"),
    want: "Cleanup failed",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during updates cleanup: TypeError: Failed to fetch",
  },
])(
  "cleans up the updates after confirmation ($name)",
  async ({ handler, want }) => {
    const { user, api } = renderUpdates({
      "DELETE /1.0/provisioning/updates": handler,
    });

    await user.click(await screen.findByRole("button", { name: "Cleanup" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Are you sure you want to cleanup updates/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cleanup" }));

    expect(await screen.findByText(want)).toBeInTheDocument();
    expect(api.calls("DELETE /1.0/provisioning/updates")).toHaveLength(1);
  },
);

test("imports updates from a file", async () => {
  const { user, api, queryClient } = renderUpdates({
    "POST /1.0/provisioning/updates": ok(),
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await user.click(await screen.findByRole("button", { name: "Import" }));
  const dialog = await screen.findByRole("dialog");
  const upload = within(dialog).getByRole("button", { name: "Upload" });
  expect(upload).toBeDisabled();

  const file = new File(["data"], "updates.tar.gz");
  await user.upload(dialog.querySelector('input[type="file"]')!, file);
  await user.click(upload);

  expect(await screen.findByText("Updates imported")).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["updates"] });
  expect(api.calls("POST /1.0/provisioning/updates")).toHaveLength(1);
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Invalid archive"),
    want: "Invalid archive",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during importing updates: TypeError: Failed to fetch",
  },
])("keeps the import open, if it fails ($name)", async ({ handler, want }) => {
  const { user } = renderUpdates({ "POST /1.0/provisioning/updates": handler });

  await user.click(await screen.findByRole("button", { name: "Import" }));
  const dialog = await screen.findByRole("dialog");
  const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
  await user.upload(input, new File(["data"], "updates.tar.gz"));
  await user.click(within(dialog).getByRole("button", { name: "Upload" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
  // The file stays selected for another attempt.
  expect(input.files?.[0]?.name).toBe("updates.tar.gz");
  expect(within(dialog).getByRole("button", { name: "Upload" })).toBeEnabled();
});

test("assigns an update to channels", async () => {
  const { user, api } = renderUpdates({ [`PUT ${updatePath}`]: ok() });

  await user.click(await screen.findByTitle("Channels update"));
  const dialog = await screen.findByRole("dialog");
  const select = within(dialog).getByRole("listbox");
  expect(
    within(select).getByRole<HTMLOptionElement>("option", { name: "testing" })
      .selected,
  ).toBe(true);

  await user.selectOptions(select, "stable");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(`Update ${update.uuid} updated`),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(`PUT ${updatePath}`)[0].body!)).toEqual({
    channels: ["stable", "testing"],
  });
});

test("selects all channels with Ctrl+A", async () => {
  const { user, api } = renderUpdates({ [`PUT ${updatePath}`]: ok() });

  await user.click(await screen.findByTitle("Channels update"));
  const dialog = await screen.findByRole("dialog");
  await user.deselectOptions(within(dialog).getByRole("listbox"), "testing");
  await user.click(within(dialog).getByRole("listbox"));
  await user.keyboard("{Control>}a{/Control}");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));

  await screen.findByText(`Update ${update.uuid} updated`);
  expect(JSON.parse(api.calls(`PUT ${updatePath}`)[0].body!)).toEqual({
    channels: ["stable", "testing"],
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Unknown channel"),
    want: "Unknown channel",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during Update update: TypeError: Failed to fetch",
  },
])("reports a failed channel assignment ($name)", async ({ handler, want }) => {
  const { user } = renderUpdates({ [`PUT ${updatePath}`]: handler });

  await user.click(await screen.findByTitle("Channels update"));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Save",
    }),
  );

  expect(await screen.findByText(want)).toBeInTheDocument();
});
