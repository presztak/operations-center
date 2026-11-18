import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import ArchSelect from "components/ArchSelect";

test("offers the architectures with a label for none", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(<ArchSelect value="" onChange={handleChange} emptyLabel="Any" />);

  // The label is not associated with the select.
  const select = screen.getByRole("combobox");
  expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Any",
    "x86_64",
    "aarch64",
  ]);

  await user.selectOptions(select, "aarch64");

  expect(handleChange).toHaveBeenCalledExactlyOnceWith("aarch64");
});
