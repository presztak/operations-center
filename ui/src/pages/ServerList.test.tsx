import { screen, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import Server from "pages/Server";
import { apiError, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Server as ServerType } from "types/server";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const server = (
  name: string,
  cluster: string,
  overrides: Partial<ServerType> = {},
) =>
  ({
    name,
    cluster,
    description: "",
    properties: {},
    connection_url: `https://${name}:8443`,
    public_connection_url: "",
    server_type: "incus",
    server_status: "ready",
    server_status_detail: "",
    system_state_is_trusted: true,
    bmc_config: { api_type: "" },
    version_data: {
      os: { name: "incusos", version: "202611010000", version_next: "" },
      applications: [
        { name: "incus", version: "202611010000", friendly_version: "6.18" },
      ],
      needs_reboot: false,
      needs_update: false,
      in_maintenance: 0,
    },
    ...overrides,
  }) as ServerType;

const renderList = (route = "/ui/provisioning/servers-view") =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/ui/provisioning/servers-view" element={<Server />} />
        <Route
          path="/ui/provisioning/servers-view/:activeTab"
          element={<Server />}
        />
        <Route path="*" element={null} />
      </Routes>
      <LocationDisplay />
    </>,
    { route },
  );

// Names of the servers in the order shown.
const shownNames = () =>
  screen.getAllByTitle("Server details").map((link) => link.textContent);

test("lists the servers sorted by cluster and name", async () => {
  mockFetch({
    "GET /1.0/provisioning/servers": ok([
      server("b", "cluster02"),
      server("c", "cluster01", {
        description: "Rack 3",
        properties: { rack: "3" },
        public_connection_url: "https://public:8443",
      }),
      server("a", "cluster01"),
    ]),
  });
  renderList();

  expect(await screen.findByText("Rack 3")).toBeInTheDocument();
  // The cluster links are titled "Server details" as well.
  expect(shownNames()).toEqual([
    "a",
    "cluster01",
    "c",
    "cluster01",
    "b",
    "cluster02",
  ]);

  const row = screen.getByText("Rack 3").closest("tr") as HTMLElement;
  expect(within(row).getByText("rack:3")).toBeInTheDocument();
  expect(within(row).getByText("202611010000")).toBeInTheDocument();
  expect(within(row).getByText("Incus")).toBeInTheDocument();
  expect(within(row).getByText("6.18")).toBeInTheDocument();
  expect(within(row).getByText("ready")).toBeInTheDocument();
  expect(
    within(row).getByTitle("Access server through external URL").closest("a"),
  ).toHaveAttribute("href", "https://public:8443");
});

test("passes the filter of the URL to the API", async () => {
  const api = mockFetch({ "GET /1.0/provisioning/servers": ok([]) });
  renderList("/ui/provisioning/servers-view?filter=cluster%3D%3D%22c1%22");

  await screen.findByText("Name");

  // The quotes are encoded by the fetch mock when parsing the URL.
  expect(api.calls()[0].url).toBe(
    "/1.0/provisioning/servers?recursion=1&filter=cluster==%22c1%22",
  );
});

test("reports a failing server list", async () => {
  mockFetch({
    "GET /1.0/provisioning/servers": apiError(500, "Database down"),
  });
  renderList();

  expect(await screen.findByText("Database down")).toBeInTheDocument();
});

test("opens the pre registration", async () => {
  mockFetch({ "GET /1.0/provisioning/servers": ok([]) });
  const { user } = renderList();

  await user.click(screen.getByRole("button", { name: "Pre register" }));

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers/pre-register",
  );
});
