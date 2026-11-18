import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import UpdateDetail from "pages/UpdateDetail";
import {
  apiError,
  Handler,
  mockFetch,
  networkError,
  ok,
  raw,
} from "test/fetch";
import { renderWithProviders } from "test/render";
import * as util from "util/util";

const uuid = "6e0e6d4b-30a1-4c4c-b0d6-3d5ba6d6bdd4";
const updatePath = `/1.0/provisioning/updates/${uuid}`;
const update = {
  uuid,
  version: "202611100000",
  published_at: "2026-11-10T12:00:00",
  severity: "high",
  origin: "images.linuxcontainers.org",
  channels: ["testing", "edge"],
  upstream_channels: ["stable"],
  changelog: "",
  update_status: "ready",
};

const changelog = (prior: string, components = {}) => ({
  current_version: "202611100000",
  prior_version: prior,
  channel: "testing",
  components,
});

const renderDetail = (tab: string, routes: Record<string, Handler> = {}) => {
  const api = mockFetch({
    [`GET ${updatePath}`]: ok(update),
    "GET /1.0/provisioning/channels": ok([
      { name: "stable", description: "", last_updated: "" },
      { name: "testing", description: "", last_updated: "" },
      { name: "edge", description: "", last_updated: "" },
    ]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/updates/:uuid" element={<UpdateDetail />} />
      <Route
        path="/ui/provisioning/updates/:uuid/:activeTab"
        element={<UpdateDetail />}
      />
    </Routes>,
    { route: `/ui/provisioning/updates/${uuid}${tab}` },
  );

  return { ...view, api };
};

test("shows the update with the changelog of each channel", async () => {
  const { api } = renderDetail("", {
    [`GET ${updatePath}/changelog`]: (request) => {
      const channel = new URLSearchParams(request.url.split("?")[1]).get(
        "channel",
      );
      return channel == "testing"
        ? ok(changelog("202610010000", { incus: { added: ["Feature"] } }))(
            request,
          )
        : ok(changelog(""))(request);
    },
  });

  expect(
    await screen.findByText("images.linuxcontainers.org"),
  ).toBeInTheDocument();
  expect(screen.getByText("high")).toBeInTheDocument();
  expect(screen.getByText("stable")).toBeInTheDocument();
  expect(screen.getByText("testing, edge")).toBeInTheDocument();

  expect(
    await screen.findByText(": 202610010000 → 202611100000"),
  ).toBeInTheDocument();
  expect(screen.getByText("incus")).toBeInTheDocument();
  // Without prior version, the update is the initial one of the channel.
  expect(
    await screen.findByText(": initial → 202611100000"),
  ).toBeInTheDocument();
  expect(screen.getByText("No changes")).toBeInTheDocument();
  expect(
    api.calls(`GET ${updatePath}/changelog`).map((r) => r.url.split("?")[1]),
  ).toEqual(["channel=testing", "channel=edge"]);
});

test("falls back to the upstream channels for the changelog", async () => {
  const { api } = renderDetail("", {
    [`GET ${updatePath}`]: ok({ ...update, channels: null }),
    [`GET ${updatePath}/changelog`]: apiError(404, "No prior version"),
  });

  expect(
    await screen.findByText("Channel stable (upstream)"),
  ).toBeInTheDocument();
  expect(
    await screen.findByText("Error while loading changelog: No prior version"),
  ).toBeInTheDocument();
  expect(api.calls(`GET ${updatePath}/changelog`)[0].url).toContain(
    "channel=stable&upstream=true",
  );
});

test("reports an update without channels", async () => {
  renderDetail("", {
    [`GET ${updatePath}`]: ok({
      ...update,
      channels: [],
      upstream_channels: null,
    }),
  });

  expect(
    await screen.findByText("Update is not assigned to any channel"),
  ).toBeInTheDocument();
});

test("reports an update that can not be loaded", async () => {
  renderDetail("", { [`GET ${updatePath}`]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading update"),
  ).toBeInTheDocument();
});

test("updates the channels of the update", async () => {
  const { user, api, queryClient } = renderDetail("/configuration", {
    [`PUT ${updatePath}`]: ok(),
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  const select = await screen.findByLabelText("Channels");
  await screen.findByRole("option", { name: "edge" });
  await user.deselectOptions(select, "edge");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(`Update ${uuid} updated`)).toBeInTheDocument();
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["updates"] });
  expect(JSON.parse(api.calls(`PUT ${updatePath}`)[0].body!)).toEqual({
    channels: ["testing"],
  });
});

test("selects all channels of the configuration with Ctrl+A", async () => {
  const { user, api } = renderDetail("/configuration", {
    [`PUT ${updatePath}`]: ok(),
  });

  await screen.findByRole("option", { name: "stable" });
  await user.click(screen.getByLabelText("Channels"));
  await user.keyboard("{Control>}a{/Control}");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  await screen.findByText(`Update ${uuid} updated`);
  expect(JSON.parse(api.calls(`PUT ${updatePath}`)[0].body!)).toEqual({
    channels: ["stable", "testing", "edge"],
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Unknown channel"),
    want: "Unknown channel",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during Update update: TypeError: Failed to fetch",
  },
])("reports a failed update ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("/configuration", {
    [`PUT ${updatePath}`]: handler,
  });

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});

