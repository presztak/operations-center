import { screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import OSAction from "components/OSAction";
import { renderWithProviders } from "test/render";

const open = async (user: ReturnType<typeof renderWithProviders>["user"]) => {
  await user.click(screen.getByRole("button", { name: "Configure" }));
  return screen.findByRole("dialog");
};

test("data mode submits the parsed YAML", async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  const { user } = renderWithProviders(
    <OSAction
      label="Configure"
      mode="data"
      run={run}
      successMessage="Configured"
      confirmMessage="Applies immediately."
      defaultData="a: 1"
    />,
  );

  const dialog = await open(user);
  expect(within(dialog).getByText("Applies immediately.")).toBeVisible();
  const editor = within(dialog).getByPlaceholderText("key: value");
  expect(editor).toHaveValue("a: 1");

  await user.clear(editor);
  await user.type(editor, "b: two");
  await user.click(within(dialog).getByRole("button", { name: "Configure" }));

  expect(await screen.findByText("Configured")).toBeVisible();
  expect(run).toHaveBeenCalledExactlyOnceWith({ b: "two" });
});

test("data mode submits an empty object for empty YAML", async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  const { user } = renderWithProviders(
    <OSAction
      label="Configure"
      mode="data"
      run={run}
      successMessage="Configured"
    />,
  );

  const dialog = await open(user);
  await user.click(within(dialog).getByRole("button", { name: "Configure" }));

  expect(await screen.findByText("Configured")).toBeVisible();
  expect(run).toHaveBeenCalledExactlyOnceWith({});
});

test("data mode rejects invalid YAML", async () => {
  const run = vi.fn();
  const { user } = renderWithProviders(
    <OSAction
      label="Configure"
      mode="data"
      run={run}
      successMessage="Configured"
    />,
  );

  const dialog = await open(user);
  await user.click(within(dialog).getByPlaceholderText("key: value"));
  await user.paste("a: [");
  await user.click(within(dialog).getByRole("button", { name: "Configure" }));

  expect(
    await screen.findByText(/Error during YAML value parsing/),
  ).toBeVisible();
  expect(run).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toBeVisible();
});

test("fields mode uses the default values", async () => {
  const run = vi.fn().mockResolvedValue(undefined);
  const { user } = renderWithProviders(
    <OSAction
      label="Configure"
      mode="fields"
      variant="danger"
      submitLabel="Apply"
      confirmMessage="Careful."
      fields={[
        { name: "mode", label: "Mode", options: ["a", "b"], defaultValue: "b" },
        { name: "name", label: "Name", defaultValue: "x" },
        { name: "force", label: "Force", type: "checkbox" },
      ]}
      run={run}
      successMessage="Configured"
    />,
  );

  const dialog = await open(user);
  expect(within(dialog).getByText("Careful.")).toHaveClass("text-danger");
  await user.click(within(dialog).getByRole("button", { name: "Apply" }));

  expect(run).toHaveBeenCalledExactlyOnceWith({
    mode: "b",
    name: "x",
    force: false,
  });
});

test("the modal is closed without running", async () => {
  const run = vi.fn();
  const { user } = renderWithProviders(
    <OSAction
      label="Configure"
      mode="confirm"
      confirmMessage="Sure?"
      run={run}
      successMessage="Configured"
    />,
  );

  const dialog = await open(user);
  await user.click(within(dialog).getByRole("button", { name: "Close" }));

  expect(run).not.toHaveBeenCalled();
});
