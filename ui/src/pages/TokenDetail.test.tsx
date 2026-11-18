import { screen, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import TokenDetail from "pages/TokenDetail";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import * as util from "util/util";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const uuid = "b32d0079-c48b-4957-b1cb-e54b80dee4cd";
const tokenPath = `/1.0/provisioning/tokens/${uuid}`;
const token = {
  uuid,
  channel: "stable",
  description: "Rack 1",
  expire_at: "2026-12-24T10:00:00",
  uses_remaining: 3,
};

const renderDetail = (tab: string, routes: Record<string, Handler> = {}) => {
  const api = mockFetch({
    [`GET ${tokenPath}`]: ok(token),
    [`GET ${tokenPath}/provider-config`]: ok({ url: "https://oc.example.com" }),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/tokens/:uuid" element={<TokenDetail />} />
      <Route
        path="/ui/provisioning/tokens/:uuid/:activeTab"
        element={<TokenDetail />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: `/ui/provisioning/tokens/${uuid}${tab}` },
  );

  return { ...view, api };
};

test("shows the token overview", async () => {
  renderDetail("");

  expect(await screen.findByText("Rack 1")).toBeInTheDocument();
  expect(screen.getByText("2026-12-24 10:00")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(
    await screen.findByText("url: https://oc.example.com"),
  ).toBeInTheDocument();
});

test("reports a token that can not be loaded", async () => {
  renderDetail("", { [`GET ${tokenPath}`]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading token"),
  ).toBeInTheDocument();
});

test("switches to another tab", async () => {
  const { user } = renderDetail("", {
    [`GET ${tokenPath}/seeds`]: ok([]),
  });

  await user.click(await screen.findByRole("tab", { name: "Seeds" }));

  expect(
    await screen.findByRole("button", { name: "Create seed" }),
  ).toBeInTheDocument();
  // The delete button is only shown on the overview.
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

test("deletes the token", async () => {
  const { user, api } = renderDetail("", {
    [`DELETE ${tokenPath}`]: ok(),
  });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(/Are you sure you want to delete the token/),
  ).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(await screen.findByText(`Token ${uuid} deleted`)).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers-view/tokens",
  );
  expect(api.calls(`DELETE ${tokenPath}`)).toHaveLength(1);
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Token in use"),
    want: "Token in use",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token deletion: TypeError: Failed to fetch",
  },
])("reports a failed deletion ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("", { [`DELETE ${tokenPath}`]: handler });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete",
    }),
  );

  expect(await screen.findByText(want)).toBeInTheDocument();
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});

test("updates the token configuration", async () => {
  const { user, api } = renderDetail("/configuration", {
    [`PUT ${tokenPath}`]: ok(),
  });

  const description = await screen.findByLabelText("Description");
  expect(description).toHaveValue("Rack 1");

  await user.clear(description);
  await user.type(description, "Rack 2");
  await user.clear(screen.getByLabelText("Remaining uses"));
  await user.type(screen.getByLabelText("Remaining uses"), "5");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(`Token ${uuid} updated`)).toBeInTheDocument();
  expect(JSON.parse(api.calls(`PUT ${tokenPath}`)[0].body!)).toEqual({
    description: "Rack 2",
    channel: "stable",
    expire_at: "2026-12-24T10:00:00",
    uses_remaining: 5,
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Invalid expiry"),
    want: "Invalid expiry",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token update: TypeError: Failed to fetch",
  },
])("reports a failed update ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("/configuration", {
    [`PUT ${tokenPath}`]: handler,
  });

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});

const seed = {
  token_uuid: uuid,
  name: "rack1 seed",
  description: "",
  public: true,
  seeds: {},
  last_updated: "2026-11-01T08:30:00",
};

test("lists the seeds of the token", async () => {
  const { user } = renderDetail("/seeds", {
    [`GET ${tokenPath}/seeds`]: ok([seed]),
  });

  const link = await screen.findByText("rack1 seed");
  const row = link.closest("tr")!;
  expect(within(row).getByText("Yes")).toBeInTheDocument();
  expect(within(row).getByText("2026-11-01 08:30")).toBeInTheDocument();
  expect(link).toHaveAttribute(
    "href",
    `/ui/provisioning/tokens/${uuid}/seeds/rack1 seed`,
  );

  await user.click(screen.getByRole("button", { name: "Create seed" }));
  expect(screen.getByTestId("location")).toHaveTextContent(
    `/ui/provisioning/tokens/${uuid}/seeds/create`,
  );
});

test("reports seeds that can not be loaded", async () => {
  renderDetail("/seeds", {
    [`GET ${tokenPath}/seeds`]: apiError(500, "Database down"),
  });

  expect(
    await screen.findByText("Error while loading seeds: Database down"),
  ).toBeInTheDocument();
});

test("downloads the image of a seed", async () => {
  const download = vi.spyOn(util, "downloadFile").mockImplementation(() => {});
  const { user, container } = renderDetail("/seeds", {
    [`GET ${tokenPath}/seeds`]: ok([seed]),
  });

  await screen.findByText("rack1 seed");
  await user.click(container.querySelector("td svg")!);
  const dialog = await screen.findByRole("dialog");
  await user.selectOptions(within(dialog).getByRole("combobox"), "aarch64");
  await user.click(
    within(dialog)
      .getByText(/USB/)
      .closest(".form-check")!
      .querySelector("input")!,
  );
  await user.click(within(dialog).getByRole("button", { name: "Download" }));

  // The seed name is encoded, the extension of the URL names the image type.
  expect(download).toHaveBeenCalledExactlyOnceWith(
    `/1.0/provisioning/tokens/${uuid}/seeds/rack1%20seed/architecture/aarch64/type/raw/file.raw`,
    "rack1 seed.raw",
  );
});
