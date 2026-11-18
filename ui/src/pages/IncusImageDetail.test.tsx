import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import IncusImageDetail from "pages/IncusImageDetail";
import {
  apiError,
  mockFetch,
  networkError,
  ok,
  raw,
  Routes as ApiRoutes,
} from "test/fetch";
import { renderWithProviders } from "test/render";

const image = {
  name: "debian-12",
  aliases: ["debian", "debian/12"],
  description: "Debian 12",
  os: "Debian",
  release: "12",
  arch: "amd64",
  variant: "default",
  versions: {
    "20261117_0000": { items: {} },
    "20261118_0000": {
      items: {
        "rootfs.squashfs": { ftype: "squashfs", path: "", size: 2048 },
        "incus.tar.xz": {
          ftype: "incus.tar.xz",
          path: "",
          size: 1536,
          sha256: "abc123",
        },
      },
    },
  },
  last_updated: "2026-11-18T09:05:00",
};

const get = "GET /1.0/images/incus/debian-12";
const remove = "DELETE /1.0/images/incus/debian-12";
const update = "PUT /1.0/images/incus/debian-12";
const removeVersion = "DELETE /1.0/images/incus/debian-12/20261118_0000";
const file = "GET /1.0/images/incus/debian-12/20261118_0000/incus.tar.xz";

const renderPage = (routes: ApiRoutes, tab = "") => {
  const api = mockFetch({ [get]: ok(image), ...routes });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/images/incus/:name" element={<IncusImageDetail />} />
      <Route
        path="/ui/images/incus/:name/:activeTab"
        element={<IncusImageDetail />}
      />
      <Route path="/ui/images-view" element={<div>Images page</div>} />
    </Routes>,
    { route: `/ui/images/incus/debian-12${tab}` },
  );
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  return { ...view, api, invalidate };
};

const confirmDialog = () =>
  within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" });

test("shows the overview of the image", async () => {
  renderPage({});

  expect(await screen.findByText("debian, debian/12")).toBeInTheDocument();
  expect(screen.getByText("Debian 12")).toBeInTheDocument();
  expect(screen.getByText("amd64")).toBeInTheDocument();
  expect(screen.getByText("2026-11-18 09:05")).toBeInTheDocument();
});

test("reports an image that can not be loaded", async () => {
  renderPage({ [get]: apiError(404, "Not found") });

  expect(
    await screen.findByText("Error while loading image"),
  ).toBeInTheDocument();
});

test("deletes the image and returns to the list", async () => {
  const { user, api, invalidate } = renderPage({ [remove]: ok() });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(confirmDialog());

  expect(await screen.findByText("Images page")).toBeInTheDocument();
  expect(screen.getByText("Image debian-12 deleted")).toBeInTheDocument();
  expect(api.calls(remove)).toHaveLength(1);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
});

test.each([
  { handler: apiError(409, "Image is in use"), message: "Image is in use" },
  {
    handler: networkError(),
    message: "Error during image deletion: TypeError: Failed to fetch",
  },
])("delete failure shows $message", async ({ handler, message }) => {
  const { user } = renderPage({ [remove]: handler });

  await user.click(await screen.findByRole("button", { name: "Delete" }));
  await user.click(confirmDialog());

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.queryByText("Images page")).not.toBeInTheDocument();
});

