import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import RestoreModeSelect from "components/RestoreModeSelect";

// The label is not associated with the select.
test("selects the restore mode", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(<RestoreModeSelect value="" onChange={handleChange} />);

  const select = screen.getByRole("combobox");
  expect(screen.getByText("Restore Mode")).toBeInTheDocument();
  expect(select).toHaveDisplayValue("Bring back the instances");

  await user.selectOptions(select, "Only bring back the server");

  expect(handleChange).toHaveBeenCalledExactlyOnceWith("skip");
});

test("uses the given label and can be disabled", () => {
  render(
    <RestoreModeSelect value="skip" onChange={vi.fn()} label="Mode" disabled />,
  );

  expect(screen.getByText("Mode")).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(screen.getByRole("combobox")).toHaveDisplayValue(
    "Only bring back the server",
  );
});
