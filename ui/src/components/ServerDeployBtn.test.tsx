import { screen, waitFor, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ServerDeployBtn from "components/ServerDeployBtn";
import { apiError, Handler, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { Server } from "types/server";

const server = {
  name: "server01",
  bmc_data: {
    virtual_media: {
      cd: { id: "cd", media_types: ["CD", "DVD"] },
      usb: { id: "usb", media_types: null },
    },
  },
} as unknown as Server;

const deploy = "POST /1.0/provisioning/servers/server01/:deploy";

const openModal = async (deployHandler: Handler = ok()) => {
  const api = mockFetch({
    "GET /1.0/provisioning/tokens": ok([
      { uuid: "token-1", description: "Lab", uses_remaining: 3 },
    ]),
    "GET /1.0/provisioning/tokens/token-1/seeds": ok([
      { name: "public-seed", description: "Auto", public: true },
      { name: "private-seed", description: "", public: false },
    ]),
    "GET /1.0/provisioning/channels": ok([{ name: "stable" }]),
    [deploy]: deployHandler,
  });
  const view = renderWithProviders(<ServerDeployBtn server={server} />);

  await view.user.click(screen.getByTitle("Deploy IncusOS"));
  const dialog = await screen.findByRole("dialog");

  return { ...view, api, dialog };
};

const selectSeed = async ({
  user,
  dialog,
}: Awaited<ReturnType<typeof openModal>>) => {
  await user.selectOptions(
    within(dialog).getByLabelText("Token"),
    await within(dialog).findByRole("option", {
      name: "token-1 - Lab (3 uses left)",
    }),
  );
  await user.selectOptions(
    within(dialog).getByLabelText("Token seed"),
    await within(dialog).findByRole("option", { name: "public-seed - Auto" }),
  );
};

test("lists the tokens, public seeds and virtual media", async () => {
  const { user, dialog } = await openModal();

  expect(
    within(dialog).getByText('Deploy IncusOS on "server01"'),
  ).toBeInTheDocument();
  expect(within(dialog).getByLabelText("Token seed")).toBeDisabled();
  expect(
    within(dialog).getByRole("option", { name: "cd (CD, DVD)" }),
  ).toBeInTheDocument();
  expect(
    within(dialog).getByRole("option", { name: "usb" }),
  ).toBeInTheDocument();

  await user.selectOptions(
    within(dialog).getByLabelText("Token"),
    await within(dialog).findByRole("option", {
      name: "token-1 - Lab (3 uses left)",
    }),
  );

  expect(
    await within(dialog).findByRole("option", {
      name: "private-seed (not public)",
    }),
  ).toBeDisabled();
});

test("requires a token and a seed", async () => {
  const view = await openModal();
  const button = within(view.dialog).getByRole("button", { name: "Deploy" });

  expect(button).toBeDisabled();

  await selectSeed(view);

  expect(button).toBeEnabled();
});

test("deploys with the selected options", async () => {
  const view = await openModal();
  const { user, dialog, api, queryClient } = view;
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await selectSeed(view);
  await user.selectOptions(
    within(dialog).getByLabelText("Virtual media"),
    "cd",
  );
  await user.click(
    within(dialog).getByLabelText(
      "Skip the enrollment of the secure boot certificates",
    ),
  );
  await user.click(
    within(dialog).getByLabelText(
      'Accept a token seed, that does not set "force_reboot"',
    ),
  );

  // Enrollment media and skipping the certificates exclude each other.
  expect(
    within(dialog).getByLabelText(
      "Enroll the secure boot certificates from an enrollment media",
    ),
  ).toBeDisabled();

  await user.click(within(dialog).getByRole("button", { name: "Deploy" }));

  expect(
    await screen.findByText('Deployment of server "server01" triggered'),
  ).toBeInTheDocument();
  expect(JSON.parse(api.calls(deploy)[0].body ?? "")).toEqual({
    token_uuid: "token-1",
    seed: "public-seed",
    type: "iso",
    architecture: "",
    channel: "",
    virtual_media_id: "cd",
    force: true,
    skip_secure_boot_certificates: true,
    secure_boot_enrollment_media: false,
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("keeps the dialog open, if the deployment fails", async () => {
  const view = await openModal(apiError(400, "BMC unreachable"));

  await selectSeed(view);
  await view.user.click(
    within(view.dialog).getByRole("button", { name: "Deploy" }),
  );

  expect(
    await screen.findByText(
      "Error during server deployment: APIError: BMC unreachable",
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("resets the selection when closed", async () => {
  const view = await openModal();

  await selectSeed(view);
  await view.user.click(
    within(view.dialog).getByRole("button", { name: "Close" }),
  );
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  await view.user.click(screen.getByTitle("Deploy IncusOS"));

  expect(
    within(await screen.findByRole("dialog")).getByLabelText("Token"),
  ).toHaveValue("");
});
