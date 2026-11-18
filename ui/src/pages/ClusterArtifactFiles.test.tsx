import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test, vi } from "vitest";
import ClusterArtifactFiles from "pages/ClusterArtifactFiles";
import { apiError, Handler, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const artifact = "GET /1.0/provisioning/clusters/c1/artifacts/terraform";
const file = "GET /1.0/provisioning/clusters/c1/artifacts/terraform/main.tf";

// Downloads go through an object URL and the click on a temporary link, which jsdom lacks.
const stubDownloads = () => {
  const downloads: string[] = [];
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: () => "blob:download",
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: () => {},
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });

  return downloads;
};

const renderPage = (artifactHandler: Handler, fileHandler: Handler = ok()) => {
  const api = mockFetch({ [artifact]: artifactHandler, [file]: fileHandler });
  const view = renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/clusters/:clusterName/artifacts/:artifactName/files"
        element={<ClusterArtifactFiles />}
      />
    </Routes>,
    { route: "/ui/provisioning/clusters/c1/artifacts/terraform/files" },
  );

  return { ...view, api };
};

const files = ok({
  name: "terraform",
  files: [
    { name: "main.tf", mime_type: "text/plain", size: 2048 },
    { name: "state.zip", mime_type: "application/zip", size: 0 },
  ],
});

test("lists the files of the artifact", async () => {
  renderPage(files);

  expect(await screen.findByText("main.tf")).toBeInTheDocument();
  expect(screen.getByText("text/plain")).toBeInTheDocument();
  expect(screen.getByText("2.00 KiB")).toBeInTheDocument();
  expect(screen.getByText("0 B")).toBeInTheDocument();
});

test("downloads a file", async () => {
  const downloads = stubDownloads();
  const { user, api } = renderPage(files);

  await user.click(await screen.findByText("main.tf"));

  await waitFor(() => {
    expect(downloads).toEqual(["main.tf"]);
  });
  expect(api.calls(file)).toHaveLength(1);
});

test("reports a failed download", async () => {
  const downloads = stubDownloads();
  const { user } = renderPage(files, apiError(404, "File not found"));

  await user.click(await screen.findByText("main.tf"));

  expect(
    await screen.findByText(
      "Error during file downloading: Error: File not found",
    ),
  ).toBeInTheDocument();
  expect(downloads).toEqual([]);
});

test("reports failing to load the artifact", async () => {
  renderPage(apiError(404, "Artifact not found"));

  expect(
    await screen.findByText(
      "Error while loading cluster artifact files: Artifact not found",
    ),
  ).toBeInTheDocument();
});
