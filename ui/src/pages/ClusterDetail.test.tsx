import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import ClusterDetail from "pages/ClusterDetail";
import {
  apiError,
  Handler,
  mockFetch,
  networkError,
  ok,
  RecordedRequest,
  Routes as APIRoutes,
} from "test/fetch";
import { renderWithProviders } from "test/render";

const cluster = (name: string) => ({
  name,
  connection_url: `https://${name}:8443`,
  channel: "stable",
  description: "Main cluster",
  properties: { env: "prod" },
  config: {
    rolling_restart: { post_restore_delay: "5m", restore_mode: "skip" },
  },
  certificate: "-----BEGIN CERTIFICATE-----",
  fingerprint: "abcdef123456",
  status: "ready",
  last_updated: "2026-11-18T09:05:07",
  update_status: {
    needs_reboot: [],
    needs_update: [],
    in_maintenance: [],
    in_progress_status: { in_progress: "", error: "", last_updated: "" },
  },
});

// Answers with the cluster named in the path, so a renamed cluster loads as well.
const clusterByPath: Handler = (request: RecordedRequest) =>
  ok(cluster(request.path.split("/").pop() ?? ""))(request);

const renderPage = (route: string, routes: APIRoutes = {}) => {
  const api = mockFetch({
    "GET /1.0/provisioning/clusters/c1": clusterByPath,
    "GET /1.0/provisioning/clusters/c2": clusterByPath,
    "GET /1.0/provisioning/channels": ok([
      { name: "stable" },
      { name: "testing" },
    ]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/clusters/:name"
        element={<ClusterDetail />}
      />
      <Route
        path="/ui/provisioning/clusters/:name/:activeTab"
        element={<ClusterDetail />}
      />
      <Route
        path="/ui/provisioning/clusters-view/:activeTab"
        element={<div>Clusters page</div>}
      />
    </Routes>,
    { route },
  );

  return { ...view, api };
};

// Value shown next to a header of the overview.
const overviewValue = (header: string) =>
  screen.getByText(header, { selector: ".detail-table-header" })
    .nextElementSibling?.textContent;

test("shows the overview of the cluster", async () => {
  renderPage("/ui/provisioning/clusters/c1");

  await screen.findByText("Fingerprint");

  expect(overviewValue("Name")).toBe("c1");
  expect(overviewValue("Description")).toBe("Main cluster");
  expect(overviewValue("Properties")).toBe("env:prod ");
  expect(overviewValue("Connection URL")).toBe("https://c1:8443");
  expect(overviewValue("Channel")).toBe("stable");
  expect(overviewValue("Restore mode")).toBe("Only bring back the server");
  expect(overviewValue("Post restore delay")).toBe("5m");
  expect(overviewValue("Fingerprint")).toBe("abcdef123456");
  expect(overviewValue("Last updated")).toBe("2026-11-18 09:05");
});

test("reports failing to load the cluster", async () => {
  renderPage("/ui/provisioning/clusters/c1", {
    "GET /1.0/provisioning/clusters/c1": apiError(404, "Cluster not found"),
  });

  expect(
    await screen.findByText("Error while loading cluster"),
  ).toBeInTheDocument();
});

test.each([
  { label: "Normal", mode: "normal" },
  { label: "Force", mode: "force" },
  { label: "Factory reset", mode: "factory-reset" },
])("deletes the cluster in $mode mode", async ({ label, mode }) => {
  const route = "DELETE /1.0/provisioning/clusters/c1";
  const { user, api, queryClient } = renderPage(
    "/ui/provisioning/clusters/c1",
    {
      [route]: ok(),
    },
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByLabelText(label));
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("Clusters page")).toBeInTheDocument();
  expect(screen.getByText("Cluster c1 deleted")).toBeInTheDocument();
  expect(api.calls(route)[0].url).toBe(
    `/1.0/provisioning/clusters/c1?mode=${mode}`,
  );
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["clusters"] });
});

test.each([
  {
    handler: apiError(400, "Cluster has servers"),
    message: "Cluster has servers",
  },
  {
    handler: networkError(),
    message: "Error during cluster deletion: TypeError: Failed to fetch",
  },
])("reports a failed deletion: $message", async ({ handler, message }) => {
  const { user } = renderPage("/ui/provisioning/clusters/c1", {
    "DELETE /1.0/provisioning/clusters/c1": handler,
  });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
  );

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Clusters page")).not.toBeInTheDocument();
});

