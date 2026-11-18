import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import ImageTypeSelect from "components/ImageTypeSelect";

// The radios share one id, so they are selected directly instead of through their labels.
test("selects the image type", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(<ImageTypeSelect value="iso" onChange={handleChange} />);

  const [iso, usb] = screen.getAllByRole("radio");
  expect(
    screen.getByText("ISO (for use with virtual CD-ROM drives)"),
  ).toBeInTheDocument();
  expect(iso).toBeChecked();
  expect(usb).not.toBeChecked();

  await user.click(usb);
  expect(handleChange).toHaveBeenLastCalledWith("raw");
});

test("selects ISO", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(<ImageTypeSelect value="raw" onChange={handleChange} />);

  const [iso, usb] = screen.getAllByRole("radio");
  expect(usb).toBeChecked();

  await user.click(iso);
  expect(handleChange).toHaveBeenLastCalledWith("iso");
});
