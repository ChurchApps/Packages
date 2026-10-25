import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SocialIconsElement } from "../SocialIconsElement";

const render = (answers: Record<string, unknown>) => {
  const div = document.createElement("div");
  div.innerHTML = renderToStaticMarkup(<SocialIconsElement element={{ id: "el1", elementType: "socialIcons", answers }} />);
  return div;
};

describe("SocialIconsElement", () => {
  it("links WhatsApp when a WhatsApp URL is set", () => {
    const el = render({ facebook: "https://facebook.com/gracechurch", whatsapp: "https://wa.me/15551234567" });
    const links = Array.from(el.querySelectorAll("a"));
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual(["Facebook", "WhatsApp"]);
    expect(links[1].getAttribute("href")).toBe("https://wa.me/15551234567");
  });

  it("leaves WhatsApp out when no URL is set", () => {
    const el = render({ facebook: "https://facebook.com/gracechurch" });
    expect(el.querySelector('a[aria-label="WhatsApp"]')).toBeNull();
  });
});
