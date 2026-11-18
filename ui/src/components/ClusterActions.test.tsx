import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ClusterActions from "components/ClusterActions";
import {
  apiError,
  Handler,
  mockFetch,
  networkError,
  ok,
  Routes,
} from "test/fetch";
import { renderWithProviders } from "test/render";
import { Cluster } from "types/cluster";

const cluster = (inProgress = "", needsUpdate: string[] = []) =>
  ({
    name: "c1",
    status: "ready",
    update_status: {
      needs_reboot: [],
      needs_update: needsUpdate,
      in_maintenance: [],
      in_progress_status: {
        in_progress: inProgress,
        error: "",
        last_updated: "",
      },
    },
  }) as unknown as Cluster;

const renderActions = (c: Cluster, routes: Routes = {}) => {
  const api = mockFetch({
    "GET /1.0/provisioning/servers": ok([]),
    ...routes,
  });
  const view = renderWithProviders(<ClusterActions cluster={c} />);
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  return { ...view, api, invalidate };
};

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

test.each([
  {
    name: "idle",
    cluster: cluster(),
    shown: ["Reboot cluster"],
    hidden: ["Update cluster", "Cancel cluster operation"],
  },
  {
    name: "with pending updates",
    cluster: cluster("", ["s1"]),
    shown: ["Update cluster", "Reboot cluster"],
    hidden: ["Cancel cluster operation"],
  },
  {
    name: "with an operation in progress",
    cluster: cluster("rolling reboot", ["s1"]),
    shown: ["Cancel cluster operation"],
    hidden: ["Update cluster", "Reboot cluster"],
  },
])("offers the actions fitting a cluster $name", (tc) => {
  renderActions(tc.cluster);

  for (const title of tc.shown) {
    expect(screen.getByTitle(title)).toBeInTheDocument();
  }

  for (const title of tc.hidden) {
    expect(screen.queryByTitle(title)).not.toBeInTheDocument();
  }
});

describe.each([
  {
    action: "Reboot cluster",
    button: "Reboot",
    inProgress: "",
    route: "POST /1.0/provisioning/clusters/c1/:reboot",
    confirmation:
      'Are you sure you want to perform a rolling reboot of the cluster "c1"?',
    success: "Cluster rolling reboot triggered",
    failure: "Error during cluster rolling reboot: TypeError: Failed to fetch",
  },
  {
    action: "Cancel cluster operation",
    button: "Cancel",
    inProgress: "rolling reboot",
    route: "POST /1.0/provisioning/clusters/c1/:cancel-operation",
    confirmation:
      'Are you sure that you want to cancel the ongoing operation of cluster "c1"?',
    success: "Cluster cancel operation triggered",
    failure:
      "Error during cluster operation cancel: TypeError: Failed to fetch",
  },
])("$action", (tc) => {
  const run = async (handler: Handler) => {
    const view = renderActions(cluster(tc.inProgress), {
      [tc.route]: handler,
    });

    await view.user.click(screen.getByTitle(tc.action));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(tc.confirmation)).toBeInTheDocument();

    await view.user.click(
      within(dialog).getByRole("button", { name: tc.button }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(view.api.calls(tc.route)).toHaveLength(1);

    return view;
  };

  test("succeeds", async () => {
    const { invalidate } = await run(ok());

    expect(screen.getByText(tc.success)).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["clusters"] });
  });

  test("fails with an API error", async () => {
    const { invalidate } = await run(apiError(400, "Cluster is busy"));

    expect(screen.getByText("Cluster is busy")).toBeInTheDocument();
    expect(invalidate).not.toHaveBeenCalled();
  });

  test("fails with a network error", async () => {
    await run(networkError());

    expect(screen.getByText(tc.failure)).toBeInTheDocument();
  });
});

test.each([
  { handler: ok(), message: "Cluster inventory resync triggered" },
  {
    handler: apiError(500, "Cluster unreachable"),
    message: "Cluster unreachable",
  },
  {
    handler: networkError(),
    message: "Error during cluster inventory sync: TypeError: Failed to fetch",
  },
])("resyncs the inventory: $message", async ({ handler, message }) => {
  const route = "POST /1.0/provisioning/clusters/c1/:resync-inventory";
  const { user, api } = renderActions(cluster(), { [route]: handler });

  await user.click(screen.getByTitle("Resync cluster inventory"));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(api.calls(route)).toHaveLength(1);
});

