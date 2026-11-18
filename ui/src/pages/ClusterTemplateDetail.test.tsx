import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import ClusterTemplateDetail from "pages/ClusterTemplateDetail";
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

const template = (name: string) => ({
  name,
  description: "Web servers",
  service_config_template: "lvm:\n  enabled: @ENABLED@",
  application_config_template: "incus: {}",
  variables: {
    ENABLED: { description: "Enable LVM", default: "true" },
  },
  last_updated: "2026-11-18T09:05:07",
});

// Answers with the template named in the path, so a renamed template loads as well.
const templateByPath: Handler = (request: RecordedRequest) =>
  ok(template(request.path.split("/").pop() ?? ""))(request);

const renderPage = (route: string, routes: APIRoutes = {}) => {
  const api = mockFetch({
    "GET /1.0/provisioning/cluster-templates/web": templateByPath,
    "GET /1.0/provisioning/cluster-templates/www": templateByPath,
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/cluster-templates/:name"
        element={<ClusterTemplateDetail />}
      />
      <Route
        path="/ui/provisioning/cluster-templates/:name/:activeTab"
        element={<ClusterTemplateDetail />}
      />
      <Route
        path="/ui/provisioning/clusters-view/:activeTab"
        element={<div>Templates page</div>}
      />
    </Routes>,
    { route },
  );

  return { ...view, api };
};

const overviewValue = (header: string) =>
  screen.getByText(header, { selector: ".detail-table-header" })
    .nextElementSibling?.textContent;

test("shows the overview of the template", async () => {
  renderPage("/ui/provisioning/cluster-templates/web");

  await screen.findByText("Variables");

  expect(overviewValue("Name")).toBe("web");
  expect(overviewValue("Description")).toBe("Web servers");
  expect(overviewValue("Last updated")).toBe("2026-11-18 09:05");
  expect(overviewValue("Service configuration template")).toBe(
    "lvm:\n  enabled: @ENABLED@",
  );
  expect(overviewValue("Application configuration template")).toBe("incus: {}");

  const variable = screen.getByText("ENABLED").closest("tr")!;
  expect(
    within(variable)
      .getAllByRole("cell")
      .map((c) => c.textContent),
  ).toEqual(["ENABLED", "Enable LVM", "true"]);
});

test("reports failing to load the template", async () => {
  renderPage("/ui/provisioning/cluster-templates/web", {
    "GET /1.0/provisioning/cluster-templates/web": apiError(404, "Not found"),
  });

  expect(
    await screen.findByText("Error while loading cluster template"),
  ).toBeInTheDocument();
});

test("deletes the template", async () => {
  const route = "DELETE /1.0/provisioning/cluster-templates/web";
  const { user, api, queryClient } = renderPage(
    "/ui/provisioning/cluster-templates/web",
    { [route]: ok() },
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).getByText(
      /Are you sure you want to delete the cluster template "web"\?/,
    ),
  ).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText("Templates page")).toBeInTheDocument();
  expect(screen.getByText("Cluster template web deleted")).toBeInTheDocument();
  expect(api.calls(route)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["cluster-templates"] });
});

test.each([
  { handler: apiError(400, "Template in use"), message: "Template in use" },
  {
    handler: networkError(),
    message:
      "Error during cluster template deletion: TypeError: Failed to fetch",
  },
])("reports a failed deletion: $message", async ({ handler, message }) => {
  const { user } = renderPage("/ui/provisioning/cluster-templates/web", {
    "DELETE /1.0/provisioning/cluster-templates/web": handler,
  });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
  );

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Templates page")).not.toBeInTheDocument();
});

test("updates the template", async () => {
  const route = "PUT /1.0/provisioning/cluster-templates/web";
  const { user, api } = renderPage(
    "/ui/provisioning/cluster-templates/web/configuration",
    { [route]: ok() },
  );

  const description = await screen.findByLabelText("Description");
  expect(description).toHaveValue("Web servers");

  await user.clear(description);
  await user.type(description, "Frontend servers");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Cluster template web updated"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({
    ...template("web"),
    description: "Frontend servers",
    last_updated: undefined,
  });
});

test.each([
  { handler: apiError(400, "Invalid template"), message: "Invalid template" },
  {
    handler: networkError(),
    message: "Error during cluster template update: TypeError: Failed to fetch",
  },
])("reports a failed update: $message", async ({ handler, message }) => {
  const { user } = renderPage(
    "/ui/provisioning/cluster-templates/web/configuration",
    { "PUT /1.0/provisioning/cluster-templates/web": handler },
  );

  await screen.findByLabelText("Description");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
});

test("renames the template", async () => {
  const route = "POST /1.0/provisioning/cluster-templates/web";
  const { user, api } = renderPage(
    "/ui/provisioning/cluster-templates/web/configuration",
    { [route]: ok() },
  );

  // Renaming to the current name does nothing.
  await user.click(await screen.findByRole("button", { name: "Rename" }));
  expect(api.calls(route)).toHaveLength(0);

  const name = screen.getByLabelText("Name");
  await user.clear(name);
  await user.type(name, "www");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(
    await screen.findByText("Cluster template www renamed"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({ name: "www" });
  await waitFor(() => {
    expect(
      api.calls("GET /1.0/provisioning/cluster-templates/www").length,
    ).toBeGreaterThan(0);
  });
});

test("reports a failed rename", async () => {
  const { user } = renderPage(
    "/ui/provisioning/cluster-templates/web/configuration",
    {
      "POST /1.0/provisioning/cluster-templates/web": networkError(),
    },
  );

  const name = await screen.findByLabelText("Name");
  await user.clear(name);
  await user.type(name, "www");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(
    await screen.findByText(
      "Error during cluster template rename: TypeError: Failed to fetch",
    ),
  ).toBeInTheDocument();
});
