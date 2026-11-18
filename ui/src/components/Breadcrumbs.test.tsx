import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Breadcrumbs from "components/Breadcrumbs";
import { renderWithProviders } from "test/render";

// Text of the breadcrumbs, links in brackets.
const crumbs = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll(".breadcrumb-link, .breadcrumb-text"),
  ).map((e) =>
    e.tagName == "A"
      ? `[${e.textContent}](${e.getAttribute("href")})`
      : e.textContent,
  );

test.each([
  {
    route: "/ui/provisioning/servers-view",
    want: ["Servers"],
  },
  {
    route: "/ui/provisioning/servers/server01/bmc",
    want: [
      "[Servers](/ui/provisioning/servers-view)",
      "[server01](/ui/provisioning/servers/server01)",
      "BMC",
    ],
  },
  {
    route: "/ui/os/system/fallback-listener",
    want: ["[OS](/ui/os)", "[System](/ui/os/system)", "Fallback listener"],
  },
  {
    route: "/ui/os/services/ntp",
    want: ["[OS](/ui/os)", "[Services](/ui/os/services)", "ntp"],
  },
  {
    route: "/ui/provisioning/cluster-templates/tmpl01",
    want: [
      "[Cluster templates](/ui/provisioning/clusters-view/templates)",
      "tmpl01",
    ],
  },
])("breadcrumbs of $route", ({ route, want }) => {
  const { container } = renderWithProviders(<Breadcrumbs />, { route });

  expect(crumbs(container)).toEqual(want);
});

test("unknown parts of the path are omitted", () => {
  renderWithProviders(<Breadcrumbs />, { route: "/ui/unknown/os" });

  expect(
    screen.getByRole("navigation", { name: "breadcrumb" }),
  ).toHaveTextContent("");
});
