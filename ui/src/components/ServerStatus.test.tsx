import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ServerStatus from "components/ServerStatus";
import { Server } from "types/server";

const server = (
  detail: string,
  inMaintenance: number,
  trusted = true,
): Server =>
  ({
    server_status: "ready",
    server_status_detail: detail,
    system_state_is_trusted: trusted,
    version_data: { in_maintenance: inMaintenance },
  }) as Server;

test.each([
  { detail: "", inMaintenance: 0, want: "ready" },
  { detail: "", inMaintenance: 1, want: "ready (evacuating)" },
  { detail: "", inMaintenance: 2, want: "ready (evacuated)" },
  { detail: "", inMaintenance: 3, want: "ready (restoring)" },
  { detail: "updating", inMaintenance: 2, want: "ready (updating)" },
])(
  "shows $want for maintenance $inMaintenance",
  ({ detail, inMaintenance, want }) => {
    const { container } = render(
      <ServerStatus server={server(detail, inMaintenance)} />,
    );

    expect(container.textContent?.trim()).toBe(want);
    expect(
      screen.queryByTitle("Server has degraded boot security"),
    ).not.toBeInTheDocument();
  },
);

test("warns about degraded boot security", () => {
  render(<ServerStatus server={server("", 0, false)} />);

  expect(
    screen.getByTitle("Server has degraded boot security"),
  ).toBeInTheDocument();
});
