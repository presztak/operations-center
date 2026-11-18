import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import ServerConfiguration from "pages/ServerConfiguration";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Server } from "types/server";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const server = {
  name: "server01",
  description: "Rack 3",
  properties: {},
  public_connection_url: "https://server01:8443",
  channel: "stable",
  bmc_config: {
    api_type: "redfish-v1-generic",
    endpoint: "https://bmc01",
    certificate: "",
    auto_pin_certificate: true,
    username: "admin",
    password: "secret",
  },
} as unknown as Server;

const base = "/1.0/provisioning/servers/server01";
const update = `PUT ${base}`;
const rename = `POST ${base}`;
const network = `PUT ${base}/system/network`;
const storage = `PUT ${base}/system/storage`;

const renderConfiguration = async (handlers: Record<string, Handler> = {}) => {
  const api = mockFetch({
    [`GET ${base}`]: ok(server),
    [`GET ${base}/system/network`]: ok({ dns: { hostname: "server01" } }),
    [`GET ${base}/system/storage`]: ok({ pools: [] }),
    "GET /1.0/provisioning/channels": ok([
      { name: "stable" },
      { name: "testing" },
    ]),
    ...handlers,
  });
  const view = renderWithProviders(
    <>
      <Routes>
        <Route
          path="/ui/provisioning/servers/:name/configuration"
          element={<ServerConfiguration />}
        />
        <Route path="*" element={null} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: "/ui/provisioning/servers/server01/configuration" },
  );

  await screen.findByDisplayValue("Rack 3");

  return { ...view, api };
};

// The sections of the form are fieldsets, each with its own submit button.
const submitSection = async (
  user: Awaited<ReturnType<typeof renderConfiguration>>["user"],
  label: string,
) => {
  const fieldset = screen
    .getByLabelText(label)
    .closest("fieldset") as HTMLElement;
  await user.click(within(fieldset).getByRole("button", { name: "Submit" }));
};

const body = (
  api: Awaited<ReturnType<typeof renderConfiguration>>["api"],
  route: string,
) => JSON.parse(api.calls(route)[0].body ?? "");

test("shows the configuration of the server", async () => {
  await renderConfiguration();

  expect(screen.getByLabelText("Name")).toHaveValue("server01");
  expect(screen.getByLabelText("Connection URL")).toHaveValue(
    "https://server01:8443",
  );
  expect(screen.getByLabelText("URL")).toHaveValue("https://bmc01");
  expect(screen.getByLabelText("Username")).toHaveValue("admin");
  expect(screen.getByLabelText("Network configuration")).toHaveValue(
    "dns:\n  hostname: server01\n",
  );
  expect(screen.getByLabelText("Storage configuration")).toHaveValue(
    "pools: []\n",
  );
});

test("reports a configuration, which can not be loaded", async () => {
  mockFetch({
    [`GET ${base}`]: ok(server),
    [`GET ${base}/system/network`]: apiError(500, "Server offline"),
    [`GET ${base}/system/storage`]: ok({}),
  });
  renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/servers/:name"
        element={<ServerConfiguration />}
      />
    </Routes>,
    { route: "/ui/provisioning/servers/server01" },
  );

  expect(
    await screen.findByText("Error while loading servers"),
  ).toBeInTheDocument();
});

test("updates the configuration", async () => {
  const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
  const { user, api } = await renderConfiguration({ [update]: ok() });

  await user.clear(screen.getByLabelText("Description"));
  await user.type(screen.getByLabelText("Description"), "Rack 4");
  await submitSection(user, "Description");

  expect(
    await screen.findByText("Server server01 updated"),
  ).toBeInTheDocument();
  expect(body(api, update)).toEqual({
    description: "Rack 4",
    properties: {},
    public_connection_url: "https://server01:8443",
    channel: "stable",
    bmc_config: {
      api_type: "redfish-v1-generic",
      endpoint: "https://bmc01",
      certificate: "",
      auto_pin_certificate: true,
      username: "admin",
      password: "secret",
    },
  });
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ["servers", "server01"],
  });
});

