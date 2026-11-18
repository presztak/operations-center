import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ClusterStatus from "components/ClusterStatus";
import { Cluster, ClusterUpdateStatus } from "types/cluster";

const cluster = (updateStatus: Partial<ClusterUpdateStatus>) =>
  ({
    name: "c1",
    status: "ready",
    update_status: {
      needs_reboot: [],
      needs_update: [],
      in_maintenance: [],
      in_progress_status: { in_progress: "", error: "", last_updated: "" },
      ...updateStatus,
    },
  }) as unknown as Cluster;

const icons = [
  "The cluster update failed",
  "One or more servers are in maintenance",
  "One or more servers have pending updates",
  "One or more servers require a reboot",
];

test.each([
  { name: "idle", updateStatus: {}, text: "ready", icons: [] },
  {
    name: "in progress",
    updateStatus: {
      in_progress_status: {
        in_progress: "rolling reboot",
        error: "",
        last_updated: "",
        status_description: "Rebooting server01",
      },
    },
    text: "ready (rolling reboot) Rebooting server01",
    icons: [],
  },
  {
    name: "failed",
    updateStatus: {
      in_progress_status: {
        in_progress: "error",
        error: "boom",
        last_updated: "",
        status_description: "Update of server01 failed",
      },
    },
    text: "ready (error) Update of server01 failed",
    icons: ["The cluster update failed"],
  },
  {
    name: "pending work",
    updateStatus: {
      in_maintenance: ["s1"],
      needs_update: ["s1"],
      needs_reboot: ["s2"],
    },
    text: "ready",
    icons: icons.slice(1),
  },
])("shows the status of a cluster, which is $name", (tc) => {
  const { container } = render(
    <ClusterStatus cluster={cluster(tc.updateStatus)} />,
  );

  // The icons carry their description as SVG title, leave it out of the text.
  const text = container.cloneNode(true) as HTMLElement;
  text.querySelectorAll("svg").forEach((svg) => svg.remove());
  expect(text.textContent?.replace(/\s+/g, " ").trim()).toBe(tc.text);

  for (const icon of icons) {
    if ((tc.icons as string[]).includes(icon)) {
      expect(screen.getByTitle(icon)).toBeInTheDocument();
    } else {
      expect(screen.queryByTitle(icon)).not.toBeInTheDocument();
    }
  }
});
