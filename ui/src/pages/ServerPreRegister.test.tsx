import { screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes, useLocation } from "react-router";
import { expect, test, vi } from "vitest";
import ServerPreRegister from "pages/ServerPreRegister";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const preRegister = "POST /1.0/provisioning/servers";
const path = "/ui/provisioning/servers/pre-register";

const submit = async (handler: Handler, bmcEndpoint = "") => {
  const api = mockFetch({
    "GET /1.0/provisioning/channels": ok([{ name: "stable" }]),
    [preRegister]: handler,
  });
  const view = renderWithProviders(
    <>
      <Routes>
        <Route path={path} element={<ServerPreRegister />} />
        <Route path="*" element={null} />
      </Routes>
      <LocationDisplay />
    </>,
    { route: path },
  );

  await view.user.type(screen.getByLabelText("Name"), "server01");
  if (bmcEndpoint) {
    await view.user.type(screen.getByLabelText("URL"), bmcEndpoint);
  }

  await view.user.click(screen.getByRole("button", { name: "Pre register" }));

  return { ...view, api };
};

test("pre registers the server", async () => {
  const invalidate = vi.spyOn(QueryClient.prototype, "invalidateQueries");
  const view = await submit(ok());

  expect(
    await screen.findByText("Server server01 pre registered"),
  ).toBeInTheDocument();
  expect(JSON.parse(view.api.calls(preRegister)[0].body ?? "")).toEqual({
    name: "server01",
    description: "",
    properties: {},
    public_connection_url: "",
    channel: "stable",
    bmc_config: {
      api_type: "",
      endpoint: "",
      certificate: "",
      auto_pin_certificate: false,
      username: "",
      password: "",
    },
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/servers-view",
  );
});

test("sets the BMC API type, if a BMC is given", async () => {
  const { api } = await submit(ok(), "https://bmc01");

  await screen.findByText("Server server01 pre registered");
  expect(
    JSON.parse(api.calls(preRegister)[0].body ?? "").bmc_config,
  ).toMatchObject({
    api_type: "redfish-v1-generic",
    endpoint: "https://bmc01",
  });
});

test.each([
  {
    handler: apiError(409, "Server already exists"),
    want: "Server already exists",
  },
  {
    handler: networkError(),
    want: /Error during server pre registration: TypeError/,
  },
])(
  "stays on the form, if the pre registration fails: $want",
  async ({ handler, want }) => {
    await submit(handler);

    expect(await screen.findByText(want)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(path);
  },
);