test("updates the aliases and description", async () => {
  const { user, api, invalidate } = renderPage(
    { [update]: ok() },
    "/configuration",
  );

  const aliases = await screen.findByLabelText("Aliases");
  expect(aliases).toHaveValue("debian\ndebian/12");

  await user.clear(aliases);
  // Blank lines and surrounding spaces are dropped.
  await user.type(aliases, " bookworm {enter}{enter}stable");
  await user.clear(screen.getByLabelText("Description"));
  await user.type(screen.getByLabelText("Description"), "Stable Debian");
  await user.click(screen.getByRole("button", { name: "Submit" }));

  expect(
    await screen.findByText("Image debian-12 updated"),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(update)[0].body ?? "")).toEqual({
    aliases: ["bookworm", "stable"],
    description: "Stable Debian",
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
});

test.each([
  { handler: apiError(400, "Alias is taken"), message: "Alias is taken" },
  {
    handler: networkError(),
    message: "Error during image update: TypeError: Failed to fetch",
  },
])("update failure shows $message", async ({ handler, message }) => {
  const { user } = renderPage({ [update]: handler }, "/configuration");

  await user.click(await screen.findByRole("button", { name: "Submit" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
});

test("lists the versions, newest first, with their files", async () => {
  renderPage({}, "/versions");

  const headings = await screen.findAllByRole("heading", { level: 5 });
  expect(headings.map((h) => h.textContent)).toEqual([
    "20261118_0000",
    "20261117_0000",
  ]);

  // Files are sorted by name.
  const links = screen.getAllByTitle(/\.(xz|squashfs)$/);
  expect(links.map((l) => l.textContent)).toEqual([
    "incus.tar.xz",
    "rootfs.squashfs",
  ]);
  expect(screen.getByText("1.50 KiB")).toBeInTheDocument();
  expect(screen.getByTitle("abc123")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
});

test("shows an image without versions", async () => {
  renderPage({ [get]: ok({ ...image, versions: {} }) }, "/versions");

  expect(await screen.findByText("No versions available.")).toBeInTheDocument();
});

test.each([
  {
    handler: ok(),
    message: "Version 20261118_0000 of image debian-12 deleted",
    invalidated: true,
  },
  {
    handler: apiError(400, "Last version"),
    message: "Last version",
    invalidated: false,
  },
  {
    handler: networkError(),
    message: "Error during version deletion: TypeError: Failed to fetch",
    invalidated: false,
  },
])(
  "deleting a version shows $message",
  async ({ handler, message, invalidated }) => {
    const { user, api, invalidate } = renderPage(
      { [removeVersion]: handler },
      "/versions",
    );

    const deleteButtons = await screen.findAllByRole("button", {
      name: "Delete",
    });
    await user.click(deleteButtons[0]);
    expect(
      screen.getByText(/delete version "20261118_0000" of image/),
    ).toBeInTheDocument();
    await user.click(confirmDialog());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(api.calls(removeVersion)).toHaveLength(1);
    if (invalidated) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
    } else {
      expect(invalidate).not.toHaveBeenCalled();
    }
  },
);

// jsdom implements neither object URLs nor downloads through links.
let clicked: HTMLAnchorElement[];

beforeEach(() => {
  clicked = [];
  URL.createObjectURL = vi.fn(() => "blob:incus.tar.xz");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this);
  });
});

afterEach(() => {
  // @ts-expect-error Not implemented by jsdom, removed again.
  delete URL.createObjectURL;
  // @ts-expect-error Not implemented by jsdom, removed again.
  delete URL.revokeObjectURL;
});

test("downloads a file of a version", async () => {
  const { user, api } = renderPage(
    { [file]: raw(200, "tarball") },
    "/versions",
  );

  await user.click(await screen.findByTitle("incus.tar.xz"));

  await waitFor(() => {
    expect(clicked).toHaveLength(1);
  });
  expect(clicked[0].download).toBe("incus.tar.xz");
  expect(clicked[0].href).toBe("blob:incus.tar.xz");
  expect(api.calls(file)).toHaveLength(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:incus.tar.xz");
});

test("reports a failed download", async () => {
  const { user } = renderPage(
    { [file]: apiError(404, "File not found") },
    "/versions",
  );

  await user.click(await screen.findByTitle("incus.tar.xz"));

  expect(
    await screen.findByText(
      "Error during file downloading: Error: File not found",
    ),
  ).toBeInTheDocument();
  expect(clicked).toHaveLength(0);
});
