import { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import { fetchNetworkAddressSets } from "api/network_address_set";
import Image from "pages/Image";
import Instance from "pages/Instance";
import Network from "pages/Network";
import NetworkACL from "pages/NetworkACL";
import NetworkForward from "pages/NetworkForward";
import NetworkIntegration from "pages/NetworkIntegration";
import NetworkLoadBalancer from "pages/NetworkLoadBalancer";
import NetworkPeer from "pages/NetworkPeer";
import NetworkZone from "pages/NetworkZone";
import Profile from "pages/Profile";
import Project from "pages/Project";
import StorageBucket from "pages/StorageBucket";
import StoragePool from "pages/StoragePool";
import StorageVolume from "pages/StorageVolume";
import { apiError, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const item = {
  name: "obj01",
  cluster: "cluster01",
  project_name: "proj01",
  parent_name: "parent01",
  server: "server01",
  type: "custom",
  last_updated: "2026-11-18T09:05:07",
  object: {
    type: "container",
    driver: "zfs",
    fingerprint: "0123456789abcdef0123",
    properties: { description: "Debian 13" },
  },
};

const clusterURL = "https://cluster01.example.com:8443";

// Each page lists its inventory objects, the name links to the object in the Incus UI of its cluster.
const pages: {
  name: string;
  page: FC;
  kind: string;
  shown: string;
  // Path of the object in the Incus UI, null if the name is no link.
  incusPath: string | null;
}[] = [
  {
    name: "Image",
    page: Image,
    kind: "images",
    shown: "0123456789ab",
    incusPath: "/ui/project/proj01/images",
  },
  {
    name: "Instance",
    page: Instance,
    kind: "instances",
    shown: "obj01",
    incusPath: "/ui/project/proj01/instance/obj01",
  },
  {
    name: "Network",
    page: Network,
    kind: "networks",
    shown: "obj01",
    incusPath: "/ui/project/proj01/network/obj01",
  },
  {
    name: "NetworkACL",
    page: NetworkACL,
    kind: "network_acls",
    shown: "obj01",
    incusPath: "/ui/project/proj01/network-acl/obj01",
  },
  {
    name: "NetworkForward",
    page: NetworkForward,
    kind: "network_forwards",
    shown: "obj01",
    incusPath: "/ui/project/proj01/network/parent01/forwards",
  },
  {
    name: "NetworkIntegration",
    page: NetworkIntegration,
    kind: "network_integrations",
    shown: "obj01",
    incusPath: null,
  },
  {
    name: "NetworkLoadBalancer",
    page: NetworkLoadBalancer,
    kind: "network_load_balancers",
    shown: "obj01",
    incusPath: null,
  },
  {
    name: "NetworkPeer",
    page: NetworkPeer,
    kind: "network_peers",
    shown: "obj01",
    incusPath: null,
  },
  {
    name: "NetworkZone",
    page: NetworkZone,
    kind: "network_zones",
    shown: "obj01",
    incusPath: null,
  },
  {
    name: "Profile",
    page: Profile,
    kind: "profiles",
    shown: "obj01",
    incusPath: "/ui/project/proj01/profile/obj01",
  },
  {
    name: "Project",
    page: Project,
    kind: "projects",
    shown: "obj01",
    incusPath: "/ui/project/obj01/instances",
  },
  {
    name: "StorageBucket",
    page: StorageBucket,
    kind: "storage_buckets",
    shown: "obj01",
    incusPath: "/ui/project/proj01/storage-pools/parent01/buckets/obj01",
  },
  {
    name: "StoragePool",
    page: StoragePool,
    kind: "storage_pools",
    shown: "obj01",
    incusPath: "/ui/project/default/storage/pool/obj01",
  },
  {
    name: "StorageVolume",
    page: StorageVolume,
    kind: "storage_volumes",
    shown: "obj01",
    incusPath: "/ui/project/proj01/storage/pool/parent01/volumes/custom/obj01",
  },
];

const renderPage = (page: FC, kind: string, query = "") => {
  const Page = page;

  return renderWithProviders(
    <Routes>
      <Route path={`/ui/inventory/${kind}`} element={<Page />} />
    </Routes>,
    { route: `/ui/inventory/${kind}${query}` },
  );
};

test.each(pages)(
  "$name lists the objects with a link to Incus",
  async ({ page, kind, shown, incusPath }) => {
    mockFetch({
      [`GET /1.0/inventory/${kind}`]: ok([item]),
      "GET /1.0/provisioning/clusters": ok([
        { name: "cluster01", connection_url: clusterURL },
      ]),
      "GET /1.0/provisioning/servers": ok([]),
    });
    renderPage(page, kind);

    expect(await screen.findByText(shown)).toBeInTheDocument();

    if (incusPath) {
      await waitFor(() => {
        expect(screen.getByText(shown).closest("a")).toHaveAttribute(
          "href",
          clusterURL + incusPath,
        );
      });
    } else {
      expect(screen.getByText(shown).closest("a")).toBeNull();
    }

    expect(screen.getAllByText("2026-11-18 09:05").length).toBeGreaterThan(0);
  },
);

test.each(pages)(
  "$name searches with the filter of the URL",
  async ({ page, kind }) => {
    const api = mockFetch({
      [`GET /1.0/inventory/${kind}`]: ok([]),
      "GET /1.0/provisioning/clusters": ok([]),
      "GET /1.0/provisioning/servers": ok([]),
    });
    const { user } = renderPage(page, kind, "?filter=a");

    const search = screen.getByPlaceholderText("Search");
    expect(search).toHaveValue("a");

    await user.clear(search);
    await user.type(search, "  b {enter}");

    await waitFor(() => {
      expect(api.calls(`GET /1.0/inventory/${kind}`).map((c) => c.url)).toEqual(
        [
          `/1.0/inventory/${kind}?recursion=1&filter=a`,
          `/1.0/inventory/${kind}?recursion=1&filter=b`,
        ],
      );
    });
  },
);

test.each(pages)("$name shows a failed load", async ({ page, kind }) => {
  mockFetch({
    [`GET /1.0/inventory/${kind}`]: apiError(500, "Database down"),
    "GET /1.0/provisioning/clusters": ok([]),
    "GET /1.0/provisioning/servers": ok([]),
  });
  renderPage(page, kind);

  expect(await screen.findByText("Database down")).toBeInTheDocument();
  expect(screen.getByText(/Error while loading data/)).toBeInTheDocument();
});

test("the object name is no link without a cluster URL", async () => {
  mockFetch({
    "GET /1.0/inventory/instances": ok([item]),
    "GET /1.0/provisioning/clusters": ok([{ name: "cluster01" }]),
    "GET /1.0/provisioning/servers": ok([
      { name: "server01", cluster: "other", connection_url: clusterURL },
    ]),
  });
  renderPage(Instance, "instances");

  expect(await screen.findByText("obj01")).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText("proj01")).toBeInTheDocument();
  });
  expect(screen.getByText("obj01").closest("a")).toBeNull();
});

