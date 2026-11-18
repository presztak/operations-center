import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import Settings from "pages/Settings";
import {
  apiError,
  Handler,
  mockFetch,
  networkError,
  ok,
  raw,
} from "test/fetch";
import { renderWithProviders } from "test/render";

const security = {
  trusted_tls_client_cert_fingerprints: ["fp1", " "],
  trusted_tls_client_certificates: [" cert1 ", ""],
  trusted_tls_metrics_client_cert_fingerprints: ["", " mfp1 "],
  trusted_tls_metrics_client_certificates: [" mcert1 "],
  trusted_https_proxies: ["10.0.0.1", ""],
  oidc: {
    issuer: "https://oidc.example.com",
    client_id: "oc",
    scopes: "openid",
    audience: "",
    claim: "",
  },
  openfga: { api_token: "", api_url: "", store_id: "" },
  acme: {
    agree_tos: false,
    ca_url: "",
    challenge: "HTTP-01",
    domain: "",
    email: "",
    http_challenge_address: "",
    provider: "",
    provider_environment: ["A=1", " "],
    provider_resolvers: [],
  },
};

const renderTab = (tab: string, routes: Record<string, Handler>) => {
  const api = mockFetch({
    "GET /1.0/provisioning/channels": ok([{ name: "stable" }]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/settings" element={<Settings />} />
      <Route path="/ui/settings/:activeTab" element={<Settings />} />
    </Routes>,
    { route: tab ? `/ui/settings/${tab}` : "/ui/settings" },
  );

  return { ...view, api };
};

const submit = async (user: ReturnType<typeof renderTab>["user"]) => {
  await user.click(screen.getByRole("button", { name: "Submit" }));
};

// Download of a file through an object URL, which jsdom lacks.
const stubDownload = () => {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: () => "blob:backup",
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

test("network is the default tab and updates the addresses", async () => {
  const { user, api } = renderTab("", {
    "GET /1.0/system/network": ok({
      address: "https://oc.example.com",
      rest_server_address: "[::]:7443",
    }),
    "PUT /1.0/system/network": ok(),
  });

  const listen = await screen.findByLabelText("REST API listen address");
  expect(listen).toHaveValue("[::]:7443");
  expect(screen.getByLabelText("Public URL")).toHaveValue(
    "https://oc.example.com",
  );

  await user.clear(listen);
  await user.click(listen);
  await user.paste("[::]:8443");
  await submit(user);

  expect(await screen.findByText("Network settings updated")).toBeVisible();
  expect(JSON.parse(api.calls("PUT /1.0/system/network")[0].body!)).toEqual({
    address: "https://oc.example.com",
    rest_server_address: "[::]:8443",
  });
});

test.each([
  {
    tab: "network",
    endpoint: "/1.0/system/network",
    data: { address: "", rest_server_address: "" },
    label: "network settings",
  },
  {
    tab: "security",
    endpoint: "/1.0/system/security",
    data: security,
    label: "system security",
  },
  {
    tab: "settings",
    endpoint: "/1.0/system/settings",
    data: {},
    label: "system settings",
  },
  {
    tab: "certificate",
    endpoint: "/1.0/system/certificate",
    data: {},
    label: "system certificate",
  },
  {
    tab: "updates",
    endpoint: "/1.0/system/updates",
    data: {},
    label: "system updates",
  },
])("$tab reports a failed update", async ({ tab, endpoint, data, label }) => {
  const method = tab == "certificate" ? "POST" : "PUT";
  const { user } = renderTab(tab, {
    [`GET ${endpoint}`]: ok(data),
    [`${method} ${endpoint}`]: apiError(400, "Invalid value"),
  });

  await screen.findByRole("button", { name: "Submit" });
  await submit(user);

  expect(await screen.findByText("Invalid value")).toBeVisible();
  expect(screen.queryByText(new RegExp(`${label} updated`, "i"))).toBeNull();
});

test.each([
  ["network", "/1.0/system/network", "network settings"],
  ["security", "/1.0/system/security", "system security"],
  ["settings", "/1.0/system/settings", "system settings"],
  ["certificate", "/1.0/system/certificate", "system certificate"],
  ["updates", "/1.0/system/updates", "system updates"],
])("%s reports an unreachable server", async (tab, endpoint, label) => {
  const method = tab == "certificate" ? "POST" : "PUT";
  const { user } = renderTab(tab, {
    [`GET ${endpoint}`]: ok(tab == "security" ? security : {}),
    [`${method} ${endpoint}`]: networkError(),
  });

  await screen.findByRole("button", { name: "Submit" });
  await submit(user);

  expect(
    await screen.findByText(
      new RegExp(`Error during ${label} update: TypeError: Failed to fetch`),
    ),
  ).toBeVisible();
});

test.each([
  ["network", "/1.0/system/network", "the network settings"],
  ["security", "/1.0/system/security", "the security settings"],
  ["settings", "/1.0/system/settings", "the system settings"],
  ["certificate", "/1.0/system/certificate", "the system certificate"],
  ["updates", "/1.0/system/updates", "the update settings"],
])("%s shows a missing permission", async (tab, endpoint, label) => {
  renderTab(tab, { [`GET ${endpoint}`]: apiError(403, "Forbidden") });

  expect(
    await screen.findByText(
      `You do not have permission to view ${label}. This requires the admin role. Server response: Forbidden`,
    ),
  ).toBeVisible();
});

test("security drops empty entries before the update", async () => {
  const { user, api } = renderTab("security", {
    "GET /1.0/system/security": ok(security),
    "PUT /1.0/system/security": ok(),
  });

  expect((await screen.findAllByLabelText("Issuer URL"))[0]).toHaveValue(
    "https://oidc.example.com",
  );
  await submit(user);

  expect(await screen.findByText("System security updated")).toBeVisible();
  const body = JSON.parse(api.calls("PUT /1.0/system/security")[0].body!);
  expect(body).toMatchObject({
    trusted_tls_client_cert_fingerprints: ["fp1"],
    trusted_tls_client_certificates: ["cert1"],
    trusted_tls_metrics_client_cert_fingerprints: ["mfp1"],
    trusted_tls_metrics_client_certificates: ["mcert1"],
    trusted_https_proxies: ["10.0.0.1"],
    oidc: security.oidc,
  });
  expect(body.acme.provider_environment).toEqual(["A=1"]);
});

test("settings updates the log level and flags", async () => {
  const { user, api } = renderTab("settings", {
    "GET /1.0/system/settings": ok({
      log_level: "INFO",
      log_levels: {},
      server_registration_scriptlet: "",
      pprof_enabled: false,
      metrics_enabled: true,
      metrics_components: [],
    }),
    "PUT /1.0/system/settings": ok(),
  });

  const logLevel = await screen.findByLabelText("Log level");
  expect(logLevel).toHaveValue("INFO");

  await user.selectOptions(logLevel, "DEBUG");
  await user.click(screen.getByLabelText("Enable pprof debug endpoints"));
  await user.click(screen.getByLabelText("Enable metrics endpoint"));
  await user.type(
    screen.getByLabelText("Server Registration Scriptlet"),
    "def register(): pass",
  );
  await submit(user);

  expect(await screen.findByText("System settings updated")).toBeVisible();
  expect(JSON.parse(api.calls("PUT /1.0/system/settings")[0].body!)).toEqual({
    log_level: "DEBUG",
    log_levels: {},
    server_registration_scriptlet: "def register(): pass",
    pprof_enabled: true,
    metrics_enabled: false,
    metrics_components: [],
  });
});

test("certificate shows the current one and replaces it", async () => {
  const { user, api } = renderTab("certificate", {
    "GET /1.0/system/certificate": ok({
      certificate: "-----BEGIN CERTIFICATE-----",
      fingerprint: "abcdef",
      subject: "CN=oc",
      issuer: "CN=ca",
      not_before: "2026-01-01T00:00:00",
      not_after: "2027-01-01T00:00:00",
      dns_names: ["oc.example.com", "oc"],
      ip_addresses: ["10.0.0.1"],
    }),
    "POST /1.0/system/certificate": ok(),
  });

  expect(await screen.findByText("abcdef")).toBeVisible();
  expect(screen.getByText("CN=oc")).toBeVisible();
  expect(screen.getByText("CN=ca")).toBeVisible();
  expect(screen.getByText(/oc\.example\.com/)).toBeVisible();
  expect(screen.getByText(/10\.0\.0\.1/)).toBeVisible();

  await user.type(
    screen.getByRole("textbox", { name: "Certificate" }),
    "new-cert",
  );
  await user.type(screen.getByLabelText("Key"), "new-key");
  await submit(user);

  expect(await screen.findByText("System certificate updated")).toBeVisible();
  expect(
    JSON.parse(api.calls("POST /1.0/system/certificate")[0].body!),
  ).toEqual({ certificate: "new-cert", key: "new-key" });
  // The new certificate is loaded again.
  await waitFor(() => {
    expect(api.calls("GET /1.0/system/certificate")).toHaveLength(2);
  });
});

test("updates changes the image server", async () => {
  const { user, api } = renderTab("updates", {
    "GET /1.0/system/updates": ok({
      source: "https://images.example.com",
      signature_verification_root_ca: "",
      filter_expression: "",
      file_filter_expression: "",
      server_default_channel: "stable",
      updates_default_channel: "stable",
      image_server_authentication_by_query_param: false,
    }),
    "PUT /1.0/system/updates": ok(),
  });

  const source = await screen.findByLabelText("Image server URL");
  expect(source).toHaveValue("https://images.example.com");

  await user.clear(source);
  await user.type(source, "https://mirror.example.com");
  await user.type(screen.getByLabelText("Filter expression"), "x");
  await submit(user);

  expect(await screen.findByText("System updates updated")).toBeVisible();
  expect(
    JSON.parse(api.calls("PUT /1.0/system/updates")[0].body!),
  ).toMatchObject({
    source: "https://mirror.example.com",
    filter_expression: "x",
    server_default_channel: "stable",
  });
});

test("backup downloads with the selected content", async () => {
  const downloads = stubDownload();
  const { user, api } = renderTab("backup", {
    "POST /1.0/system/:backup": raw(200, "archive"),
  });

  // The checkboxes have no id, so their label is not linked.
  await user.click(
    screen
      .getByText("Include images")
      .closest(".form-check")!
      .querySelector("input")!,
  );
  await user.click(screen.getByRole("button", { name: "Download backup" }));

  expect(await screen.findByText("Backup created")).toBeVisible();
  expect(JSON.parse(api.calls("POST /1.0/system/:backup")[0].body!)).toEqual({
    with_images: true,
    with_updates: false,
  });
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toMatch(
    /^operations-center-backup-\d{8}T\d{6}\.tar\.gz$/,
  );
});

test("backup reports a failure", async () => {
  const downloads = stubDownload();
  const { user } = renderTab("backup", {
    "POST /1.0/system/:backup": apiError(500, "Disk full", {
      reason: "",
      request_id: "r1",
    }),
  });

  await user.click(screen.getByRole("button", { name: "Download backup" }));

  expect(
    await screen.findByText(
      "Error during backup creation: APIError: Disk full (request ID r1)",
    ),
  ).toBeVisible();
  expect(downloads).toHaveLength(0);
});

const uploadBackup = async (view: ReturnType<typeof renderTab>) => {
  const file = new File(["archive"], "backup.tar.gz");
  await view.user.upload(
    view.container.querySelector("input[type=file]") as HTMLInputElement,
    file,
  );
  await view.user.click(screen.getByRole("button", { name: "Upload" }));
};

test("restore uploads the backup only once confirmed", async () => {
  const view = renderTab("backup", {
    "POST /1.0/system/:restore": ok(),
  });

  await uploadBackup(view);

  expect(
    await screen.findByText(/restore the backup "backup.tar.gz"/),
  ).toBeVisible();
  expect(view.api.calls("POST /1.0/system/:restore")).toHaveLength(0);

  await view.user.click(screen.getByRole("button", { name: "Restore" }));

  expect(
    await screen.findByText(/Restore staged, Operations Center is restarting/),
  ).toBeVisible();
  expect(view.api.calls("POST /1.0/system/:restore")).toHaveLength(1);
});

test("restore is not uploaded, if cancelled", async () => {
  const view = renderTab("backup", {});

  await uploadBackup(view);
  await screen.findByText(/restore the backup "backup.tar.gz"/);
  await view.user.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => {
    expect(screen.queryByText(/restore the backup/)).toBeNull();
  });
  expect(view.api.calls("POST /1.0/system/:restore")).toHaveLength(0);
});

test.each([
  {
    name: "an API error",
    handler: apiError(400, "Invalid backup"),
    message: "Invalid backup",
  },
  {
    name: "a network error",
    handler: networkError(),
    message: "Error during backup restore: TypeError: Failed to fetch",
  },
])("restore reports $name", async ({ handler, message }) => {
  const view = renderTab("backup", { "POST /1.0/system/:restore": handler });

  await uploadBackup(view);
  await view.user.click(await screen.findByRole("button", { name: "Restore" }));

  expect(await screen.findByText(message)).toBeVisible();
});
