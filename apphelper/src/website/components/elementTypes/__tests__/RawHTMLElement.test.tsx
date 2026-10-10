import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { RawHTMLElement } from "../RawHTMLElement";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("RawHTMLElement scripts", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    document.querySelectorAll("[id^='script-']").forEach((s) => s.remove());
    delete document.body.dataset.rawHtmlRan;
    delete document.body.dataset.rawJsRan;
  });

  const render = (answers: any) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<RawHTMLElement element={{ id: "el1", answers } as any} />));
  };

  it("runs scripts embedded in the HTML field", () => {
    render({ rawHTML: "<div id=\"votd\"></div><script>document.body.dataset.rawHtmlRan = \"1\";</script>" });
    expect(container!.querySelector("#votd")).not.toBeNull();
    expect(document.body.dataset.rawHtmlRan).toBe("1");
  });

  it("runs JavaScript pasted with its <script> wrapper", () => {
    render({ javascript: "<script>document.body.dataset.rawJsRan = \"1\";</script>" });
    expect(document.body.dataset.rawJsRan).toBe("1");
  });

  it("still runs bare JavaScript", () => {
    render({ javascript: "document.body.dataset.rawJsRan = \"1\";" });
    expect(document.body.dataset.rawJsRan).toBe("1");
  });
});
