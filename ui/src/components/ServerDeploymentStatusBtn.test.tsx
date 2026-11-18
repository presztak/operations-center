import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import ServerDeploymentStatusBtn from "components/ServerDeploymentStatusBtn";
import { Server, ServerDeploymentStatus } from "types/server";

const deployment: ServerDeploymentStatus = {
  state: "waiting-for-install",
  request: {
    token_uuid: "token-1",
    seed: "seed-1",
    type: "iso",
    architecture: "",
    channel: "",
    virtual_media_id: "cd",
    force: false,
    skip_secure_boot_certificates: false,
    secure_boot_enrollment_media: true,
  },
  force_reboot: true,
  bios_profiles: ["default", "hpe"],
  bios_attributes: { BootMode: "Uefi" },
  bios_deferred_attributes: {},
  deployment_settings: { timeout: 30 },
  media_url: "https://oc/media.iso",
  secure_boot_media_url: "",
  media_bytes_read: 1536,
  retries: 2,
  last_error: "BMC timeout",
  failed_state: "",
  started_at: "2026-11-18T09:00:00",
  state_entered_at: "2026-11-18T09:05:00",
  finished_at: "0001-01-01T00:00:00Z",
  history: [
    {
      state: "started",
      entered_at: "2026-11-18T09:00:00",
      retries: 0,
      error: "",
    },
    {
      state: "inserting-media",
      entered_at: "2026-11-18T09:01:00",
      retries: 2,
      error: "BMC timeout",
    },
  ],
};

const openStatus = async (status: ServerDeploymentStatus) => {
  const user = userEvent.setup();
  render(
    <ServerDeploymentStatusBtn
      server={{ name: "server01", deployment: status } as Server}
    />,
  );

  await user.click(screen.getByTitle("Show deployment status"));

  return { user, dialog: await screen.findByRole("dialog") };
};

// Returns the value shown in the row with the given header.
const rowValue = (dialog: HTMLElement, header: string) =>
  within(dialog).getByText(header).nextElementSibling?.textContent;

test("is hidden without a deployment", () => {
  render(<ServerDeploymentStatusBtn server={{ name: "server01" } as Server} />);

  expect(screen.queryByTitle("Show deployment status")).not.toBeInTheDocument();
});

test("shows the deployment status", async () => {
  const { dialog } = await openStatus(deployment);

  expect(
    within(dialog).getByText('Deployment status of "server01"'),
  ).toBeInTheDocument();
  expect(rowValue(dialog, "State")).toBe("waiting-for-install");
  expect(rowValue(dialog, "Last error")).toBe("BMC timeout");
  expect(rowValue(dialog, "Retries")).toBe("2");
  expect(rowValue(dialog, "Started at")).toBe("2026-11-18 09:00:00");
  expect(rowValue(dialog, "Token")).toBe("token-1");
  expect(rowValue(dialog, "Force reboot")).toBe("true");
  expect(rowValue(dialog, "Secure boot enrollment media")).toBe("true");
  expect(rowValue(dialog, "Media URL")).toBe("https://oc/media.iso");
  expect(rowValue(dialog, "Media read")).toBe("1.50 KiB");
  expect(rowValue(dialog, "BIOS profiles")).toBe("default, hpe");
  expect(
    within(dialog).getByText(/inserting-media \(retried 2x\): BMC timeout/),
  ).toBeInTheDocument();

  // Empty and unset values are left out.
  expect(within(dialog).queryByText("Failed in")).not.toBeInTheDocument();
  expect(within(dialog).queryByText("Finished at")).not.toBeInTheDocument();
  expect(
    within(dialog).queryByText("Secure boot media URL"),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).queryByText("BIOS deferred attributes"),
  ).not.toBeInTheDocument();
});

test("toggles the BIOS attributes and deployment settings", async () => {
  const { user, dialog } = await openStatus(deployment);

  expect(within(dialog).queryByText(/"BootMode"/)).not.toBeInTheDocument();

  const [attributes, settings] = within(dialog).getAllByText("Show");
  await user.click(attributes);
  expect(within(dialog).getByText(/"BootMode": "Uefi"/)).toBeInTheDocument();

  await user.click(settings);
  expect(within(dialog).getByText(/"timeout": 30/)).toBeInTheDocument();

  await user.click(within(dialog).getAllByText("Hide")[0]);
  expect(within(dialog).queryByText(/"BootMode"/)).not.toBeInTheDocument();
});

test("shows a failed and finished deployment", async () => {
  const { dialog } = await openStatus({
    ...deployment,
    failed_state: "inserting-media",
    finished_at: "2026-11-18T10:00:00",
    secure_boot_media_url: "https://oc/sb.iso",
    bios_deferred_attributes: { Pending: true },
    history: null,
  });

  expect(rowValue(dialog, "Failed in")).toBe("inserting-media");
  expect(rowValue(dialog, "Finished at")).toBe("2026-11-18 10:00:00");
  expect(rowValue(dialog, "Secure boot media URL")).toBe("https://oc/sb.iso");
  expect(
    within(dialog).getByText("BIOS deferred attributes"),
  ).toBeInTheDocument();
  expect(within(dialog).queryByText("History")).not.toBeInTheDocument();
});