test("the server URL is used for a cluster without its own", async () => {
  mockFetch({
    "GET /1.0/inventory/instances": ok([item]),
    "GET /1.0/provisioning/clusters": ok([{ name: "cluster01" }]),
    "GET /1.0/provisioning/servers": ok([
      { name: "server01", cluster: "cluster01", connection_url: clusterURL },
    ]),
  });
  renderPage(Instance, "instances");

  await waitFor(() => {
    expect(screen.getByText("obj01").closest("a")).toHaveAttribute(
      "href",
      clusterURL + "/ui/project/proj01/instance/obj01",
    );
  });
});

test("fetchNetworkAddressSets passes the filter", async () => {
  const api = mockFetch({
    "GET /1.0/inventory/network_address_sets": ok([{ name: "set01" }]),
  });

  await expect(fetchNetworkAddressSets("name == 'set01'")).resolves.toEqual([
    { name: "set01" },
  ]);
  await expect(fetchNetworkAddressSets("")).resolves.toEqual([
    { name: "set01" },
  ]);
  expect(api.calls().map((c) => c.url)).toEqual([
    "/1.0/inventory/network_address_sets?recursion=1&filter=name%20==%20%27set01%27",
    "/1.0/inventory/network_address_sets?recursion=1",
  ]);
});
