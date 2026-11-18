import { screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import IncusImageActions from "components/IncusImageActions";
import { apiError, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";
import { IncusImage } from "types/image_incus";

const image = { name: "debian-12" } as IncusImage;
const remove = "DELETE /1.0/images/incus/debian-12";

test.each([
  { handler: ok(), message: "Image debian-12 deleted", invalidated: true },
  {
    handler: apiError(409, "Image is in use"),
    message: "Image is in use",
    invalidated: false,
  },
  {
    handler: networkError(),
    message: "Error during image deletion: TypeError: Failed to fetch",
    invalidated: false,
  },
])("delete shows $message", async ({ handler, message, invalidated }) => {
  const api = mockFetch({ [remove]: handler });
  const { user, queryClient } = renderWithProviders(
    <IncusImageActions image={image} />,
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");

  await user.click(screen.getByTitle("Delete"));
  expect(screen.getByText(/delete the image "debian-12"/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(api.calls(remove)).toHaveLength(1);
  if (invalidated) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
  } else {
    expect(invalidate).not.toHaveBeenCalled();
  }
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
