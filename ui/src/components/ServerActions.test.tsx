import { screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ServerActions from "components/ServerActions";
import { apiError, mockFetch, networkError, ok } from "test/fetch";
import { expectToast, renderWithProviders } from "test/render";
import { Server, ServerVersionData } from "types/server";

const server = (
  overrides: Partial<Server> = {},
  versionData: Partial<ServerVersionData> = {},
): Server =>
  ({
    name: "server01",
    cluster: "",
    server_type: "incus",
    server_status: "ready",
    bmc_config: { api_type: "" },
    version_data: {
      os: { name: "incusos", version: "1", version_next: "" },
      applications: [],
      needs_reboot: false,
      needs_update: false,
      in_maintenance: 0,
      ...versionData,
    },
    ...overrides,
  }) as Server;

const actionTitles = [
  "Reboot server",
  "Restore server",
  "Evacuate server",
  "Update server",
  "Power off server",
  "Deploy IncusOS",
  "Cancel deployment",
];

const shownActions = () =>
  actionTitles.filter((title) => screen.queryByTitle(title) !== null);

test.each([
  {
    name: "a standalone server",
    server: server(),
    shown: ["Reboot server", "Power off server"],
  },
  {
    name: "a clustered Incus server",
    server: server({ cluster: "cluster01" }),
    shown: ["Reboot server", "Evacuate server", "Power off server"],
  },
  {
    name: "an evacuated clustered Incus server",
    server: server({ cluster: "cluster01" }, { in_maintenance: 2 }),
    shown: ["Reboot server", "Restore server", "Power off server"],
  },
  {
    name: "a clustered server of another type",
    server: server({ cluster: "cluster01", server_type: "migration-manager" }),
    shown: ["Reboot server", "Power off server"],
  },
  {
    name: "an offline server",
    server: server({ server_status: "offline" }),
    shown: [],
  },
  {
    name: "an unregistered server with BMC",
    server: server({
      server_status: "unregistered",
      bmc_config: { api_type: "redfish-v1-generic" } as Server["bmc_config"],
    }),
    shown: ["Reboot server", "Power off server", "Deploy IncusOS"],
  },
  {
    name: "a deploying server",
    server: server({ server_status: "deploying" }),
    shown: ["Reboot server", "Power off server", "Cancel deployment"],
  },
])("shows the actions for $name", ({ server, shown }) => {
  renderWithProviders(<ServerActions server={server} />);

  expect(shownActions()).toEqual(shown);
  expect(screen.getByTitle("Resync server's state")).toBeInTheDocument();
});

test("hides reboot and power off during the update of an evacuated server", async () => {
  mockFetch({
    "GET /1.0/provisioning/servers/server01/changelog": ok({
      current_version: "2",
      prior_version: "1",
      channel: "stable",
      components: {},
    }),
  });
  renderWithProviders(
    <ServerActions
      server={server({}, { needs_update: true, in_maintenance: 2 })}
    />,
  );

  expect(await screen.findByTitle("Update server")).toBeInTheDocument();
  expect(shownActions()).toEqual(["Update server"]);
});

test.each([
  {
    name: "an update",
    versionData: { needs_update: true },
    recommended: "Update server",
  },
  {
    name: "a reboot",
    versionData: { needs_reboot: true },
    recommended: "Reboot server",
  },
  {
    name: "an evacuation before the reboot",
    overrides: { cluster: "cluster01" },
    versionData: { needs_reboot: true },
    recommended: "Evacuate server",
  },
  {
    name: "a restore",
    overrides: { cluster: "cluster01" },
    versionData: { in_maintenance: 2 },
    recommended: "Restore server",
  },
])(
  "highlights $name as recommended action",
  async ({ overrides, versionData, recommended }) => {
    mockFetch({
      "GET /1.0/provisioning/servers/server01/changelog": ok({
        current_version: "2",
        prior_version: "1",
        channel: "stable",
        components: {},
      }),
    });
    renderWithProviders(
      <ServerActions server={server(overrides, versionData)} />,
    );

    // The update button waits for the changelog.
    expect(await screen.findByTitle(recommended)).toBeInTheDocument();

    // The title of an icon is a title element within its svg.
    const highlighted = screen
      .getAllByTitle(/server$/)
      .filter((title) => title.closest("svg")?.style.color == "red");
    expect(highlighted.map((title) => title.textContent)).toEqual([
      recommended,
    ]);
  },
);

const resync = "POST /1.0/provisioning/servers/server01/:resync";

test("resyncs the server", async () => {
  const api = mockFetch({ [resync]: ok() });
  const { user, queryClient } = renderWithProviders(
    <ServerActions server={server()} />,
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await user.click(screen.getByTitle("Resync server's state"));

  await expectToast("Server resync triggered", "success");
  expect(api.calls(resync)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
});

test("reports a failed resync", async () => {
  mockFetch({ [resync]: apiError(500, "Resync failed") });
  const { user } = renderWithProviders(<ServerActions server={server()} />);

  await user.click(screen.getByTitle("Resync server's state"));

  await expectToast("Resync failed", "error");
});

test("reports a resync network error", async () => {
  mockFetch({ [resync]: networkError() });
  const { user } = renderWithProviders(<ServerActions server={server()} />);

  await user.click(screen.getByTitle("Resync server's state"));

  await expectToast(/Failed to fetch/, "error");
});
