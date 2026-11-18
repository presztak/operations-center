import { screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ImageSourceActions from "components/ImageSourceActions";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const source = {
  name: "upstream",
  url: "https://images.example.com",
  filter_expression: "true",
  last_updated: "",
};

const refresh = "POST /1.0/images/incus/sources/upstream/:refresh";
const remove = "DELETE /1.0/images/incus/sources/upstream";

const renderActions = (routes: Record<string, Handler>) => {
  const api = mockFetch(routes);
  const view = renderWithProviders(<ImageSourceActions source={source} />);
  const invalidate = vi.spyOn(view.queryClient, "invalidateQueries");

  return { ...view, api, invalidate };
};

test.each([
  {
    handler: ok(),
    message: "Refresh of image source upstream triggered",
    invalidated: true,
  },
  {
    handler: apiError(400, "Source is unreachable"),
    message: "Source is unreachable",
    invalidated: false,
  },
  {
    handler: networkError(),
    message: "Error during image source refresh: TypeError: Failed to fetch",
    invalidated: false,
  },
])("refresh shows $message", async ({ handler, message, invalidated }) => {
  const { user, api, invalidate } = renderActions({ [refresh]: handler });

  await user.click(screen.getByTitle("Refresh"));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(api.calls(refresh)).toHaveLength(1);
  if (invalidated) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["image-sources"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["incus-images"] });
  } else {
    expect(invalidate).not.toHaveBeenCalled();
  }
});

test.each([
  {
    handler: ok(),
    message: "Image source upstream deleted",
    invalidated: true,
  },
  {
    handler: apiError(409, "Source is in use"),
    message: "Source is in use",
    invalidated: false,
  },
  {
    handler: networkError(),
    message: "Error during image source deletion: TypeError: Failed to fetch",
    invalidated: false,
  },
])("delete shows $message", async ({ handler, message, invalidated }) => {
  const { user, api, invalidate } = renderActions({ [remove]: handler });

  await user.click(screen.getByTitle("Delete"));
  expect(
    screen.getByText(/delete the image source "upstream"/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(api.calls(remove)).toHaveLength(1);
  if (invalidated) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["image-sources"] });
  } else {
    expect(invalidate).not.toHaveBeenCalled();
  }
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

test("cancelling the delete sends no request", async () => {
  const { user, api } = renderActions({});

  await user.click(screen.getByTitle("Delete"));
  await user.click(screen.getByRole("button", { name: "Close" }));

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  expect(api.calls()).toHaveLength(0);
});
