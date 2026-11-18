import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import SecondaryIncusSelect from "components/SecondaryIncusSelect";

// The checkboxes share one id, so they are toggled directly instead of through their labels.
test("toggles the secondary applications", async () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  render(
    <SecondaryIncusSelect value={["incus-ceph"]} onChange={handleChange} />,
  );

  const [ceph, linstor] = screen.getAllByRole("checkbox");
  expect(screen.getByText("Ceph")).toBeInTheDocument();
  expect(screen.getByText("Linstor")).toBeInTheDocument();
  expect(ceph).toBeChecked();
  expect(linstor).not.toBeChecked();

  await user.click(linstor);
  expect(handleChange).toHaveBeenLastCalledWith("incus-linstor", true);

  await user.click(ceph);
  expect(handleChange).toHaveBeenLastCalledWith("incus-ceph", false);
});
