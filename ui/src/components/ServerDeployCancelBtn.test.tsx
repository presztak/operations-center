import { screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import ServerDeployCancelBtn from "components/ServerDeployCancelBtn";
import { apiError, Handler, mockFetch, ok } from "test/fetch";
import { expectToast, renderWithProviders } from "test/render";
import { Server } from "types/server";

const cancel = "POST /1.0/provisioning/servers/server01/:cancel-deploy";

const cancelWith = async (handler: Handler, skipCleanup: boolean) => {
  const api = mockFetch({ [cancel]: handler });
  const { user } = renderWithProviders(
    <ServerDeployCancelBtn server={{ name: "server01" } as Server} />,
  );

  await user.click(screen.getByTitle("Cancel deployment"));
  if (skipCleanup) {
    await user.click(screen.getByLabelText("Skip the clean up"));
  }

  await user.click(screen.getByRole("button", { name: "Cancel deployment" }));

  return api;
};

test.each([false, true])(
  "cancels the deployment, skipping the clean up: %s",
  async (skipCleanup) => {
    const api = await cancelWith(ok(), skipCleanup);

    await expectToast("Cancellation of the deployment triggered", "success");
    expect(api.calls(cancel)[0].body).toBe(
      JSON.stringify({ skip_cleanup: skipCleanup }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  },
);

test("keeps the dialog open, if the cancellation fails", async () => {
  await cancelWith(apiError(400, "Nothing to cancel"), false);

  await expectToast(
    "Error during deployment cancellation: APIError: Nothing to cancel",
    "error",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
