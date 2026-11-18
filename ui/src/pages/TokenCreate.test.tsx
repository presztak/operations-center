import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import TokenCreate from "pages/TokenCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const create = "POST /1.0/provisioning/tokens";

const renderCreate = (handler: Handler) => {
  const api = mockFetch({ [create]: handler });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/provisioning/tokens/create" element={<TokenCreate />} />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: "/ui/provisioning/tokens/create" },
  );

  return { ...view, api };
};

test("creates a token, expiring in 30 days by default", async () => {
  const { user, api } = renderCreate(ok());

  await user.type(screen.getByLabelText("Description"), "Rack 3");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText("Token created")).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers-view/tokens",
  );

  const body = JSON.parse(api.calls(create)[0].body!);
  expect(body).toMatchObject({
    description: "Rack 3",
    channel: "",
    uses_remaining: 1,
  });
  const days = (Date.parse(body.expire_at) - Date.now()) / (24 * 3600 * 1000);
  expect(days).toBeGreaterThan(29.9);
  expect(days).toBeLessThanOrEqual(30);
});

test.each([
  {
    name: "API error",
    handler: apiError(400, "Invalid token"),
    want: "Invalid token",
  },
  {
    name: "network error",
    handler: networkError(),
    want: "Error during token creation: TypeError: Failed to fetch",
  },
])("reports a failed creation ($name)", async ({ handler, want }) => {
  const { user } = renderCreate(handler);

  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(await screen.findByText(want)).toBeInTheDocument();
  expect(screen.queryByTestId("location")).not.toBeInTheDocument();
});
