// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { LibraryView } from "@components/domain/library/LibraryView";

function renderWithRouter(ui: React.ReactElement) {
  const router = createMemoryRouter([{ path: "/", element: ui }], { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

describe("LibraryView", () => {
  it("renders the dropzone with browse files button accepting PDFs", () => {
    renderWithRouter(<LibraryView artifacts={[]} />);

    expect(screen.getByText(/drag & drop pdf/i)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("accept", "application/pdf");
  });

  it("renders sidebar with Library active and Chat/History disabled", () => {
    renderWithRouter(<LibraryView artifacts={[]} />);

    const libraryItem = screen.getByRole("link", { name: "Library" });
    expect(libraryItem).toBeInTheDocument();

    const chatItem = screen.getByRole("link", { name: "Chat" });
    expect(chatItem).toHaveAttribute("aria-disabled", "true");

    const historyItem = screen.getByRole("link", { name: "History" });
    expect(historyItem).toHaveAttribute("aria-disabled", "true");
  });

  it("renders Recent Documents header with empty state", () => {
    renderWithRouter(<LibraryView artifacts={[]} />);

    expect(screen.getByText(/recent documents/i)).toBeInTheDocument();
  });

  it("renders a disabled search input", () => {
    renderWithRouter(<LibraryView artifacts={[]} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeDisabled();
  });
});
