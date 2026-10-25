import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../forms", () => ({ FormSubmissionEdit: () => <div data-testid="form-questions" /> }));

import { ApiHelper } from "@churchapps/helpers";
import { FormElement } from "../FormElement";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const mount = async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<FormElement element={{ id: "el1", elementType: "form", answers: { formId: "frm1" } }} church={{ id: "CHU00000001", name: "Grace Community Church" }} />);
  });
  return container;
};

afterEach(async () => {
  if (root) await act(async () => { root!.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

describe("FormElement header photo", () => {
  it("shows the form's photo above the questions", async () => {
    vi.spyOn(ApiHelper, "get").mockResolvedValue({ id: "frm1", name: "Summer Camp", contentType: "form", photoUrl: "https://cdn.example.com/camp.jpg" });
    const el = await mount();
    const img = el.querySelector('[data-testid="form-header-photo"]') as HTMLImageElement | null;
    expect(img?.getAttribute("src")).toBe("https://cdn.example.com/camp.jpg");
    expect(img?.getAttribute("alt")).toBe("Summer Camp");
    expect(img!.compareDocumentPosition(el.querySelector('[data-testid="form-questions"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders no photo when the form has none", async () => {
    vi.spyOn(ApiHelper, "get").mockResolvedValue({ id: "frm1", name: "Connect Card", contentType: "form" });
    const el = await mount();
    expect(el.querySelector('[data-testid="form-questions"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="form-header-photo"]')).toBeNull();
  });
});
