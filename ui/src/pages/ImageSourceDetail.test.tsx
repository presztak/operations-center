import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import ImageSourceDetail from "pages/ImageSourceDetail";
import {
  apiError,
  mockFetch,
  networkError,
  ok,
  Routes as ApiRoutes,
} from "test/fetch";
import { renderWithProviders } from "test/render";

const source = {
  name: "upstream",
  url: "https://images.example.com",
  filter_expression: 'architecture == "amd64"',
  last_updated: "2026-11-17T08:00:00",
};

const get = "GET /1.0/images/incus/sources/upstream";
const refresh = "POST /1.0/images/incus/sources/upstream/:refresh";
const remove = "DELETE /1.0/images/incus/sources/upstream";
const update = "PUT /1.0/images/incus/sources/upstream";

const renderPage = (
  routes: ApiRoutes,
  route = "/ui/images/sources/upstream",
) => {
  const api = mockFetch({ [get]: ok(source), ...routes });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/images/sources/:name" element={<ImageSourceDetail />} />
      <Route
        path="/ui/images/sources/:name/:activeTab"
        element={<ImageSourceDetail />}
      />
      <Route path="/ui/images-view/sources" element={<div>Sources page</div>} />
    </Routes>,
    { route },
  );
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  return { ...view, api, invalidate };
};

test("shows the overview of the source", async () => {
  renderPage({});

  expect(
    await screen.findByText("https://images.example.com"),
  ).toBeInTheDocument();
  expect(screen.getByText('architecture == "amd64"')).toBeInTheDocument();
  expect(screen.getByText("2026-11-17 08:00")).toBeInTheDocument();
});

test("reports a source that can not be loaded", async () => {
  renderPage({ [get]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading image source"),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

test.each([
  { handler: ok(), message: "Refresh of image source upstream triggered" },
  {
    handler: apiError(400, "Source is unreachable"),
    message: "Source is unreachable",
  },
  {
    handler: networkError(),
    message: "Error during image source refresh: TypeError: Failed to fetch",
  },
])("refresh shows $message", async ({ handler, message }) => {
  const { user, api } = renderPage({ [refresh]: handler });

  await user.click(await screen.findByRole("button", { name: "Refresh" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(api.calls(refresh)).toHaveLength(1);
});

test("deletes the source and returns to the list", async () => {
  const { user, api, invalidate } = renderPage({ [remove]: ok() });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  expect(
    screen.getByText(/delete the image source "upstream"/),
  ).toBeInTheDocument();
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
  );

  expect(await screen.findByText("Sources page")).toBeInTheDocument();
  expect(screen.getByText("Image source upstream deleted")).toBeInTheDocument();
  expect(api.calls(remove)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["image-sources"] });
});

test.each([
  { handler: apiError(409, "Source is in use"), message: "Source is in use" },
  {
    handler: networkError(),
    message: "Error during image source deletion: TypeError: Failed to fetch",
  },
])("delete failure shows $message", async ({ handler, message }) => {
  const { user } = renderPage({ [remove]: handler });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
  );

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Sources page")).not.toBeInTheDocument();
});

test("updates the configuration", async () => {
  const { user, api, invalidate } = renderPage(
    { [update]: ok() },
    "/ui/images/sources/upstream/configuration",
  );

  const url = await screen.findByLabelText("URL");
  expect(screen.getByLabelText("Name")).toBeDisabled();
  // The actions are only offered on the overview.
  expect(
    screen.queryByRole("button", { name: "Refresh" }),
  ).not.toBeInTheDocument();

  await user.clear(url);
  await user.type(url, "https://mirror.example.com");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Image source upstream updated"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(update)[0].body ?? "")).toEqual({
    name: "upstream",
    url: "https://mirror.example.com",
    filter_expression: 'architecture == "amd64"',
    last_updated: "",
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["image-sources"] });
});

test.each([
  { handler: apiError(400, "Invalid URL"), message: "Invalid URL" },
  {
    handler: networkError(),
    message: "Error during image source update: TypeError: Failed to fetch",
  },
])("update failure shows $message", async ({ handler, message }) => {
  const { user } = renderPage(
    { [update]: handler },
    "/ui/images/sources/upstream/configuration",
  );

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
});

test("switches tabs through the URL", async () => {
  const { user } = renderPage({});

  await user.click(await screen.findByRole("tab", { name: "Configuration" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Name")).toHaveValue("upstream");
  });
});
