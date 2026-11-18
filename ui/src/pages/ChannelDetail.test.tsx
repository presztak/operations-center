import { screen, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import ChannelDetail from "pages/ChannelDetail";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const channelPath = "/1.0/provisioning/channels/testing";
const channel = {
  name: "testing",
  description: "Testing releases",
  last_updated: "2026-11-10T12:00:00",
};

const renderDetail = (tab: string, routes: Record<string, Handler> = {}) => {
  const api = mockFetch({
    [`GET ${channelPath}`]: ok(channel),
    "GET /1.0/provisioning/servers": ok([
      { name: "server01", channel: "testing" },
      { name: "server02", channel: "stable" },
    ]),
    "GET /1.0/provisioning/updates": ok([
      { uuid: "u1", version: "202611100000", channels: ["testing"] },
      { uuid: "u2", version: "202610010000", channels: ["stable"] },
      { uuid: "u3", version: "202609010000", channels: null },
    ]),
    ...routes,
  });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/channels/:name"
        element={<ChannelDetail />}
      />
      <Route
        path="/ui/provisioning/channels/:name/:activeTab"
        element={<ChannelDetail />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: `/ui/provisioning/channels/testing${tab}` },
  );

  return { ...view, api };
};

test("shows the channel with its servers and updates", async () => {
  renderDetail("");

  expect(await screen.findByText("Testing releases")).toBeInTheDocument();
  expect(screen.getByText("2026-11-10 12:00")).toBeInTheDocument();
  expect(await screen.findByText("server01")).toHaveAttribute(
    "href",
    "/ui/provisioning/servers/server01",
  );
  expect(screen.queryByText("server02")).not.toBeInTheDocument();
  expect(await screen.findByText("202611100000")).toHaveAttribute(
    "href",
    "/ui/provisioning/updates/u1",
  );
  expect(screen.queryByText("202610010000")).not.toBeInTheDocument();
});

test("reports a channel that can not be loaded", async () => {
  renderDetail("", { [`GET ${channelPath}`]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading channel"),
  ).toBeInTheDocument();
});

test("deletes the channel", async () => {
  const { user, api } = renderDetail("", { [`DELETE ${channelPath}`]: ok() });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText(/delete the channel "testing"/),
  ).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Delete" }));

  expect(
    await screen.findByText("Channel testing deleted"),
  ).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/updates-view/channels",
  );
  expect(api.calls(`DELETE ${channelPath}`)).toHaveLength(1);
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Channel in use"),
    want: "Channel in use",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during channel deletion: TypeError: Failed to fetch",
  },
])("reports a failed deletion ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("", { [`DELETE ${channelPath}`]: handler });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Delete",
    }),
  );

  expect(await screen.findByText(want)).toBeInTheDocument();
});

test("updates the channel description, its name is fixed", async () => {
  const { user, api } = renderDetail("/configuration", {
    [`PUT ${channelPath}`]: ok(),
  });

  expect(await screen.findByLabelText("Name")).toBeDisabled();
  const description = screen.getByLabelText("Description");
  await user.clear(description);
  await user.type(description, "Candidates");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Channel testing updated"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(`PUT ${channelPath}`)[0].body!)).toEqual({
    name: "testing",
    description: "Candidates",
    last_updated: "",
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Invalid channel"),
    want: "Invalid channel",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during channel update: TypeError: Failed to fetch",
  },
])("reports a failed update ($name)", async ({ handler, want }) => {
  const { user } = renderDetail("/configuration", {
    [`PUT ${channelPath}`]: handler,
  });

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
});
