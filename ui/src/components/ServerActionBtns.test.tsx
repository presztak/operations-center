import { FC } from "react";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import ServerEvacuateBtn from "components/ServerEvacuateBtn";
import ServerPoweroffBtn from "components/ServerPoweroffBtn";
import ServerRestoreBtn from "components/ServerRestoreBtn";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { expectToast, renderWithProviders } from "test/render";
import { Server } from "types/server";

// The confirmation buttons share their behaviour, only the action differs.
const buttons: {
  name: string;
  Button: FC<{ server: Server }>;
  title: string;
  confirm: string;
  action: string;
  success: string;
  failure: string;
}[] = [
  {
    name: "power off",
    Button: ServerPoweroffBtn,
    title: "Power off server",
    confirm: "Power off",
    action: "poweroff",
    success: "Server poweroff triggered",
    failure: "Error during server poweroff",
  },
  {
    name: "evacuate",
    Button: ServerEvacuateBtn,
    title: "Evacuate server",
    confirm: "Evacuate",
    action: "evacuate",
    success: "Server evacuate triggered",
    failure: "Error during server evacuate",
  },
  {
    name: "restore",
    Button: ServerRestoreBtn,
    title: "Restore server",
    confirm: "Restore",
    action: "restore",
    success: "Server restore triggered",
    failure: "Error during server restore",
  },
];

const server = { name: "server01" } as Server;

describe.each(buttons)("$name", (b) => {
  const route = `POST /1.0/provisioning/servers/server01/system/:${b.action}`;

  const run = async (handler: Handler) => {
    const api = mockFetch({ [route]: handler });
    const view = renderWithProviders(<b.Button server={server} />);
    const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

    await view.user.click(screen.getByTitle(b.title));
    expect(screen.getByText(/server "server01"\?/)).toBeInTheDocument();
    await view.user.click(screen.getByRole("button", { name: b.confirm }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: b.confirm }),
      ).not.toBeInTheDocument();
    });
    expect(api.calls(route)).toHaveLength(1);

    return invalidate;
  };

  test("succeeds", async () => {
    const invalidate = await run(ok());

    await expectToast(b.success, "success");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["servers"] });
  });

  test("shows the error of the API", async () => {
    const invalidate = await run(apiError(400, "Server is busy"));

    await expectToast("Server is busy", "error");
    expect(invalidate).not.toHaveBeenCalled();
  });

  test("shows a network error", async () => {
    await run(networkError());

    await expectToast(new RegExp(b.failure), "error");
  });

  test("closes without a request when dismissed", async () => {
    const api = mockFetch({});
    const { user } = renderWithProviders(<b.Button server={server} />);

    await user.click(screen.getByTitle(b.title));
    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: b.confirm }),
      ).not.toBeInTheDocument();
    });
    expect(api.calls()).toHaveLength(0);
  });
});
