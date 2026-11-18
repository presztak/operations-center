import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import ChannelCreate from "pages/ChannelCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const create = "POST /1.0/provisioning/channels";

const renderCreate = (handler: Handler) => {
  const api = mockFetch({ [create]: handler });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/channels/create"
        element={<ChannelCreate />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: "/ui/provisioning/channels/create" },
  );

  return { ...view, api };
};

test("creates a channel", async () => {
  const { user, api } = renderCreate(ok());

  await user.type(screen.getByLabelText("Name"), "edge");
  await user.type(screen.getByLabelText("Description"), "Daily builds");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Channel created")).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/updates-view/channels",
  );
  expect(JSON.parse(api.calls(create)[0].body!)).toEqual({
    name: "edge",
    description: "Daily builds",
    last_updated: "",
  });
});

test.each([
  {
    name: "API error",
    handler: apiError(409, "Channel exists"),
    want: "Channel exists",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during channel creation: TypeError: Failed to fetch",
  },
])("reports a failed creation ($name)", async ({ handler, want }) => {
  const { user } = renderCreate(handler);

  await user.type(screen.getByLabelText("Name"), "edge");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});
