import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import BootSecuritySelect from "components/BootSecuritySelect";
import { BootSecurityType } from "types/token";

const values: BootSecurityType[] = ["optimal", "no_tpm", "no_secure_boot"];

// The radios share one id, so only the first is reachable through its label.
test.each(values.map((value, index) => ({ value, index })))(
  "selects $value",
  async ({ value, index }) => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const other: BootSecurityType = value == "optimal" ? "no_tpm" : "optimal";
    const { rerender } = render(
      <BootSecuritySelect value={other} onChange={handleChange} />,
    );

    await user.click(screen.getAllByRole("radio")[index]);
    expect(handleChange).toHaveBeenCalledExactlyOnceWith(value);

    rerender(<BootSecuritySelect value={value} onChange={handleChange} />);
    expect(
      screen.getAllByRole("radio").map((r) => (r as HTMLInputElement).checked),
    ).toEqual(values.map((v) => v == value));
  },
);

test("labels the options", () => {
  render(<BootSecuritySelect value="optimal" onChange={vi.fn()} />);

  expect(
    screen.getByText("Optimal boot security (UEFI Secure Boot & TPM 2.0)"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Degraded boot security (no TPM 2.0 module)"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Degraded boot security (no Secure Boot)"),
  ).toBeInTheDocument();
});
