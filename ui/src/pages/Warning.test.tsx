import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import Warning from "pages/Warning";
import WarningDetail from "pages/WarningDetail";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const warning = {
  uuid: "w1",
  type: "Server unreachable",
  status: "new",
  count: 3,
  messages: ["first try", "last try"],
  scope: { scope: "server", entity: "server01", entity_type: "server" },
  first_occurrence: "2026-11-17T08:00:00",
  last_occurrence: "2026-11-18T09:05:00",
  last_updated: "2026-11-18T09:06:00",
};

const renderWarnings = (route: string, routes: Record<string, Handler>) => {
  const api = mockFetch(routes);
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/warnings" element={<Warning />} />
      <Route
        path="/ui/provisioning/warnings/:uuid"
        element={<WarningDetail />}
      />
      <Route
        path="/ui/provisioning/warnings/:uuid/:activeTab"
        element={<WarningDetail />}
      />
    </Routes>,
    { route },
  );

  return { ...view, api };
};

test("lists the warnings with their messages", async () => {
  renderWarnings("/ui/provisioning/warnings", {
    "GET /1.0/warnings": ok([
      warning,
      { ...warning, uuid: "w2", messages: null },
    ]),
  });

  const links = await screen.findAllByRole("link", {
    name: "Server unreachable",
  });
  expect(links[0]).toHaveAttribute("href", "/ui/provisioning/warnings/w1");
  expect(screen.getAllByText("- last try")).toHaveLength(1);
  expect(screen.getAllByText("2026-11-17 08:00")).toHaveLength(2);
});

test("reports a failed load of the warnings", async () => {
  renderWarnings("/ui/provisioning/warnings", {
    "GET /1.0/warnings": apiError(500, "Database down"),
  });

  expect(
    await screen.findByText("Error while loading warnings"),
  ).toBeInTheDocument();
});

test("shows the details of a warning", async () => {
  renderWarnings("/ui/provisioning/warnings/w1", {
    "GET /1.0/warnings/w1": ok(warning),
  });

  expect(await screen.findByText("last try")).toBeVisible();
  expect(screen.getByText("server01")).toBeVisible();
  expect(screen.getByText("2026-11-18 09:06")).toBeVisible();
  expect(screen.getByRole("button", { name: "Acknowledge" })).toBeVisible();
});

test("acknowledges a new warning", async () => {
  const { user, api } = renderWarnings("/ui/provisioning/warnings/w1", {
    "GET /1.0/warnings/w1": ok(warning),
    "PUT /1.0/warnings/w1": ok(),
  });

  await user.click(await screen.findByRole("button", { name: "Acknowledge" }));

  expect(await screen.findByText("Warning w1 acknowledged")).toBeVisible();
  expect(JSON.parse(api.calls("PUT /1.0/warnings/w1")[0].body!)).toEqual({
    status: "acknowledged",
  });
  await waitFor(() => {
    expect(api.calls("GET /1.0/warnings/w1")).toHaveLength(2);
  });
});

test.each([
  {
    name: "an API error",
    handler: apiError(400, "Already acknowledged"),
    message: "Already acknowledged",
  },
  {
    name: "a network error",
    handler: networkError(),
    message: "Error while acknowledging warning: TypeError: Failed to fetch",
  },
])("reports $name while acknowledging", async ({ handler, message }) => {
  const { user } = renderWarnings("/ui/provisioning/warnings/w1/overview", {
    "GET /1.0/warnings/w1": ok(warning),
    "PUT /1.0/warnings/w1": handler,
  });

  await user.click(await screen.findByRole("button", { name: "Acknowledge" }));

  expect(await screen.findByText(message)).toBeVisible();
});

test("an acknowledged warning can not be acknowledged again", async () => {
  renderWarnings("/ui/provisioning/warnings/w1", {
    "GET /1.0/warnings/w1": ok({
      ...warning,
      status: "acknowledged",
      messages: [],
    }),
  });

  expect(await screen.findByText("acknowledged")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Acknowledge" })).toBeNull();
});

test("reports a failed load of a warning", async () => {
  renderWarnings("/ui/provisioning/warnings/w1", {
    "GET /1.0/warnings/w1": apiError(404, "Not found"),
  });

  expect(
    await screen.findByText("Error while loading warning"),
  ).toBeInTheDocument();
});
