import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { expect, test } from "vitest";
import Channel from "pages/Channel";
import { apiError, mockFetch, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const LocationDisplay = () => (
  <div data-testid="location">{useLocation().pathname}</div>
);

const channel = {
  name: "stable",
  description: "Stable releases",
  last_updated: "2026-11-10T12:00:00",
};

const changelog = {
  current_version: "202611100000",
  prior_version: "202610010000",
  channel: "stable",
  components: {
    IncusOS: { added: ["Secure boot rotation"], removed: ["Old kernel"] },
    incus: { updated: ["Incus 6.18"] },
  },
};

const renderList = () =>
  renderWithProviders(
    <Routes>
      <Route
        path="/ui/provisioning/updates-view/channels"
        element={<Channel />}
      />
      <Route path="*" element={<LocationDisplay />} />
    </Routes>,
    { route: "/ui/provisioning/updates-view/channels" },
  );

test("lists the channels", async () => {
  mockFetch({
    "GET /1.0/provisioning/channels": ok([channel]),
    "GET /1.0/provisioning/channels/stable/changelog": ok([]),
  });
  renderList();

  const link = await screen.findByText("stable");
  const row = link.closest("tr")!;
  expect(within(row).getByText("Stable releases")).toBeInTheDocument();
  expect(within(row).getByText("2026-11-10 12:00")).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/ui/provisioning/channels/stable");
});

test("reports a failure to load the channels", async () => {
  mockFetch({
    "GET /1.0/provisioning/channels": apiError(500, "Database down"),
  });
  renderList();

  expect(
    await screen.findByText("Error while loading channels: Database down"),
  ).toBeInTheDocument();
});

test("navigates to the channel creation", async () => {
  mockFetch({ "GET /1.0/provisioning/channels": ok([]) });
  const { user } = renderList();

  await user.click(
    await screen.findByRole("button", { name: "Create channel" }),
  );

  expect(screen.getByTestId("location")).toHaveTextContent(
    "/ui/provisioning/channels/create",
  );
});

test("shows the changelog of a channel", async () => {
  mockFetch({
    "GET /1.0/provisioning/channels": ok([channel]),
    "GET /1.0/provisioning/channels/stable/changelog": ok([changelog]),
  });
  const { user } = renderList();

  await user.click(await screen.findByTitle("Changelog"));
  const dialog = await screen.findByRole("dialog");

  expect(within(dialog).getByText("Version: 202611100000")).toBeInTheDocument();
  expect(within(dialog).getByText("IncusOS")).toBeInTheDocument();
  expect(within(dialog).getByText("incus")).toBeInTheDocument();

  // A component expands on click and lists its changes by kind.
  await user.click(within(dialog).getByText("IncusOS"));
  const card = within(within(dialog).getByText("IncusOS").closest(".card")!);
  expect(card.getByText("Added")).toBeInTheDocument();
  expect(card.getByText("Secure boot rotation")).toBeInTheDocument();
  expect(card.getByText("Removed")).toBeInTheDocument();
  expect(card.getByText("Old kernel")).toBeInTheDocument();
  expect(card.queryByText("Updated")).not.toBeInTheDocument();
  await waitFor(() => {
    expect(card.getByText("Added").closest(".collapse")).toHaveClass("show");
  });
});
