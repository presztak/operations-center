import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import IncusOS from "pages/IncusOS";
import {
  apiError,
  Handler,
  mockFetch,
  networkError,
  ok,
  raw,
} from "test/fetch";
import { renderWithProviders } from "test/render";

const renderOS = (route: string, routes: Record<string, Handler>) => {
  const api = mockFetch({
    "GET /os/1.0/system/update": ok({
      state: { status: "Update applied", needs_reboot: false },
    }),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/os" element={<IncusOS />} />
      <Route path="/ui/os/:activeTab" element={<IncusOS />} />
      <Route path="/ui/os/:activeTab/:subTab" element={<IncusOS />} />
    </Routes>,
    { route },
  );

  return { ...view, api };
};

type View = ReturnType<typeof renderOS>;

// Opens the modal of an action and confirms it with the submit button.
const runAction = async (view: View, title: string, submit: string) => {
  await view.user.click(await screen.findByTitle(title));
  const dialog = await screen.findByRole("dialog");
  await view.user.click(within(dialog).getByRole("button", { name: submit }));
};

// The fields of an action have no linked label, so find them next to the label.
const field = (label: string) =>
  within(screen.getByRole("dialog"))
    .getByText(label)
    .closest(".mb-3")!
    .querySelector("input, select") as HTMLInputElement;

const stubDownload = () => {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: () => "blob:file",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: () => {},
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });

  return downloads;
};

const uploadFile = async (view: View) => {
  const dialog = await screen.findByRole("dialog");
  await view.user.upload(
    dialog.querySelector("input[type=file]") as HTMLInputElement,
    new File(["data"], "backup.tar"),
  );
  await view.user.click(within(dialog).getByRole("button", { name: "Upload" }));
};

const apps = {
  "GET /os/1.0/applications": ok(["/os/1.0/applications/incus"]),
  "GET /os/1.0/applications/incus": ok({
    config: {},
    state: { version: "202611180000", available_versions: ["1", "2"] },
  }),
};

test("overview shows the system and its applications", async () => {
  renderOS("/ui/os", {
    "GET /os/1.0": ok({
      environment: {
        hostname: "host01",
        os_name: "IncusOS",
        os_version: "202611170000",
      },
    }),
    "GET /os/1.0/system/update": ok({
      state: { status: "Update applied", needs_reboot: true },
    }),
    ...apps,
  });

  expect(await screen.findByText("host01")).toBeVisible();
  expect(screen.getByText("IncusOS")).toBeVisible();
  expect(screen.getByText("202611170000")).toBeVisible();
  expect(
    await screen.findByText("Update applied (reboot required)"),
  ).toBeVisible();
  expect(await screen.findByText("incus 202611180000")).toBeVisible();
  expect(
    screen.getByTitle("Reboot required to apply update"),
  ).toBeInTheDocument();
  // The breadcrumb names the page.
  expect(screen.getByText("OS")).toBeVisible();
});

test("selecting a tab navigates to it", async () => {
  const { user } = renderOS("/ui/os", {
    "GET /os/1.0": ok({ environment: {} }),
    ...apps,
  });

  await user.click(screen.getByRole("tab", { name: "Applications" }));

  expect(await screen.findByRole("link", { name: "incus" })).toHaveAttribute(
    "href",
    "/ui/os/applications/incus",
  );
});

test.each([
  {
    title: "Check for updates",
    submit: "Check for updates",
    request: "POST /os/1.0/applications/incus/:check-update",
    body: null,
    message: "Update check triggered for incus",
  },
  {
    title: "Restart application",
    submit: "Restart application",
    request: "POST /os/1.0/applications/incus/:restart",
    body: null,
    message: "Application incus restarted",
  },
  {
    title: "Factory reset application",
    submit: "Factory reset application",
    request: "POST /os/1.0/applications/incus/:factory-reset",
    body: {},
    message: "Application incus factory reset",
  },
  {
    title: "Remove application",
    submit: "Remove application",
    request: "POST /os/1.0/applications/incus/:remove",
    body: null,
    message: "Application incus removed",
  },
])(
  "application action $title",
  async ({ title, submit, request, body, message }) => {
    const view = renderOS("/ui/os/applications", {
      ...apps,
      [request]: ok(),
    });

    await runAction(view, title, submit);

    expect(await screen.findByText(message)).toBeVisible();
    const calls = view.api.calls(request);
    expect(calls).toHaveLength(1);
    expect(calls[0].body && JSON.parse(calls[0].body)).toEqual(body);
  },
);

