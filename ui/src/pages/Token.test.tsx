import { screen, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import Token from "pages/Token";
import { apiError, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import * as util from "util/util";

// Some checks of the image form have no id, so their label does not name them.
const checkByLabel = (label: RegExp) =>
  screen.getByText(label).closest(".form-check")!.querySelector("input")!;

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const token = {
  uuid: "b32d0079-c48b-4957-b1cb-e54b80dee4cd",
  channel: "stable",
  description: "Rack 1",
  expire_at: "2026-12-24T10:00:00",
  uses_remaining: 3,
};

const renderList = () =>
  renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/servers-view/tokens" element={<Token />} />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: "/ui/provisioning/servers-view/tokens" },
  );

test("lists the tokens", async () => {
  mockFetch({ "GET /1.0/provisioning/tokens": ok([token]) });
  renderList();

  const row = (await screen.findByText(token.uuid)).closest("tr")!;
  expect(within(row).getByText("Rack 1")).toBeInTheDocument();
  expect(within(row).getByText("2026-12-24 10:00")).toBeInTheDocument();
  expect(within(row).getByText("3")).toBeInTheDocument();
  expect(screen.getByText(token.uuid)).toHaveAttribute(
    "href",
    `/ui/provisioning/tokens/${token.uuid}`,
  );
});

test("reports a failure to load the tokens", async () => {
  mockFetch({ "GET /1.0/provisioning/tokens": apiError(500, "Database down") });
  renderList();

  expect(
    await screen.findByText("Error while loading tokens: Database down"),
  ).toBeInTheDocument();
});

test("navigates to the token creation", async () => {
  mockFetch({ "GET /1.0/provisioning/tokens": ok([]) });
  const { user } = renderList();

  await user.click(await screen.findByRole("button", { name: "Issue token" }));

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/tokens/create",
  );
});

test("downloads an image for a token", async () => {
  const api = mockFetch({
    "GET /1.0/provisioning/tokens": ok([token]),
    [`POST /1.0/provisioning/tokens/${token.uuid}/image`]: ok({
      image: "/1.0/images/abc",
    }),
  });
  const download = vi.spyOn(util, "downloadFile").mockImplementation(() => {});
  const { user, container } = renderList();

  await screen.findByText(token.uuid);
  await user.click(container.querySelector("td svg")!);

  // An application is required.
  await user.click(await screen.findByRole("button", { name: "Download" }));
  expect(
    await screen.findByText("Application is required"),
  ).toBeInTheDocument();

  await user.click(checkByLabel(/USB/));
  await user.selectOptions(screen.getByLabelText("Application"), "incus");
  // The checkboxes share the id of the image type radios, so their labels do not name them.
  await user.click(document.querySelector('input[name="incus-ceph"]')!);
  await user.click(checkByLabel(/no TPM 2.0 module/));
  await user.type(screen.getByPlaceholderText("nvme"), "nvme");
  await user.click(checkByLabel(/smallest/));
  await user.click(screen.getByLabelText("Network configuration"));
  await user.paste("dns:\n  hostname: server01\n");
  await user.click(screen.getByRole("button", { name: "Download" }));

  await vi.waitFor(() => {
    expect(download).toHaveBeenCalledWith(
      "/1.0/images/abc",
      `${token.uuid}.raw`,
    );
  });

  const body = JSON.parse(
    api.calls(`POST /1.0/provisioning/tokens/${token.uuid}/image`)[0].body!,
  );
  expect(body).toEqual({
    architecture: "x86_64",
    type: "raw",
    seeds: {
      applications: {
        version: "1",
        applications: [{ name: "incus" }, { name: "incus-ceph" }],
      },
      install: {
        force_install: true,
        force_reboot: false,
        target: {
          id: "",
          bus: "nvme",
          min_size: "",
          max_size: "",
          sort_order: "smallest",
        },
        security: { missing_tpm: true, missing_secure_boot: false },
      },
      network: { dns: { hostname: "server01" } },
      migration_manager: null,
      operations_center: null,
    },
  });
});

test("rejects invalid seed YAML of a token image", async () => {
  const api = mockFetch({ "GET /1.0/provisioning/tokens": ok([token]) });
  const { user, container } = renderList();

  await screen.findByText(token.uuid);
  await user.click(container.querySelector("td svg")!);
  await user.selectOptions(
    await screen.findByLabelText("Application"),
    "operations-center",
  );
  await user.click(screen.getByLabelText("Operations center seed data"));
  await user.paste("key: [unclosed");
  await user.click(screen.getByRole("button", { name: "Download" }));

  expect(
    await screen.findByText(/Error during YAML parsing/),
  ).toBeInTheDocument();
  expect(api.calls()).toHaveLength(1);
});

test("reports a failed image download", async () => {
  mockFetch({
    "GET /1.0/provisioning/tokens": ok([token]),
    [`POST /1.0/provisioning/tokens/${token.uuid}/image`]: apiError(
      400,
      "Token expired",
    ),
  });
  const { user, container } = renderList();

  await screen.findByText(token.uuid);
  await user.click(container.querySelector("td svg")!);
  await user.selectOptions(
    await screen.findByLabelText("Application"),
    "migration-manager",
  );
  expect(
    screen.getByLabelText("Migration manager seed data"),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Download" }));

  expect(
    await screen.findByText(
      "Error during image downloading: APIError: Token expired",
    ),
  ).toBeInTheDocument();
});
