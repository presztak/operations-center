import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import ServerDetail from "pages/ServerDetail";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Server } from "types/server";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const server = {
  name: "server01",
  cluster: "cluster01",
  description: "Rack 3",
  properties: { rack: "3" },
  connection_url: "https://10.0.0.1:8443",
  public_connection_url: "",
  channel: "stable",
  server_type: "incus",
  server_status: "ready",
  certificate: "-----BEGIN CERTIFICATE-----",
  fingerprint: "abc123",
  last_updated: "2026-11-18T09:05:00",
  last_seen: "0001-01-01T00:00:00Z",
  hardware_data: '{"cpu":"x86"}',
  os_data: '{"kernel":"6.8"}',
  bmc_config: { api_type: "" },
  version_data: {
    os: { name: "incusos", version: "202611010000", version_next: "" },
    applications: [{ name: "incus", version: "6.18" }],
    needs_reboot: false,
    needs_update: false,
    in_maintenance: 0,
  },
} as unknown as Server;

const serverRoute = "GET /1.0/provisioning/servers/server01";
const deleteRoute = "DELETE /1.0/provisioning/servers/server01";

const renderDetail = (handlers: Record<string, Handler>, path = "") => {
  const api = mockFetch(handlers);
  const view = renderWithProviders(
    <>
      <Routes>
        <Route
          path="/ui/provisioning/servers/:name"
          element={<ServerDetail />}
        />
        <Route
          path="/ui/provisioning/servers/:name/:activeTab"
          element={<ServerDetail />}
        />
        <Route path="*" element={null} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: `/ui/provisioning/servers/server01${path}` },
  );

  return { ...view, api };
};

// Returns the value shown in the row with the given header.
const rowValue = (header: string) =>
  screen.getByText(header).nextElementSibling?.textContent;

test("shows the overview of the server", async () => {
  const { user } = renderDetail({ [serverRoute]: ok(server) });

  expect(await screen.findByText("Rack 3")).toBeInTheDocument();
  expect(rowValue("Cluster name")).toBe("cluster01");
  expect(rowValue("Properties")).toBe("rack:3 ");
  expect(rowValue("Connection URL")).toBe("https://10.0.0.1:8443");
  expect(rowValue("OS version")).toBe("202611010000");
  expect(rowValue("Type")).toBe("Incus");
  expect(rowValue("Application version")).toBe("6.18");
  expect(rowValue("Fingerprint")).toBe("abc123");
  expect(rowValue("Last updated")).toBe("2026-11-18 09:05");
  expect(rowValue("Last seen")).toBe("");

  // The hardware and OS data are collapsed.
  expect(screen.queryByText(/"cpu/)).not.toBeInTheDocument();
  await user.click(screen.getAllByText("Show")[0]);
  expect(screen.getByText(/"cpu/)).toBeInTheDocument();
  await user.click(screen.getByText("Show"));
  expect(screen.getByText(/kernel/)).toBeInTheDocument();
  await user.click(screen.getAllByText("Hide")[0]);
  expect(screen.queryByText(/"cpu/)).not.toBeInTheDocument();
});

test("reports a server, which can not be loaded", async () => {
  renderDetail({ [serverRoute]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading server"),
  ).toBeInTheDocument();
});

test("switches the tab through the URL", async () => {
  const { user } = renderDetail({ [serverRoute]: ok(server) });

  await user.click(await screen.findByRole("tab", { name: "BMC" }));

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers/server01/bmc",
  );
  expect(
    await screen.findByText(/No BMC is configured for this server/),
  ).toBeInTheDocument();
  // Deleting is offered on the overview only.
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

const confirmDelete = async (deleteHandler: Handler) => {
  const view = renderDetail({
    [serverRoute]: ok(server),
    [deleteRoute]: deleteHandler,
  });

  await view.user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(
      /Are you sure you want to delete the server "server01"\?/,
    ),
  ).toBeInTheDocument();
  await view.user.click(within(dialog).getByRole("button", { name: "Delete" }));

  return view;
};

test("deletes the server", async () => {
  const view = renderDetail({ [serverRoute]: ok(server), [deleteRoute]: ok() });
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  await view.user.click(await screen.findByRole("button", { name: "Delete" }));
  await view.user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete",
    }),
  );

  expect(
    await screen.findByText("Server server01 deleted"),
  ).toBeInTheDocument();
  expect(view.api.calls(deleteRoute)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers-view",
  );
});

test.each([
  {
    handler: apiError(400, "Server is in a cluster"),
    want: "Server is in a cluster",
  },
  { handler: networkError(), want: /Error during server deletion: TypeError/ },
])("reports a failed deletion: $want", async ({ handler, want }) => {
  await confirmDelete(handler);

  expect(await screen.findByText(want)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/ui/provisioning/servers/server01",
    );
  });
});
