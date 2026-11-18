import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import ServerSelect from "components/ServerSelect";
import { Server } from "types/server";

const servers = ["server01", "server02", "server03"].map(
  (name) => ({ name }) as Server,
);

test("reports the selected servers", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(
    <ServerSelect
      servers={servers}
      selected={["server01"]}
      disabled={false}
      onChange={handleChange}
    />,
  );

  await user.selectOptions(screen.getByRole("listbox"), "server03");

  expect(handleChange).toHaveBeenLastCalledWith(["server01", "server03"]);
});

test("selects all servers with Ctrl+A", () => {
  const handleChange = vi.fn();
  render(
    <ServerSelect
      servers={servers}
      selected={[]}
      disabled={false}
      onChange={handleChange}
    />,
  );

  fireEvent.keyDown(screen.getByRole("listbox"), { key: "a", ctrlKey: true });

  expect(handleChange).toHaveBeenCalledExactlyOnceWith([
    "server01",
    "server02",
    "server03",
  ]);
});

test("can be disabled", () => {
  render(
    <ServerSelect
      servers={servers}
      selected={[]}
      disabled={true}
      onChange={() => {}}
    />,
  );

  expect(screen.getByRole("listbox")).toBeDisabled();
});
