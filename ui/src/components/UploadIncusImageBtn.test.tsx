import { screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import UploadIncusImageBtn from "components/UploadIncusImageBtn";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { IncusImage } from "types/image_incus";

const upload = "POST /1.0/images/incus";

const metadata = new File(["meta"], "incus.tar.xz");
const rootfs = new File(["root"], "rootfs.squashfs");
const disk = new File(["disk"], "disk.qcow2");

// The form data is not recorded by mockFetch, since it is not a string.
const sentForm = () => {
  const init = vi.mocked(globalThis.fetch).mock.calls[0][1];
  return init?.body as FormData;
};

const openModal = async (handler: Handler, image?: IncusImage) => {
  const api = mockFetch({ [upload]: handler });
  const view = renderWithProviders(<UploadIncusImageBtn image={image} />);
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  await view.user.click(screen.getByRole("button", { name: "Upload" }));
  const dialog = screen.getByRole("dialog");
  const submit = within(dialog).getByRole("button", { name: "Upload" });

  return { ...view, api, invalidate, dialog, submit };
};

test("uploads the metadata tarball before the image files", async () => {
  const { user, api, invalidate, submit } = await openModal(ok());

  expect(screen.getByText("Upload image")).toBeInTheDocument();
  expect(submit).toBeDisabled();

  await user.upload(screen.getByLabelText("Metadata tarball"), metadata);
  // The image files are required as well.
  expect(submit).toBeDisabled();

  await user.upload(screen.getByLabelText("Image files"), [rootfs, disk]);
  expect(submit).toBeEnabled();
  await user.click(submit);

  expect(await screen.findByText("Image uploaded")).toBeInTheDocument();
  expect(api.calls(upload)).toHaveLength(1);
  expect([...sentForm().keys()]).toEqual([
    "incus.tar.xz",
    "rootfs.squashfs",
    "disk.qcow2",
  ]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("uploads the image files with the entered metadata", async () => {
  const { user, submit } = await openModal(ok());

  await user.click(
    screen.getByLabelText("Provide metadata and upload image files"),
  );
  expect(screen.queryByLabelText("Metadata tarball")).not.toBeInTheDocument();

  await user.type(screen.getByLabelText("Operating system"), "Debian");
  await user.type(screen.getByLabelText("Release"), "12");
  await user.selectOptions(screen.getByLabelText("Architecture"), "arm64");
  await user.type(screen.getByLabelText("Variant"), "cloud");
  await user.upload(screen.getByLabelText("Image files"), rootfs);
  // The version is still missing.
  expect(submit).toBeDisabled();

  await user.type(screen.getByLabelText("Version"), "20261118_0000");
  await user.click(submit);

  expect(await screen.findByText("Image uploaded")).toBeInTheDocument();
  const form = sentForm();
  expect([...form.keys()]).toEqual(["request_json", "rootfs.squashfs"]);
  expect(JSON.parse(form.get("request_json") as string)).toEqual({
    os: "Debian",
    release: "12",
    arch: "arm64",
    variant: "cloud",
    version: "20261118_0000",
  });
});

test("uploads a version with the metadata of the existing image", async () => {
  const image = {
    name: "debian-12",
    os: "Debian",
    release: "12",
    arch: "amd64",
    variant: "default",
  } as IncusImage;
  const { user, submit } = await openModal(ok(), image);

  expect(screen.getByText("Upload version for debian-12")).toBeInTheDocument();

  await user.click(
    screen.getByLabelText("Provide metadata and upload image files"),
  );
  // Only the version is asked for, the rest comes from the image.
  expect(screen.queryByLabelText("Operating system")).not.toBeInTheDocument();
  await user.type(screen.getByLabelText("Version"), "20261119_0000");
  await user.upload(screen.getByLabelText("Image files"), rootfs);
  await user.click(submit);

  expect(await screen.findByText("Image uploaded")).toBeInTheDocument();
  expect(JSON.parse(sentForm().get("request_json") as string)).toEqual({
    os: "Debian",
    release: "12",
    arch: "amd64",
    variant: "default",
    version: "20261119_0000",
  });
});

test.each([
  { handler: apiError(400, "Invalid tarball"), message: "Invalid tarball" },
  {
    handler: networkError(),
    message: "Error during image upload: TypeError: Failed to fetch",
  },
])(
  "keeps the modal open, if the upload fails: $message",
  async ({ handler, message }) => {
    const { user, invalidate, submit } = await openModal(handler);

    await user.upload(screen.getByLabelText("Metadata tarball"), metadata);
    await user.upload(screen.getByLabelText("Image files"), rootfs);
    await user.click(submit);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(submit).toBeEnabled();
    expect(invalidate).not.toHaveBeenCalled();
  },
);

test("closing the modal discards the selected files", async () => {
  const { user } = await openModal(ok());

  await user.upload(screen.getByLabelText("Metadata tarball"), metadata);
  await user.upload(screen.getByLabelText("Image files"), rootfs);
  await user.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  await user.click(screen.getByRole("button", { name: "Upload" }));
  expect(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Upload" }),
  ).toBeDisabled();
});
