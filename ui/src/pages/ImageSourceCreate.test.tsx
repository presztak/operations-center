import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { expect, test } from "vitest";
import ImageSourceCreate from "pages/ImageSourceCreate";
import { apiError, Handler, mockFetch, networkError, ok } from "test/fetch";
import { renderWithProviders } from "test/render";

const create = "POST /1.0/images/incus/sources";

const fillAndSubmit = async (handler: Handler) => {
  const api = mockFetch({ [create]: handler });
  const view = renderWithProviders(
    <Routes>
      <Route path="/ui/images/sources/create" element={<ImageSourceCreate />} />
      <Route path="/ui/images-view/sources" element={<div>Sources page</div>} />
    </Routes>,
    { route: "/ui/images/sources/create" },
  );

  expect(screen.getByLabelText("Name")).toBeEnabled();
  await view.user.type(screen.getByLabelText("Name"), "upstream");
  await view.user.type(
    screen.getByLabelText("URL"),
    "https://images.example.com",
  );
  await view.user.type(screen.getByLabelText("Filter expression"), "true");
  await view.user.click(screen.getByRole("button", { name: "Submit" }));

  return { ...view, api };
};

test("creates a source and returns to the list", async () => {
  const { api } = await fillAndSubmit(ok());

  expect(await screen.findByText("Image source created")).toBeInTheDocument();
  expect(screen.getByText("Sources page")).toBeInTheDocument();
  expect(JSON.parse(api.calls(create)[0].body ?? "")).toEqual({
    name: "upstream",
    url: "https://images.example.com",
    filter_expression: "true",
    last_updated: "",
  });
});

test.each([
  { handler: apiError(400, "Invalid URL"), message: "Invalid URL" },
  {
    handler: networkError(),
    message: "Error during image source creation: TypeError: Failed to fetch",
  },
])(
  "stays on the form, if creating fails: $message",
  async ({ handler, message }) => {
    await fillAndSubmit(handler);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText("Sources page")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("upstream");
  },
);
