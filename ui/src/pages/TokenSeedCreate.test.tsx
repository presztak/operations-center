import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import TokenSeedCreate from "pages/TokenSeedCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const uuid = "b32d0079-c48b-4957-b1cb-e54b80dee4cd";
const create = `POST /1.0/provisioning/tokens/${uuid}/seeds`;

const renderCreate = (handler: Handler = ok()) => {
  const api = mockFetch({ [create]: handler });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/tokens/:uuid/seeds/create"
        element={<TokenSeedCreate />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: `/ui/provisioning/tokens/${uuid}/seeds/create` },
  );

  return { ...view, api };
};

test("requires a valid name and an application", async () => {
  const { user, api } = renderCreate();

  await user.type(screen.getByLabelText("Name"), "_seed");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText(/Name must start with a letter or a digit/),
  ).toBeInTheDocument();
  expect(screen.getByText("Applications is required")).toBeInTheDocument();
  expect(api.calls()).toHaveLength(0);
});

test("creates a seed with secondary applications", async () => {
  const { user, api } = renderCreate();

  await user.type(screen.getByLabelText("Name"), "rack1");
  await user.selectOptions(screen.getByLabelText("Application"), "incus");
  // The checkboxes share one id, so their labels do not name them.
  await user.click(document.querySelector('input[name="incus-linstor"]')!);
  await user.click(screen.getByLabelText("Install"));
  await user.paste("force_install: true");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Token seed created")).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(
    `/ui/provisioning/tokens/${uuid}/seeds`,
  );
  expect(JSON.parse(api.calls(create)[0].body!)).toEqual({
    name: "rack1",
    description: "",
    public: false,
    seeds: {
      applications: {
        version: "1",
        applications: [{ name: "incus" }, { name: "incus-linstor" }],
      },
      install: { force_install: true },
      network: null,
      migration_manager: null,
      operations_center: null,
    },
  });
});

test("drops secondary applications of other applications", async () => {
  const { user, api } = renderCreate();

  await user.type(screen.getByLabelText("Name"), "mm");
  await user.selectOptions(screen.getByLabelText("Application"), "incus");
  await user.click(document.querySelector('input[name="incus-ceph"]')!);
  await user.click(document.querySelector('input[name="incus-ceph"]')!);
  await user.click(document.querySelector('input[name="incus-linstor"]')!);
  await user.selectOptions(
    screen.getByLabelText("Application"),
    "migration-manager",
  );
  await user.click(screen.getByLabelText("Migration manager seed data"));
  await user.paste("port: 8443");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await screen.findByText("Token seed created");
  const body = JSON.parse(api.calls(create)[0].body!);
  expect(body.seeds.applications.applications).toEqual([
    { name: "migration-manager" },
  ]);
  expect(body.seeds.migration_manager).toEqual({ port: 8443 });
});

test("rejects invalid YAML", async () => {
  const { user, api } = renderCreate();

  await user.type(screen.getByLabelText("Name"), "rack1");
  await user.selectOptions(screen.getByLabelText("Application"), "incus");
  await user.click(screen.getByLabelText("Network"));
  await user.paste("dns: [unclosed");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText(/Error during yaml parsing/),
  ).toBeInTheDocument();
  expect(api.calls()).toHaveLength(0);
});

test.each([
  {
    name: "API error",
    handler: apiError(409, "Seed exists"),
    want: "Seed exists",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token seed creation: TypeError: Failed to fetch",
  },
])("reports a failed creation ($name)", async ({ handler, want }) => {
  const { user } = renderCreate(handler);

  await user.type(screen.getByLabelText("Name"), "rack1");
  await user.selectOptions(screen.getByLabelText("Application"), "incus");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});