test("application version is switched to the selected one", async () => {
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications/incus/:switch-version": ok(),
  });

  await view.user.click(await screen.findByTitle("Switch version"));
  await screen.findByRole("dialog");
  expect(field("Version")).toHaveValue("1");
  await view.user.selectOptions(field("Version"), "2");
  await view.user.click(screen.getByRole("button", { name: "Switch" }));

  expect(await screen.findByText("Version switched for incus")).toBeVisible();
  expect(
    view.api.calls("POST /os/1.0/applications/incus/:switch-version")[0].body,
  ).toBe(JSON.stringify({ version: "2" }));
  // The details are loaded again.
  await waitFor(() => {
    expect(view.api.calls("GET /os/1.0/applications/incus")).toHaveLength(2);
  });
});

test("application is added", async () => {
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications": ok(),
  });

  await view.user.click(
    await screen.findByRole("button", { name: "Add application" }),
  );
  await screen.findByRole("dialog");
  await view.user.type(field("Name"), "migration-manager");
  await view.user.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByText("Application added")).toBeVisible();
  expect(view.api.calls("POST /os/1.0/applications")[0].body).toBe(
    JSON.stringify({ name: "migration-manager" }),
  );
  await waitFor(() => {
    expect(view.api.calls("GET /os/1.0/applications")).toHaveLength(2);
  });
});

test("application action reports a failure and keeps the modal open", async () => {
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications/incus/:restart": apiError(500, "Busy"),
  });

  await runAction(view, "Restart application", "Restart application");

  expect(
    await screen.findByText("Restart application failed: APIError: Busy"),
  ).toBeVisible();
  expect(screen.getByRole("dialog")).toBeVisible();
});

test("application backup is downloaded", async () => {
  const downloads = stubDownload();
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications/incus/:backup": raw(200, "archive"),
  });

  await runAction(view, "Backup application", "Backup application");

  expect(await screen.findByText("Application incus backed up")).toBeVisible();
  expect(downloads).toEqual(["incus-backup"]);
  expect(
    view.api.calls("POST /os/1.0/applications/incus/:backup")[0].body,
  ).toBe("{}");
});

test("application backup reports a failure", async () => {
  const downloads = stubDownload();
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications/incus/:backup": apiError(500, "No space"),
  });

  await runAction(view, "Backup application", "Backup application");

  expect(
    await screen.findByText("Backup application failed: Error: No space"),
  ).toBeVisible();
  expect(downloads).toHaveLength(0);
});

test("application backup is restored", async () => {
  const view = renderOS("/ui/os/applications", {
    ...apps,
    "POST /os/1.0/applications/incus/:restore": ok(),
  });

  await view.user.click(await screen.findByTitle("Restore application"));
  await uploadFile(view);

  expect(await screen.findByText("Application incus restored")).toBeVisible();
  expect(
    view.api.calls("POST /os/1.0/applications/incus/:restore"),
  ).toHaveLength(1);
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

test("application details show its config", async () => {
  renderOS("/ui/os/applications/incus", {
    ...apps,
    "GET /os/1.0/applications/incus": ok({ config: { a: 1 }, state: {} }),
  });

  expect(await screen.findByText(/a: 1/)).toBeVisible();
  expect(screen.getByRole("link", { name: "← Applications" })).toHaveAttribute(
    "href",
    "/ui/os/applications",
  );
  // The breadcrumb keeps the application name.
  expect(
    screen.getByText("incus", { selector: ".breadcrumb-text" }),
  ).toBeVisible();
});

test("debug log shows the journal and applies filters", async () => {
  const view = renderOS("/ui/os/debug", {
    "GET /os/1.0/debug/log": ok([
      {
        __REALTIME_TIMESTAMP: "1763456707000000",
        _HOSTNAME: "host01",
        SYSLOG_IDENTIFIER: "incusd",
        _PID: "42",
        MESSAGE: "\x1b[31mstarted\x1b[0m",
      },
      {
        __REALTIME_TIMESTAMP: "1763456708000000",
        _COMM: "kernel",
        MESSAGE: [98, 121, 116, 101, 115],
      },
    ]),
  });

  expect(await screen.findByText(/host01 incusd\[42\]: started/)).toBeVisible();
  expect(screen.getByText(/kernel: bytes/)).toBeVisible();

  const inputs = screen.getAllByRole("textbox");
  await view.user.type(inputs[0], "incus.service");
  await view.user.type(inputs[1], "-1");
  await view.user.clear(screen.getByRole("spinbutton"));
  await view.user.type(screen.getByRole("spinbutton"), "50");
  await view.user.click(screen.getByRole("button", { name: "Apply" }));

  await waitFor(() => {
    expect(view.api.calls("GET /os/1.0/debug/log").map((c) => c.url)).toEqual([
      "/os/1.0/debug/log?entries=200",
      "/os/1.0/debug/log?entries=50&unit=incus.service&boot=-1",
    ]);
  });
});

test("debug log shows an empty journal and a failure", async () => {
  renderOS("/ui/os/debug/log", { "GET /os/1.0/debug/log": ok([]) });

  expect(await screen.findByText("There are no logs.")).toBeVisible();
});

test("debug log reports a failure", async () => {
  renderOS("/ui/os/debug/log", {
    "GET /os/1.0/debug/log": apiError(403, "Forbidden"),
  });

  expect(
    await screen.findByText(/You do not have permission to view the logs/),
  ).toBeVisible();
});

test("debug processes are shown", async () => {
  renderOS("/ui/os/debug/processes", {
    "GET /os/1.0/debug/processes": ok("PID CMD\n1 init"),
  });

  expect(await screen.findByText(/1 init/)).toBeVisible();
});

test("debug processes report a failure", async () => {
  renderOS("/ui/os/debug/processes", {
    "GET /os/1.0/debug/processes": apiError(500, "ps failed"),
  });

  expect(
    await screen.findByText("Error while loading the processes: ps failed"),
  ).toBeVisible();
});

test("secure boot keys are updated", async () => {
  const view = renderOS("/ui/os/debug/secureboot", {
    "GET /os/1.0/debug/secureboot/event-log": ok({ state: {}, config: {} }),
    "POST /os/1.0/debug/secureboot/:update": ok(),
  });

  await view.user.click(
    await screen.findByRole("button", { name: "Update keys" }),
  );
  await view.user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Update keys",
    }),
  );

  expect(
    await screen.findByText("Secure boot keys update triggered"),
  ).toBeVisible();
  // The event log is read only.
  expect(screen.queryByLabelText("Edit mode")).toBeNull();
});

