import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Loading } from "../Loading";

describe("Loading dark-theme color", () => {
  const originalClass = document.body.className;

  afterEach(() => {
    document.body.className = originalClass;
  });

  it("defaults to dark text on a light body", () => {
    document.body.classList.remove("dark-theme");
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toMatch(/style="[^"]*color:\s*#222/);
    expect(html).not.toMatch(/style="[^"]*color:\s*#fff/);
  });

  it("defaults to white text when body has dark-theme", () => {
    document.body.classList.add("dark-theme");
    const html = renderToStaticMarkup(<Loading />);
    expect(html).toMatch(/style="[^"]*color:\s*#fff/);
  });

  it("keeps an explicit color prop on dark-theme", () => {
    document.body.classList.add("dark-theme");
    const html = renderToStaticMarkup(<Loading color="#0f0" />);
    expect(html).toMatch(/style="[^"]*color:\s*#0f0/);
    expect(html).not.toMatch(/style="[^"]*color:\s*#fff/);
  });
});