const files = [
  {
    filename: "IncusOS_202611100000.efi.gz",
    size: 1536,
    sha256: "abc123",
    component: "os",
    type: "update-efi",
    architecture: "x86_64",
  },
  {
    filename: "a-very-long-file-name-for-the-incus-application.raw.gz",
    size: 1024 * 1024,
    sha256: "def456",
    component: "incus",
    type: "application",
    architecture: "aarch64",
  },
];

// jsdom does not implement object URLs.
const createObjectURL = vi.fn(() => "blob:file");

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
});

afterEach(() => {
  createObjectURL.mockClear();
});

test("lists the files of the update", async () => {
  renderDetail("/files", { [`GET ${updatePath}/files`]: ok(files) });

  const row = (await screen.findByText("IncusOS_202611100000.efi.gz")).closest(
    "tr",
  )!;
  expect(within(row).getByText("1.50 KiB")).toBeInTheDocument();
  expect(within(row).getByText("os")).toBeInTheDocument();
  expect(within(row).getByText("update-efi")).toBeInTheDocument();
  expect(within(row).getByTitle("abc123")).toBeInTheDocument();
  // Long names are shortened, the full name stays in the title.
  expect(
    screen.getByTitle("a-very-long-file-name-for-the-incus-application.raw.gz"),
  ).toHaveTextContent("a-very-long-file-name-for-the-...");
});

test("reports files that can not be loaded", async () => {
  renderDetail("/files", {
    [`GET ${updatePath}/files`]: apiError(500, "Storage down"),
  });

  expect(
    await screen.findByText("Error while loading files: Storage down"),
  ).toBeInTheDocument();
});

test("downloads a file", async () => {
  const download = vi.spyOn(util, "downloadFile").mockImplementation(() => {});
  const { user } = renderDetail("/files", {
    [`GET ${updatePath}/files`]: ok(files),
    [`GET ${updatePath}/files/IncusOS_202611100000.efi.gz`]: raw(200, "binary"),
  });

  await user.click(await screen.findByText("IncusOS_202611100000.efi.gz"));

  await vi.waitFor(() => {
    expect(download).toHaveBeenCalledExactlyOnceWith(
      "blob:file",
      "IncusOS_202611100000.efi.gz",
    );
  });
});

test("reports a failed download", async () => {
  const download = vi.spyOn(util, "downloadFile").mockImplementation(() => {});
  const { user } = renderDetail("/files", {
    [`GET ${updatePath}/files`]: ok(files),
    [`GET ${updatePath}/files/IncusOS_202611100000.efi.gz`]: apiError(
      404,
      "File not found",
    ),
  });

  await user.click(await screen.findByText("IncusOS_202611100000.efi.gz"));

  expect(
    await screen.findByText(
      "Error during image downloading: Error: File not found",
    ),
  ).toBeInTheDocument();
  expect(download).not.toHaveBeenCalled();
});