const services = {
  "GET /os/1.0/services": ok(["/os/1.0/services/ntp"]),
};

test("services are listed and reset", async () => {
  const view = renderOS("/ui/os/services", {
    ...services,
    "POST /os/1.0/services/ntp/:reset": ok(),
  });

  expect(await screen.findByRole("link", { name: "ntp" })).toHaveAttribute(
    "href",
    "/ui/os/services/ntp",
  );

  await runAction(view, "Reset service", "Reset service");

  expect(await screen.findByText("Service ntp reset")).toBeVisible();
});

const serviceDetails = (update: Handler) => ({
  ...services,
  "GET /os/1.0/services/ntp": ok({ state: {}, config: { enabled: true } }),
  "PUT /os/1.0/services/ntp": update,
});

const editService = async (view: View, yaml: string) => {
  await view.user.click(await screen.findByLabelText("Edit mode"));
  const editor = screen.getByRole("textbox");
  await view.user.clear(editor);
  await view.user.click(editor);
  await view.user.paste(yaml);
  await view.user.click(screen.getByRole("button", { name: "Submit" }));
};

test("service config is updated", async () => {
  const view = renderOS("/ui/os/services/ntp", serviceDetails(ok()));

  expect(await screen.findByText(/enabled: true/)).toBeVisible();
  expect(screen.getByRole("link", { name: "← Services" })).toBeVisible();

  await editService(view, "config:\n  enabled: false\n");

  expect(await screen.findByText("Service updated")).toBeVisible();
  expect(view.api.calls("PUT /os/1.0/services/ntp")[0].body).toBe(
    JSON.stringify({ config: { enabled: false } }),
  );
  await waitFor(() => {
    expect(view.api.calls("GET /os/1.0/services/ntp")).toHaveLength(2);
  });
});

test("service config rejects invalid YAML", async () => {
  const view = renderOS("/ui/os/services/ntp", serviceDetails(ok()));

  await editService(view, "config: [");

  expect(
    await screen.findByText(/Error during YAML value parsing/),
  ).toBeVisible();
  expect(view.api.calls("PUT /os/1.0/services/ntp")).toHaveLength(0);
});

test("service config reports a failed update", async () => {
  const view = renderOS(
    "/ui/os/services/ntp",
    serviceDetails(apiError(400, "Invalid config")),
  );

  await editService(view, "config:\n  enabled: 1\n");

  expect(
    await screen.findByText("Service update failed: APIError: Invalid config"),
  ).toBeVisible();
  expect(screen.getByRole("textbox")).toBeVisible();
});