test("updates the configuration", async () => {
  const route = "PUT /1.0/provisioning/clusters/c1";
  const { user, api } = renderPage(
    "/ui/provisioning/clusters/c1/configuration",
    {
      [route]: ok(),
    },
  );

  const description = await screen.findByLabelText("Description");
  expect(description).toHaveValue("Main cluster");
  // Only the overview offers to delete the cluster.
  expect(
    screen.queryByText("Delete", { selector: "button" }),
  ).not.toBeInTheDocument();

  await user.clear(description);
  await user.type(description, "Edge cluster");
  await user.clear(screen.getByLabelText("Post restore delay"));
  await user.type(screen.getByLabelText("Post restore delay"), "1m");
  // The label of the channel select is not associated with it.
  const testing = await screen.findByRole("option", { name: "testing" });
  await user.selectOptions(testing.closest("select")!, "testing");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Cluster c1 updated")).toBeInTheDocument();
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({
    description: "Edge cluster",
    properties: { env: "prod" },
    connection_url: "https://c1:8443",
    channel: "testing",
    config: {
      rolling_restart: { post_restore_delay: "1m", restore_mode: "skip" },
    },
  });
});

test("requires a connection URL", async () => {
  const { user, api } = renderPage(
    "/ui/provisioning/clusters/c1/configuration",
  );

  await user.clear(await screen.findByLabelText("Connection URL"));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Connection URL is required"),
  ).toBeInTheDocument();
  expect(api.calls("PUT /1.0/provisioning/clusters/c1")).toHaveLength(0);
});

test.each([
  {
    handler: apiError(400, "Invalid channel"),
    message: "Error during cluster update: Invalid channel",
  },
  {
    handler: networkError(),
    message: "Error during cluster update: TypeError: Failed to fetch",
  },
])("reports a failed update: $message", async ({ handler, message }) => {
  const { user } = renderPage("/ui/provisioning/clusters/c1/configuration", {
    "PUT /1.0/provisioning/clusters/c1": handler,
  });

  await screen.findByLabelText("Description");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
});

test("renames the cluster", async () => {
  const route = "POST /1.0/provisioning/clusters/c1";
  const { user, api } = renderPage(
    "/ui/provisioning/clusters/c1/configuration",
    {
      [route]: ok(),
    },
  );

  // Renaming to the current name does nothing.
  await user.click(await screen.findByRole("button", { name: "Rename" }));
  expect(api.calls(route)).toHaveLength(0);

  const name = screen.getByLabelText("Name");
  await user.clear(name);
  await user.type(name, "c2");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(await screen.findByText("Cluster c2 renamed")).toBeInTheDocument();
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({ name: "c2" });
  // The configuration of the renamed cluster is shown.
  await waitFor(() => {
    expect(api.calls("GET /1.0/provisioning/clusters/c2")).toHaveLength(1);
  });
});

test("reports a failed rename", async () => {
  const { user } = renderPage("/ui/provisioning/clusters/c1/configuration", {
    "POST /1.0/provisioning/clusters/c1": apiError(409, "Name already in use"),
  });

  const name = await screen.findByLabelText("Name");
  await user.clear(name);
  await user.type(name, "c2");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(await screen.findByText("Name already in use")).toBeInTheDocument();
});

test("lists and downloads the artifacts", async () => {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: () => "blob:download",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: () => {},
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });

  const { user } = renderPage("/ui/provisioning/clusters/c1/artifacts", {
    "GET /1.0/provisioning/clusters/c1/artifacts": ok([
      { name: "terraform", description: "Terraform", last_updated: "" },
      { name: "broken", description: "Broken", last_updated: "" },
    ]),
    "GET /1.0/provisioning/clusters/c1/artifacts/terraform": ok(),
    "GET /1.0/provisioning/clusters/c1/artifacts/broken": apiError(
      500,
      "Archive failed",
    ),
  });

  const link = await screen.findByText("terraform");
  expect(link.closest("a")).toHaveAttribute(
    "href",
    "/ui/provisioning/clusters/c1/artifacts/terraform/files",
  );

  const [terraform, broken] = screen.getAllByTitle("Download artifact");
  await user.click(terraform);
  await waitFor(() => {
    expect(downloads).toEqual(["terraform.zip"]);
  });

  await user.click(broken);
  expect(
    await screen.findByText(
      "Error during artifact downloading: Error: Archive failed",
    ),
  ).toBeInTheDocument();
});

test("reports failing to load the artifacts", async () => {
  renderPage("/ui/provisioning/clusters/c1/artifacts", {
    "GET /1.0/provisioning/clusters/c1/artifacts": apiError(
      500,
      "Database unavailable",
    ),
  });

  expect(
    await screen.findByText(
      "Error while loading artifacts: Database unavailable",
    ),
  ).toBeInTheDocument();
});
