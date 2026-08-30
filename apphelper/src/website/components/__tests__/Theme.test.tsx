import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GlobalStyleInterface } from "../../helpers";
import { Theme } from "../Theme";

const render = (globalStyles: Partial<GlobalStyleInterface>) =>
  renderToStaticMarkup(<Theme globalStyles={globalStyles as GlobalStyleInterface} />);

describe("Theme", () => {
  it("adds px to unitless spacing numbers stored by SpacingScaleEdit", () => {
    const html = render({ spacing: '{"xs":4,"sm":8,"md":16,"lg":24,"xl":32,"xxl":48}' });

    expect(html).toContain("--spacing-md: 16px;");
    expect(html).toContain("--spacing-xxl: 48px;");
    expect(html).not.toContain("--spacing-md: 16;");
  });

  it("passes through values that already carry a unit", () => {
    expect(render({ spacing: '{"md":"1.5rem"}' })).toContain("--spacing-md: 1.5rem;");
  });

  it("falls back to the default scale", () => {
    const html = render({ spacing: "{}" });

    expect(html).toContain("--spacing-xs: 4px;");
    expect(html).toContain("--spacing-sm: 8px;");
    expect(html).toContain("--spacing-md: 16px;");
    expect(html).toContain("--spacing-lg: 24px;");
    expect(html).toContain("--spacing-xl: 32px;");
    expect(html).toContain("--spacing-xxl: 48px;");
  });

  it("emits custom CSS as a sibling of :root instead of nesting it", () => {
    const html = render({ customCss: ".hero { color: red; }" });

    expect(html).toMatch(/:root \{[^}]*\}\s*\.hero \{ color: red; \}/);
  });
});
