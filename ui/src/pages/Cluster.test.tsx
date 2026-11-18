import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import Cluster from "pages/Cluster";
import { apiError, mockFetch, ok, Routes as APIRoutes } from "test/fetch";
import { renderWithProviders } from "test/render";

const cluster = (name: string, properties = {}) => ({
  name,
  connection_url: `https://${name}:8443`,
  description: `Cluster ${name}`,
  properties,
  status: "ready",
  update_status: {
    needs_reboot: [],
    needs_update: [],
    in_maintenance: [],
    in_progress_status: { in_progress: "", error: "", last_updated: "" },
  },
});

const renderPage = (route: string, routes: APIRoutes) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": ok([]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/clusters-view" element={<Cluster />} />
      <Route
        path="/ui/provisioning/clusters-view/:activeTab"
        element={<Cluster />}
      />
      <Route
        path="/ui/provisioning/clusters/create"
        element={<div>Create cluster page</div>}
      />
      <Route
        path="/ui/provisioning/cluster-templates/create"
        element={<div>Create template page</div>}
      />
    </Routes>,
    { route },
  );

  return { ...view, api };
};

// Names in the first column of the table, in the order shown.
const shownNames = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((r) => within(r).getAllByRole("cell")[0].textContent);

test("lists the clusters sorted by name", async () => {
  renderPage("/ui/provisioning/clusters-view", {
    "GET /1.0/provisioning/clusters": ok([
      cluster("zeta"),
      cluster("alpha", { env: "prod" }),
    ]),
  });

  await screen.findByText("alpha");

  expect(shownNames()).toEqual(["alpha", "zeta"]);
  expect(screen.getByText("Cluster alpha")).toBeInTheDocument();
  expect(screen.getByText("env:prod")).toBeInTheDocument();
  expect(screen.getByText("alpha").closest("a")).toHaveAttribute(
    "href",
    "/ui/provisioning/clusters/alpha",
  );
  expect(screen.getAllByTitle("Run a bulk action")).toHaveLength(2);
});

test("filters the clusters", async () => {
  const { user, api } = renderPage(
    "/ui/provisioning/clusters-view?filter=name=='alpha'",
    { "GET /1.0/provisioning/clusters": ok([cluster("alpha")]) },
  );

  await screen.findByText("alpha");

  const search = screen.getByPlaceholderText("Search");
  expect(search).toHaveValue("name=='alpha'");

  await user.clear(search);
  await user.type(search, " status=='ready' {Enter}");
  await screen.findByText("alpha");

  expect(
    api
      .calls("GET /1.0/provisioning/clusters")
      .map((c) => decodeURIComponent(c.url)),
  ).toEqual([
    "/1.0/provisioning/clusters?recursion=1&filter=name=='alpha'",
    "/1.0/provisioning/clusters?recursion=1&filter=status=='ready'",
  ]);
});

test("reports failing to load the clusters", async () => {
  renderPage("/ui/provisioning/clusters-view", {
    "GET /1.0/provisioning/clusters": apiError(500, "Database unavailable"),
  });

  expect(await screen.findByText("Database unavailable")).toBeInTheDocument();
  expect(screen.getByText(/Error while loading data/)).toBeInTheDocument();
});

test("navigates to the creation of a cluster", async () => {
  const { user } = renderPage("/ui/provisioning/clusters-view", {
    "GET /1.0/provisioning/clusters": ok([]),
  });

  await user.click(screen.getByRole("button", { name: "Create cluster" }));

  expect(screen.getByText("Create cluster page")).toBeInTheDocument();
});

test("lists the cluster templates", async () => {
  const { user } = renderPage("/ui/provisioning/clusters-view", {
    "GET /1.0/provisioning/clusters": ok([]),
    "GET /1.0/provisioning/cluster-templates": ok([
      {
        name: "web",
        description: "Web servers",
        last_updated: "2026-11-18T09:05:07",
      },
      { name: "db", description: "Databases", last_updated: "" },
    ]),
  });

  await user.click(screen.getByRole("tab", { name: "Templates" }));
  await screen.findByText("db");

  expect(shownNames()).toEqual(["db", "web"]);
  expect(screen.getByText("2026-11-18 09:05")).toBeInTheDocument();
  expect(screen.getByText("web").closest("a")).toHaveAttribute(
    "href",
    "/ui/provisioning/cluster-templates/web",
  );

  await user.click(screen.getByRole("button", { name: "Create template" }));

  expect(screen.getByText("Create template page")).toBeInTheDocument();
});

test("reports failing to load the cluster templates", async () => {
  renderPage("/ui/provisioning/clusters-view/templates", {
    "GET /1.0/provisioning/cluster-templates": apiError(
      500,
      "Database unavailable",
    ),
  });

  expect(
    await screen.findByText(
      "Error while loading cluster templates: Database unavailable",
    ),
  ).toBeInTheDocument();
});