test("service details report a failed load", async () => {
  renderOS("/ui/os/services/ntp", {
    ...services,
    "GET /os/1.0/services/ntp": apiError(500, "Unknown service"),
  });

  expect(
    await screen.findByText(
      "Error while loading the service data: Unknown service",
    ),
  ).toBeVisible();
});

test("system shows the first section by default", async () => {
  renderOS("/ui/os/system", {
    "GET /os/1.0/system/fallback-listener": ok({ config: { port: 1 } }),
  });

  expect(await screen.findByText(/port: 1/)).toBeVisible();
  expect(
    screen.getByRole("tab", { name: "Fallback listener", selected: true }),
  ).toBeVisible();
});

test.each([
  ["kernel", "Kernel"],
  ["logging", "Logging"],
  ["provider", "Provider"],
  ["resources", "Resources"],
])("system section %s is shown", async (key, title) => {
  renderOS(`/ui/os/system/${key}`, {
    [`GET /os/1.0/system/${key}`]: ok({ config: { section: key } }),
  });

  expect(await screen.findByText(new RegExp(`section: ${key}`))).toBeVisible();
  expect(
    screen.getByRole("tab", { name: title, selected: true }),
  ).toBeVisible();
});

test("network confirms a pending configuration and flushes DNS", async () => {
  const view = renderOS("/ui/os/system/network", {
    "GET /os/1.0/system/network": ok({
      state: { configuration_in_process: true },
      config: {},
    }),
    "POST /os/1.0/system/network/:confirm": ok(),
    "POST /os/1.0/system/network/:flush-dns": ok(),
  });

  await view.user.click(
    await screen.findByRole("button", { name: "Confirm configuration" }),
  );
  await view.user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Confirm configuration",
    }),
  );
  expect(
    await screen.findByText("Network configuration confirmed"),
  ).toBeVisible();

  await view.user.click(
    screen.getByRole("button", { name: "Flush DNS cache" }),
  );
  await view.user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Flush DNS cache",
    }),
  );
  expect(await screen.findByText("DNS cache flushed")).toBeVisible();
});

test("network has no confirmation without a pending configuration", async () => {
  renderOS("/ui/os/system/network", {
    "GET /os/1.0/system/network": ok({ state: {}, config: {} }),
  });

  expect(
    await screen.findByRole("button", { name: "Flush DNS cache" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Confirm configuration" }),
  ).toBeNull();
});

test.each([
  {
    tab: "security",
    label: "Rebind TPM",
    request: "POST /os/1.0/system/security/:tpm-rebind",
    body: null,
    message: "TPM rebind triggered",
  },
  {
    tab: "update",
    label: "Check for updates",
    request: "POST /os/1.0/system/update/:check",
    body: "{}",
    message: "Update check triggered",
  },
])("system action $label", async ({ tab, label, request, body, message }) => {
  const view = renderOS(`/ui/os/system/${tab}`, {
    [`GET /os/1.0/system/${tab}`]: ok({ state: {}, config: {} }),
    [request]: ok(),
  });

  await view.user.click(await screen.findByRole("button", { name: label }));
  await view.user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: label,
    }),
  );

  expect(await screen.findByText(message)).toBeVisible();
  expect(view.api.calls(request)[0].body).toBe(body);
});

