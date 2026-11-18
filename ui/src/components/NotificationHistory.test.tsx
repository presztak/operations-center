import { screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import NotificationHistory from "components/NotificationHistory";
import { useNotification } from "context/notificationContext";
import { renderWithProviders } from "test/render";

const Notify = () => {
  const { notify } = useNotification();

  return (
    <>
      <button onClick={() => notify.error("Disk full")}>error</button>
      <button onClick={() => notify.success("Saved")}>success</button>
    </>
  );
};

test("lists the notifications and counts the problems", async () => {
  const { user } = renderWithProviders(
    <>
      <Notify />
      <NotificationHistory />
    </>,
  );

  await user.click(screen.getByRole("button", { name: /Notifications/ }));
  const panel = await screen.findByRole("dialog");
  expect(within(panel).getByText("No notifications")).toBeVisible();
  await user.click(within(panel).getByRole("button", { name: "Close" }));

  await user.click(screen.getByRole("button", { name: "error" }));
  await user.click(screen.getByRole("button", { name: "success" }));

  // Only the error counts as a problem.
  expect(
    screen.getByRole("button", { name: /Notifications/ }),
  ).toHaveTextContent("Notifications 1");

  await user.click(screen.getByRole("button", { name: /Notifications/ }));
  const history = await screen.findByRole("dialog");
  expect(within(history).getByText("Disk full")).toBeVisible();
  expect(within(history).getByText("Saved")).toBeVisible();

  await user.click(within(history).getByRole("button", { name: "Clear all" }));
  expect(within(history).getByText("No notifications")).toBeVisible();
});
