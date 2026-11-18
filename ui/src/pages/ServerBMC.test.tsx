import { screen, waitFor, within } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import ServerBMC from "pages/ServerBMC";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { expectToast, renderWithProviders } from "test/render";
import { BMCData, Server } from "types/server";

const base = "/1.0/provisioning/servers/server01";

const bmcData = {
  bmc_vendor: "HPE",
  bmc_model: "iLO 6",
  bmc_firmware_version: "1.50",
  bmc_protocol: "Redfish",
  bmc_protocol_version: "1.17",
  server_manufacturer: "HPE",
  server_model: "DL380",
  server_serial_number: "SN123",
  server_bios_version: "U46",
  server_bios_attributes: { BootMode: "Uefi" },
  server_power_state: "On",
  server_location_indicator_active: true,
  server_health_status: "Warning",
  server_last_reset_time: "2026-11-18T08:00:00",
  server_boot_progress: {
    last_state: "OEM",
    oem_last_state: "PostDone",
    last_state_time: "2026-11-18T08:01:00",
    last_boot_time_seconds: 90,
  },
  virtual_media: {
    cd: {
      id: "cd",
      inserted: true,
      image: "https://oc/media.iso",
      image_name: "",
      connected_via: "URI",
      status: "OK",
      media_types: ["CD", "DVD"],
      transfer_method: "Stream",
      transfer_protocol_type: "HTTPS",
      write_protected: true,
    },
  },
  last_updated: "2026-11-18T09:00:00",
} as unknown as BMCData;

const server = (
  data: Partial<BMCData> = bmcData,
  apiType = "redfish-v1-generic",
) =>
  ({
    name: "server01",
    bmc_config: { api_type: apiType },
    bmc_data: data,
  }) as unknown as Server;

const renderBMC = async (handlers: Record<string, Handler>) => {
  const api = mockFetch({
    [`GET ${base}`]: ok(server()),
    [`GET ${base}/bmc/logs`]: ok(["system", "manager"]),
    ...handlers,
  });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/servers/:name/bmc"
        element={<ServerBMC />}
      />
    </Routes>,
    { route: "/ui/provisioning/servers/server01/bmc" },
  );

  await screen.findByText("Power state");

  return { ...view, api };
};

// Returns the value shown in the row with the given header.
const rowValue = (header: string) =>
  screen.getByText(header).nextElementSibling?.textContent;

test("tells when no BMC is configured", async () => {
  mockFetch({ [`GET ${base}`]: ok(server({}, "")) });
  renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/servers/:name/bmc"
        element={<ServerBMC />}
      />
    </Routes>,
    { route: "/ui/provisioning/servers/server01/bmc" },
  );

  expect(
    await screen.findByText(/No BMC is configured for this server/),
  ).toBeInTheDocument();
});

test("reports a server, which can not be loaded", async () => {
  mockFetch({ [`GET ${base}`]: apiError(500, "Database down") });
  renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/servers/:name/bmc"
        element={<ServerBMC />}
      />
    </Routes>,
    { route: "/ui/provisioning/servers/server01/bmc" },
  );

  expect(
    await screen.findByText("Error while loading servers"),
  ).toBeInTheDocument();
});

test("shows the BMC data", async () => {
  const { user } = await renderBMC({});

  expect(rowValue("Power state")).toBe("On");
  expect(rowValue("Indicator LED")).toBe("On");
  expect(rowValue("Health status")).toBe("Warning");
  expect(rowValue("Last reset")).toBe("2026-11-18 08:00");
  expect(rowValue("Boot progress")).toBe(
    "PostDone (reached 2026-11-18 08:01, last boot took 90 s)",
  );
  expect(rowValue("BMC model")).toBe("iLO 6");
  expect(rowValue("Protocol")).toBe("Redfish 1.17");
  expect(rowValue("Serial number")).toBe("SN123");

  const media = screen
    .getByText("https://oc/media.iso")
    .closest("tr") as HTMLElement;
  expect(within(media).getByText("Inserted")).toBeInTheDocument();
  expect(within(media).getByText("CD, DVD")).toBeInTheDocument();
  expect(within(media).getByText("Write protected")).toBeInTheDocument();

  expect(screen.queryByText(/"BootMode"/)).not.toBeInTheDocument();
  await user.click(screen.getAllByText("Show")[0]);
  expect(screen.getByText(/"BootMode": "Uefi"/)).toBeInTheDocument();
  await user.click(screen.getByText("Show"));
  expect(screen.getByText(/"bmc_vendor": "HPE"/)).toBeInTheDocument();
});