test("downloads the terraform data", async () => {
  const downloads = stubDownloads();
  const route =
    "GET /1.0/provisioning/clusters/c1/artifacts/terraform-configuration";
  const { user, api } = renderActions(cluster(), { [route]: ok() });

  await user.click(screen.getByTitle("Download terraform data"));

  await waitFor(() => {
    expect(downloads).toEqual(["c1-terraform-configuration.zip"]);
  });
  expect(api.calls(route)[0].url).toBe(
    "/1.0/provisioning/clusters/c1/artifacts/terraform-configuration?archive=zip",
  );
});

test("reports a failed terraform data download", async () => {
  const downloads = stubDownloads();
  const { user } = renderActions(cluster(), {
    "GET /1.0/provisioning/clusters/c1/artifacts/terraform-configuration":
      apiError(404, "Artifact not found"),
  });

  await user.click(screen.getByTitle("Download terraform data"));

  expect(
    await screen.findByText(
      "Error during terraform data downloading: Error: Artifact not found",
    ),
  ).toBeInTheDocument();
  expect(downloads).toEqual([]);
});

test("updates the certificate", async () => {
  const route = "PUT /1.0/provisioning/clusters/c1/certificate";
  const { user, api } = renderActions(cluster(), { [route]: ok() });

  await user.click(screen.getByTitle("Update certificate"));
  const dialog = screen.getByRole("dialog");
  await user.type(within(dialog).getByLabelText("Cluster certificate"), "CERT");
  await user.type(
    within(dialog).getByLabelText("Cluster certificate key"),
    "KEY",
  );
  await user.click(within(dialog).getByRole("button", { name: "Update" }));

  // The message lacks the cluster name, see the report of the coverage work.
  expect(await screen.findByText(/certificate updated/)).toBeInTheDocument();
  expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({
    cluster_certificate: "CERT",
    cluster_certificate_key: "KEY",
  });
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("reports a failed certificate update", async () => {
  const { user } = renderActions(cluster(), {
    "PUT /1.0/provisioning/clusters/c1/certificate": apiError(
      400,
      "Invalid certificate",
    ),
  });

  await user.click(screen.getByTitle("Update certificate"));
  await user.click(screen.getByRole("button", { name: "Update" }));

  expect(await screen.findByText("Invalid certificate")).toBeInTheDocument();
});

describe("bulk action", () => {
  const route = "POST /1.0/provisioning/clusters/c1/:bulk-update";

  const runBulkAction = async (handler: Handler, args: string) => {
    const view = renderActions(cluster(), { [route]: handler });

    await view.user.click(screen.getByTitle("Run a bulk action"));
    const dialog = screen.getByRole("dialog");
    await view.user.selectOptions(
      within(dialog).getByLabelText("Action"),
      "Add an iSCSI target",
    );
    await view.user.click(within(dialog).getByLabelText("Arguments"));
    await view.user.paste(args);
    await view.user.click(within(dialog).getByRole("button", { name: "Run" }));

    return view;
  };

  test("runs the action with the parsed arguments", async () => {
    const { api } = await runBulkAction(
      ok(),
      "target: iqn.2026-11.example:disk\nport: 3260",
    );

    expect(
      await screen.findByText(/Bulk action completed on cluster/),
    ).toBeInTheDocument();
    expect(JSON.parse(api.calls(route)[0].body ?? "")).toEqual({
      action: "add_iscsi_storage_target",
      arguments: { target: "iqn.2026-11.example:disk", port: 3260 },
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  test("rejects invalid YAML without a request", async () => {
    const { api } = await runBulkAction(ok(), "target: [unclosed");

    expect(
      await screen.findByText(/Error during YAML value parsing/),
    ).toBeInTheDocument();
    expect(api.calls(route)).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("keeps the dialog open, if the action fails", async () => {
    await runBulkAction(apiError(400, "Unknown target"), "target: x");

    expect(await screen.findByText("Unknown target")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
