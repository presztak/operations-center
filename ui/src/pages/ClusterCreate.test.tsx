import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import ClusterCreate from "pages/ClusterCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const create = "POST /1.0/provisioning/clusters";

const renderPage = (route: string, handler: Handler = ok()) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": ok([
      { name: "s1", server_type: "incus" },
      { name: "s2", server_type: "incus" },
      { name: "lts1", server_type: "incus-lts-7.0" },
    ]),
    "GET /1.0/provisioning/channels": ok([{ name: "stable" }]),
    "GET /1.0/provisioning/cluster-templates": ok([
      { name: "web" },
      { name: "db" },
    ]),
    [create]: handler,
  });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/clusters/create"
        element={<ClusterCreate />}
      />
      <Route
        path="/ui/provisioning/clusters/create/:activeTab"
        element={<ClusterCreate />}
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

const serverOptions = () =>
  within(screen.getByLabelText("Servers"))
    .getAllByRole("option")
    .map((o) => o.textContent);

const fillRequired = async (user: ReturnType<typeof renderPage>["user"]) => {
  await user.type(screen.getByLabelText("Name"), "c1");
  await user.type(screen.getByLabelText("Connection URL"), "https://c1:8443");
  await within(screen.getByLabelText("Servers")).findByRole("option", {
    name: "s1",
  });
  await user.selectOptions(screen.getByLabelText("Servers"), ["s1", "s2"]);
};

const body = (api: ReturnType<typeof renderPage>["api"]) =>
  JSON.parse(api.calls(create)[0].body ?? "");

test("validates the required fields", async () => {
  const { user, api } = renderPage("/ui/provisioning/clusters/create");

  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText("Name is required")).toBeInTheDocument();
  expect(screen.getByText("Connection URL is required")).toBeInTheDocument();
  expect(
    screen.getByText("List of server names can not be empty"),
  ).toBeInTheDocument();
  expect(api.calls(create)).toHaveLength(0);
});

test("offers the servers of the selected type", async () => {
  const { user } = renderPage("/ui/provisioning/clusters/create");

  await within(screen.getByLabelText("Servers")).findByRole("option", {
    name: "s1",
  });
  expect(serverOptions()).toEqual(["s1", "s2"]);

  await user.selectOptions(
    screen.getByLabelText("Server type"),
    "Incus (7.0 LTS)",
  );

  expect(serverOptions()).toEqual(["lts1"]);
});

test("creates a cluster manually", async () => {
  const { user, api } = renderPage("/ui/provisioning/clusters/create");

  await fillRequired(user);
  await user.click(screen.getByLabelText("Services config"));
  await user.paste("lvm:\n  enabled: true");
  await user.click(screen.getByLabelText("Application seed config"));
  await user.paste("preseed: {}");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText("Clusters page")).toBeInTheDocument();
  expect(screen.getByText("Cluster c1 created")).toBeInTheDocument();
  expect(body(api)).toEqual({
    name: "c1",
    connection_url: "https://c1:8443",
    channel: "",
    description: "",
    properties: {},
    server_names: ["s1", "s2"],
    server_type: "incus",
    services_config: { lvm: { enabled: true } },
    application_seed_config: { preseed: {} },
    cluster_template: "",
    cluster_template_variable_values: {},
    config: { rolling_restart: { post_restore_delay: "", restore_mode: "" } },
  });
});

test("rejects an invalid services config without a request", async () => {
  const { user, api } = renderPage("/ui/provisioning/clusters/create");

  await fillRequired(user);
  await user.click(screen.getByLabelText("Services config"));
  await user.paste("lvm: [unclosed");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(/Error during YAML value parsing/),
  ).toBeInTheDocument();
  expect(api.calls(create)).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
});

test.each([
  {
    handler: apiError(400, "Server s1 is offline"),
    message: "Server s1 is offline",
  },
  {
    handler: networkError(),
    message: "Error during cluster creation: TypeError: Failed to fetch",
  },
])("reports a failed creation: $message", async ({ handler, message }) => {
  const { user } = renderPage("/ui/provisioning/clusters/create", handler);

  await fillRequired(user);
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Clusters page")).not.toBeInTheDocument();
});

test("creates a cluster from a template", async () => {
  const { user, api } = renderPage("/ui/provisioning/clusters/create/template");

  await fillRequired(user);
  expect(screen.queryByLabelText("Services config")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Create" }));
  expect(await screen.findByText("Template is required")).toBeInTheDocument();
  expect(api.calls(create)).toHaveLength(0);

  await user.selectOptions(screen.getByLabelText("Templates"), "db");
  await user.click(screen.getByLabelText("Variables"));
  await user.paste("region: eu");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(await screen.findByText("Cluster c1 created")).toBeInTheDocument();
  expect(body(api)).toMatchObject({
    cluster_template: "db",
    cluster_template_variable_values: { region: "eu" },
    services_config: {},
    application_seed_config: {},
  });
});

test("rejects invalid template variables without a request", async () => {
  const { user, api } = renderPage("/ui/provisioning/clusters/create/template");

  await fillRequired(user);
  await user.selectOptions(screen.getByLabelText("Templates"), "web");
  await user.click(screen.getByLabelText("Variables"));
  await user.paste("region: [unclosed");
  await user.click(screen.getByRole("button", { name: "Create" }));

  expect(
    await screen.findByText(/Error during variable values parsing/),
  ).toBeInTheDocument();
  expect(api.calls(create)).toHaveLength(0);
});