test.each([
  {
    name: "without data",
    data: {},
    want: { power: "Unknown", led: "Unknown", health: "", boot: "" },
  },
  {
    name: "powered off",
    data: {
      server_power_state: "Off",
      server_location_indicator_active: false,
      server_health_status: "OK",
      server_boot_progress: {
        last_state: "OSRunning",
        oem_last_state: "",
        last_state_time: "",
        last_boot_time_seconds: 0,
      },
      last_updated: "2026-11-18T09:00:00",
    },
    want: { power: "Off", led: "Off", health: "OK", boot: "OSRunning" },
  },
  {
    name: "in an unusual state",
    data: {
      server_power_state: "PoweringOn",
      server_health_status: "Critical",
    },
    want: { power: "PoweringOn", led: "Unknown", health: "Critical", boot: "" },
  },
])("shows the state $name", async ({ data, want }) => {
  await renderBMC({ [`GET ${base}`]: ok(server(data as Partial<BMCData>)) });

  expect(rowValue("Power state")).toBe(want.power);
  expect(rowValue("Indicator LED")).toBe(want.led);
  expect(rowValue("Health status")).toBe(want.health);
  expect(rowValue("Boot progress")).toBe(want.boot);
});

test("warns about virtual media, which could not be reported", async () => {
  await renderBMC({
    [`GET ${base}`]: ok(
      server({
        ...bmcData,
        virtual_media: {
          usb: {
            ...bmcData.virtual_media.cd,
            id: "usb",
            inserted: false,
            write_protected: false,
          },
        },
        unavailable: { virtual_media: "timeout" },
      }),
    ),
  });

  expect(screen.getByRole("alert")).toHaveTextContent(/was last seen.*timeout/);
  expect(screen.getByText("Not inserted")).toBeInTheDocument();
  expect(screen.getByText("Writable")).toBeInTheDocument();
});

test("refreshes the BMC data", async () => {
  const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
  const { user, api } = await renderBMC({
    [`POST ${base}/bmc/:refresh`]: ok(),
  });

  await user.click(screen.getByRole("button", { name: "Refresh" }));

  await expectToast("BMC data for server01 refreshed", "success");
  expect(api.calls(`POST ${base}/bmc/:refresh`)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: ["servers", "server01"],
  });
});

test("reports a failed refresh", async () => {
  const { user } = await renderBMC({
    [`POST ${base}/bmc/:refresh`]: networkError(),
  });

  await user.click(screen.getByRole("button", { name: "Refresh" }));

  await expectToast(/Error during BMC data refresh: TypeError/, "error");
});

test.each([
  { label: "LED on", active: true, success: "Indicator LED turned on" },
  { label: "LED off", active: false, success: "Indicator LED turned off" },
])("switches the indicator LED: $label", async ({ label, active, success }) => {
  const route = `POST ${base}/bmc/:server-locate`;
  const { user, api } = await renderBMC({ [route]: ok() });

  await user.click(screen.getByRole("button", { name: label }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: label,
    }),
  );

  await expectToast(success, "success");
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({ active });
});

test.each([
  {
    label: "Power on",
    action: "server-power-on",
    force: false,
    success: "Server power on triggered",
  },
  {
    label: "Power off",
    action: "server-power-off",
    force: true,
    success: "Server power off triggered",
  },
  {
    label: "Restart",
    action: "server-restart",
    force: true,
    success: "Server restart triggered",
  },
])(
  "triggers $label, forced: $force",
  async ({ label, action, force, success }) => {
    const route = `POST ${base}/bmc/:${action}`;
    const { user, api } = await renderBMC({ [route]: ok() });

    await user.click(screen.getByRole("button", { name: label }));
    const dialog = await screen.findByRole("dialog");
    if (force) {
      // The checkbox of OSAction is not associated with its label.
      await user.click(within(dialog).getByRole("checkbox"));
    }

    await user.click(within(dialog).getByRole("button", { name: label }));

    await expectToast(success, "success");
    expect(api.calls(route)[0].url).toBe(
      `${base}/bmc/:${action}${force ? "?force=1" : ""}`,
    );
  },
);

test("reports a failed power action", async () => {
  const route = `POST ${base}/bmc/:server-power-on`;
  const { user } = await renderBMC({
    [route]: apiError(500, "BMC unreachable"),
  });

  await user.click(screen.getByRole("button", { name: "Power on" }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Power on",
    }),
  );

  await expectToast("Power on failed: APIError: BMC unreachable", "error");
});

test("shows the entries of the selected log source", async () => {
  const entries = `GET ${base}/bmc/logs/system`;
  const { user } = await renderBMC({
    [entries]: ok([
      {
        timestamp: "2026-11-18T08:30:00",
        severity: "Critical",
        entry_type: "Event",
        entry_code: "Fan",
        message: "Fan 2 failed",
      },
    ]),
  });

  const select = await screen.findByDisplayValue("Select a log source");
  await waitFor(() => {
    expect(select).toBeEnabled();
  });
  await user.selectOptions(select, "system");

  const row = (await screen.findByText("Fan 2 failed")).closest(
    "tr",
  ) as HTMLElement;
  expect(within(row).getByText("2026-11-18 08:30")).toBeInTheDocument();
  expect(within(row).getByText("Critical")).toBeInTheDocument();
});

test.each([
  {
    name: "no log sources",
    handler: ok([]),
    want: "The BMC does not provide any log sources.",
  },
  {
    name: "a failing log source list",
    handler: apiError(500, "Logs unsupported"),
    want: "Logs unsupported",
  },
])("tells about $name", async ({ handler, want }) => {
  await renderBMC({ [`GET ${base}/bmc/logs`]: handler });

  expect(await screen.findByText(want)).toBeInTheDocument();
});
