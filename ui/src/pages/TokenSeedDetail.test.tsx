import { screen, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import TokenSeedDetail from "pages/TokenSeedDetail";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const uuid = "b32d0079-c48b-4957-b1cb-e54b80dee4cd";
const seedPath = `/1.0/provisioning/tokens/${uuid}/seeds/rack1`;
const seed = {
  token_uuid: uuid,
  name: "rack1",
  description: "First rack",
  public: false,
  seeds: {
    applications: {
      version: "1",
      applications: [{ name: "operations-center" }],
    },
    install: { force_install: true },
    network: { dns: { hostname: "oc01" } },
    migration_manager: null,
    operations_center: { trusted_client_certificates: ["abc"] },
  },
};

const renderDetail = (tab: string, routes: Record<string, Handler> = {}) => {
  const api = mockFetch({ [`GET ${seedPath}`]: ok(seed), ...routes });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/tokens/:uuid/seeds/:name"
        element={<TokenSeedDetail />}
      />
      <Route
        path="/ui/provisioning/tokens/:uuid/seeds/:name/:activeTab"
        element={<TokenSeedDetail />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: `/ui/provisioning/tokens/${uuid}/seeds/rack1${tab}` },
  );

  return { ...view, api };
};

test("shows the seed overview", async () => {
  renderDetail("");

  expect(await screen.findByText("First rack")).toBeInTheDocument();
  expect(screen.getByText("No")).toBeInTheDocument();
  expect(screen.getByText(/- name: operations-center/)).toBeInTheDocument();
  expect(screen.getByText("Operations center seed data")).toBeInTheDocument();
  expect(screen.getByText(/trusted_client_certificates/)).toBeInTheDocument();
  expect(screen.getByText("force_install: true")).toBeInTheDocument();
  expect(screen.getByText(/hostname: oc01/)).toBeInTheDocument();
  expect(
    screen.queryByText("Migration manager seed data"),
  ).not.toBeInTheDocument();
});

test("reports a seed that can not be loaded", async () => {
  renderDetail("", { [`GET ${seedPath}`]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading token seed"),
  ).toBeInTheDocument();
});

test("deletes the seed", async () => {
  const { user, api } = renderDetail("", { [`DELETE ${seedPath}`]: ok() });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(/delete the token seed "rack1"/),
  ).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByTestId("location")).toHaveTextContent(
    `/ui/provisioning/tokens/${uuid}/seeds`,
  );
  expect(api.calls(`DELETE ${seedPath}`)).toHaveLength(1);
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Seed in use"),
    want: "Seed in use",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token seed deletion: TypeError: Failed to fetch",
  },
])("reports a failed deletion ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("", { [`DELETE ${seedPath}`]: handler });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete",
    }),
  );

  expect(await screen.findByText(want)).toBeInTheDocument();
});

test("updates the seed configuration, without its name", async () => {
  const { user, api } = renderDetail("/configuration", {
    [`PUT ${seedPath}`]: ok(),
  });

  const description = await screen.findByLabelText("Description");
  expect(description).toHaveValue("First rack");
  expect(screen.getByLabelText("Operations center seed data")).toHaveValue(
    "trusted_client_certificates:\n  - abc\n",
  );

  await user.clear(description);
  await user.type(description, "Second rack");
  await user.selectOptions(screen.getByLabelText("Public"), "true");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Token seed rack1 updated"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(`PUT ${seedPath}`)[0].body!)).toEqual({
    description: "Second rack",
    public: true,
    seeds: {
      applications: {
        version: "1",
        applications: [{ name: "operations-center" }],
      },
      install: { force_install: true },
      network: { dns: { hostname: "oc01" } },
      migration_manager: null,
      operations_center: { trusted_client_certificates: ["abc"] },
    },
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Invalid seed"),
    want: "Invalid seed",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token seed update: TypeError: Failed to fetch",
  },
])("reports a failed update ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("/configuration", {
    [`PUT ${seedPath}`]: handler,
  });

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});

test("renames the seed", async () => {
  const { user, api } = renderDetail("/configuration", {
    [`POST ${seedPath}`]: ok(),
    [`GET /1.0/provisioning/tokens/${uuid}/seeds/rack-2`]: ok({
      ...seed,
      name: "rack-2",
    }),
  });

  const name = await screen.findByLabelText("Name");
  await user.clear(name);
  await user.type(name, "rack-2");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(
    await screen.findByText("Token seed rack-2 renamed"),
  ).toBeInTheDocument();
  expect(api.calls(`POST ${seedPath}`)[0].body).toBe(
    JSON.stringify({ name: "rack-2" }, null, 2),
  );
  // The configuration of the renamed seed is shown.
  expect(
    api.calls(`GET /1.0/provisioning/tokens/${uuid}/seeds/rack-2`),
  ).toHaveLength(1);
});

test("does not rename to the same or an invalid name", async () => {
  const { user, api } = renderDetail("/configuration");

  // Renaming to the unchanged name sends no request.
  await user.click(await screen.findByRole("button", { name: "Rename" }));
  expect(api.calls()).toHaveLength(1);

  const name = screen.getByLabelText("Name");
  await user.clear(name);
  await user.type(name, "-rack");
  await user.tab();

  expect(
    await screen.findByText(/Name must start with a letter or a digit/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
});

test.each([
  {
    name: "API error",
    handler: apiError(409, "Name taken"),
    want: "Name taken",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token seed rename: TypeError: Failed to fetch",
  },
])("reports a failed rename ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("/configuration", {
    [`POST ${seedPath}`]: handler,
  });

  const name = await screen.findByLabelText("Name");
  await user.clear(name);
  await user.type(name, "rack2");
  await user.click(screen.getByRole("button", { name: "Rename" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});
