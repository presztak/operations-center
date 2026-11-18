import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import ClusterTemplateCreate from "pages/ClusterTemplateCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const create = "POST /1.0/provisioning/cluster-templates";

const renderPage = (handler: Handler) => {
  const api = mockFetch({ [create]: handler });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/cluster-templates/create"
        element={<ClusterTemplateCreate />}
      />
      <Route
        path="/ui/provisioning/clusters-view/:activeTab"
        element={<div>Templates page</div>}
      />
    </Routes>,
    { route: "/ui/provisioning/cluster-templates/create" },
  );

  return { ...view, api };
};

test("creates a template", async () => {
  const { user, api } = renderPage(ok());

  // A new template has nothing to rename.
  expect(
    screen.queryByRole("button", { name: "Rename" }),
  ).not.toBeInTheDocument();

  await user.type(screen.getByLabelText("Name"), "web");
  await user.type(screen.getByLabelText("Description"), "Web servers");
  await user.click(screen.getByLabelText("Service configuration template"));
  await user.paste("lvm:\n  enabled: @ENABLED@");
  await user.click(screen.getByLabelText("Application configuration template"));
  await user.paste("incus: {}");
  await user.type(screen.getByPlaceholderText("New variable"), "ENABLED");
  await user.type(screen.getByPlaceholderText("Description"), "Enable LVM");
  await user.type(screen.getByPlaceholderText("Default value"), "true");
  await user.click(screen.getByTitle("Add"));
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Templates page")).toBeInTheDocument();
  expect(screen.getByText("Cluster template web created")).toBeInTheDocument();
  expect(JSON.parse(api.calls(create)[0].body ?? "")).toEqual({
    name: "web",
    description: "Web servers",
    service_config_template: "lvm:\n  enabled: @ENABLED@",
    application_config_template: "incus: {}",
    variables: { ENABLED: { description: "Enable LVM", default: "true" } },
  });
});

test.each([
  {
    handler: apiError(409, "Template already exists"),
    message: "Template already exists",
  },
  {
    handler: networkError(),
    message:
      "Error during cluster template creation: TypeError: Failed to fetch",
  },
])("reports a failed creation: $message", async ({ handler, message }) => {
  const { user } = renderPage(handler);

  await user.type(screen.getByLabelText("Name"), "web");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Templates page")).not.toBeInTheDocument();
});