test.each([
  {
    label: "Create volume",
    submit: "Create",
    fill: {
      Pool: "local",
      Name: "vol01",
      "Quota (bytes)": "1024",
      Use: "incus",
    },
    check: [],
    action: "create-volume",
    body: { pool: "local", name: "vol01", quota: 1024, use: "incus" },
    message: "Volume created",
  },
  {
    label: "Delete volume",
    submit: "Delete",
    fill: { Pool: "local", Name: "vol01" },
    check: ["Force"],
    action: "delete-volume",
    body: { pool: "local", name: "vol01", force: true },
    message: "Volume deleted",
  },
  {
    label: "Delete pool",
    submit: "Delete",
    fill: { Name: "local" },
    check: [],
    action: "delete-pool",
    body: { name: "local" },
    message: "Pool deleted",
  },
  {
    label: "Scrub pool",
    submit: "Scrub",
    fill: { Name: "local" },
    check: [],
    action: "scrub-pool",
    body: { name: "local" },
    message: "Pool scrub triggered",
  },
  {
    label: "Encrypt drive",
    submit: "Encrypt",
    fill: { "Drive ID": "sda" },
    check: ["Secure wipe"],
    action: "encrypt-drive",
    body: { id: "sda", secure_wipe: true },
    message: "Drive encryption triggered",
  },
  {
    label: "Wipe drive",
    submit: "Wipe",
    fill: { "Drive ID": "sdb" },
    check: [],
    action: "wipe-drive",
    body: { id: "sdb", secure_wipe: false },
    message: "Drive wipe triggered",
  },
  {
    label: "Import encrypted drive",
    submit: "Import",
    fill: { "Drive ID": "sdc", "Encryption key": "secret" },
    check: [],
    action: "import-encrypted-drive",
    body: { id: "sdc", key: "secret" },
    message: "Drive imported",
  },
  {
    label: "Import pool",
    submit: "Import",
    fill: { Name: "tank", "Encryption key": "secret" },
    check: [],
    action: "import-pool",
    body: { name: "tank", type: "zfs", encryption_key: "secret" },
    message: "Pool imported",
  },
])(
  "storage action $label",
  async ({ label, submit, fill, check, action, body, message }) => {
    const request = `POST /os/1.0/system/storage/:${action}`;
    const view = renderOS("/ui/os/system/storage", {
      "GET /os/1.0/system/storage": ok({ state: {}, config: {} }),
      [request]: ok(),
    });

    await view.user.click(await screen.findByRole("button", { name: label }));
    const dialog = await screen.findByRole("dialog");
    for (const [name, value] of Object.entries(fill)) {
      await view.user.type(field(name), value);
    }

    for (const name of check) {
      await view.user.click(field(name));
    }

    await view.user.click(within(dialog).getByRole("button", { name: submit }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(JSON.parse(view.api.calls(request)[0].body!)).toEqual(body);
  },
);

const overview = {
  "GET /os/1.0": ok({ environment: {} }),
  "GET /os/1.0/applications": ok([]),
};

test.each([
  {
    title: "Reboot server",
    submit: "Reboot",
    request: "POST /os/1.0/system/:reboot",
    message: "OS rebooted",
    failure: "OS reboot failed: APIError: Busy",
  },
  {
    title: "Power off",
    submit: "Power off",
    request: "POST /os/1.0/system/:poweroff",
    message: "OS shutdown",
    failure: "OS poweroff failed: APIError: Busy",
  },
  {
    title: "Suspend",
    submit: "Suspend",
    request: "POST /os/1.0/system/:suspend",
    message: "System suspended",
    failure: "Suspend failed: APIError: Busy",
  },
  {
    title: "Factory reset",
    submit: "Factory reset",
    request: "POST /os/1.0/system/:factory-reset",
    message: "Factory reset triggered",
    failure: "Factory reset failed: APIError: Busy",
  },
])("OS action $title", async ({ title, submit, request, message, failure }) => {
  const view = renderOS("/ui/os", { ...overview, [request]: ok() });

  await runAction(view, title, submit);

  expect(await screen.findByText(message)).toBeVisible();
  expect(view.api.calls(request)).toHaveLength(1);

  // A second run fails.
  mockFetch({
    "GET /os/1.0/system/update": ok({ state: {} }),
    ...overview,
    [request]: apiError(500, "Busy"),
  });
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  await runAction(view, title, submit);

  expect(await screen.findByText(failure)).toBeVisible();
});

test("OS backup is downloaded", async () => {
  const downloads = stubDownload();
  const view = renderOS("/ui/os", {
    ...overview,
    "POST /os/1.0/system/:backup": raw(200, "archive"),
  });

  await runAction(view, "Backup", "Backup");

  expect(await screen.findByText("System backup downloaded")).toBeVisible();
  expect(downloads).toEqual(["incus-os-backup"]);
});

test("OS backup is restored", async () => {
  const view = renderOS("/ui/os", {
    ...overview,
    "POST /os/1.0/system/:restore": ok(),
  });

  await view.user.click(await screen.findByTitle("Restore"));
  await uploadFile(view);

  expect(await screen.findByText("System restore triggered")).toBeVisible();
  expect(view.api.calls("POST /os/1.0/system/:restore")).toHaveLength(1);
});

test("OS restore reports a failure and keeps the modal open", async () => {
  const view = renderOS("/ui/os", {
    ...overview,
    "POST /os/1.0/system/:restore": networkError(),
  });

  await view.user.click(await screen.findByTitle("Restore"));
  await uploadFile(view);

  expect(
    await screen.findByText("Restore failed: TypeError: Failed to fetch"),
  ).toBeVisible();
  expect(screen.getByRole("dialog")).toBeVisible();
});
