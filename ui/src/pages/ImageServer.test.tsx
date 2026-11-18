import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import ImageServer from "pages/ImageServer";
import { apiError, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const image = {
  name: "debian-12",
  aliases: [],
  description: "Debian 12",
  os: "Debian",
  release: "12",
  arch: "amd64",
  variant: "default",
  versions: {},
  last_updated: "2026-11-18T09:05:00",
};

const source = {
  name: "upstream",
  url: "https://images.example.com",
  filter_expression: "true",
  last_updated: "2026-11-17T08:00:00",
};

const renderPage = (route: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/ui/images-view" element={<ImageServer />} />
      <Route path="/ui/images-view/:activeTab" element={<ImageServer />} />
      <Route
        path="/ui/images/sources/create"
        element={<div>Create page</div>}
      />
    </Routes>,
    { route },
  );

test("lists the images and switches to the sources", async () => {
  mockFetch({
    "GET /1.0/images/incus": ok([image]),
    "GET /1.0/images/incus/sources": ok([source]),
  });
  const { user } = renderPage("/ui/images-view");

  const link = await screen.findByRole("link", { name: "debian-12" });
  expect(link).toHaveAttribute("href", "/ui/images/incus/debian-12");
  const row = link.closest("tr") as HTMLElement;
  expect(within(row).getByText("Debian 12")).toBeInTheDocument();
  expect(within(row).getByText("2026-11-18 09:05")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Sources" }));

  const sourceLink = await screen.findByRole("link", { name: "upstream" });
  expect(sourceLink).toHaveAttribute("href", "/ui/images/sources/upstream");
  expect(screen.getByText("https://images.example.com")).toBeInTheDocument();
  expect(screen.getByText("2026-11-17 08:00")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Create source" }));
  expect(screen.getByText("Create page")).toBeInTheDocument();
});

test("reports a failure to load the images", async () => {
  mockFetch({ "GET /1.0/images/incus": apiError(500, "Database down") });
  renderPage("/ui/images-view/images");

  expect(
    await screen.findByText("Error while loading images: Database down"),
  ).toBeInTheDocument();
});

test("reports a failure to load the sources", async () => {
  mockFetch({ "GET /1.0/images/incus/sources": apiError(403, "Forbidden") });
  renderPage("/ui/images-view/sources");

  expect(
    await screen.findByText("Error while loading image sources: Forbidden"),
  ).toBeInTheDocument();
});