test("clears the BMC API type without a BMC", async () => {
  const { user, api } = await renderConfiguration({ [update]: ok() });

  await user.clear(screen.getByLabelText("URL"));
  await submitSection(user, "URL");

  await screen.findByText("Server server01 updated");
  expect(body(api, update).bmc_config.api_type).toBe("");
});

test.each([
  {
    handler: apiError(400, "Invalid URL"),
    want: "Error during server update: Invalid URL",
  },
  { handler: networkError(), want: /Error during server update: TypeError/ },
])("reports a failed update: $want", async ({ handler, want }) => {
  const { user } = await renderConfiguration({ [update]: handler });

  await submitSection(user, "Description");

  expect(await screen.findByText(want)).toBeInTheDocument();
});

test.each([
  { label: "Network configuration", route: network, kind: "network" },
  { label: "Storage configuration", route: storage, kind: "storage" },
])("updates the $kind configuration", async ({ label, route }) => {
  const { user, api } = await renderConfiguration({ [route]: ok() });

  fireEvent.change(screen.getByLabelText(label), {
    target: { value: "key: value\n" },
  });
  await submitSection(user, label);

  await waitFor(() => {
    expect(api.calls(route)).toHaveLength(1);
  });
  expect(body(api, route)).toEqual({ key: "value" });
});

test.each([
  { label: "Network configuration", route: network, kind: "network" },
  { label: "Storage configuration", route: storage, kind: "storage" },
])(
  "rejects invalid YAML for the $kind configuration",
  async ({ label, route, kind }) => {
    const { user, api } = await renderConfiguration({ [route]: ok() });

    fireEvent.change(screen.getByLabelText(label), {
      target: { value: "key: [unclosed" },
    });
    await submitSection(user, label);

    expect(
      await screen.findByText(
        new RegExp(`Error during YAML ${kind} value parsing`),
      ),
    ).toBeInTheDocument();
    expect(api.calls(route)).toHaveLength(0);
  },
);

test.each([
  {
    label: "Network configuration",
    route: network,
    handler: apiError(400, "Bad interface"),
    want: "Error during network configuration update: Bad interface",
  },
  {
    label: "Network configuration",
    route: network,
    handler: networkError(),
    want: /Error during server network update: TypeError/,
  },
  {
    label: "Storage configuration",
    route: storage,
    handler: apiError(400, "Bad pool"),
    want: "Error during storage configuration update: Bad pool",
  },
  {
    label: "Storage configuration",
    route: storage,
    handler: networkError(),
    want: /Error during server storage update: TypeError/,
  },
])(
  "reports a failed update of the $label: $want",
  async ({ label, route, handler, want }) => {
    const { user } = await renderConfiguration({ [route]: handler });

    await submitSection(user, label);

    expect(await screen.findByText(want)).toBeInTheDocument();
  },
);

test("renames the server", async () => {
  const renamed = "/1.0/provisioning/servers/server02";
  const { user, api } = await renderConfiguration({
    [rename]: ok(),
    // The configuration of the renamed server is loaded after the navigation.
    [`GET ${renamed}`]: ok({ ...server, name: "server02" }),
    [`GET ${renamed}/system/network`]: ok({}),
    [`GET ${renamed}/system/storage`]: ok({}),
  });

  await user.clear(screen.getByLabelText("Name"));
  await user.type(screen.getByLabelText("Name"), "server02");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(
    await screen.findByText("Server server02 renamed"),
  ).toBeInTheDocument();
  expect(body(api, rename)).toEqual({ name: "server02" });
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers/server02/configuration",
  );
});

test("does not rename to the same name", async () => {
  const { user, api } = await renderConfiguration();

  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(api.calls(rename)).toHaveLength(0);
});

test.each([
  { handler: apiError(409, "Name taken"), want: "Name taken" },
  { handler: networkError(), want: /Error during server rename: TypeError/ },
])("reports a failed rename: $want", async ({ handler, want }) => {
  const { user } = await renderConfiguration({ [rename]: handler });

  await user.type(screen.getByLabelText("Name"), "-new");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});
