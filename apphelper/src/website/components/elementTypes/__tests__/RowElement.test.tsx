import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../Element", () => ({ Element: () => <div /> }));

import { RowElement } from "../RowElement";

const column = (id: string, answers: any) => ({ id, elementType: "column", answers, elements: [] as any[] });

const renderRow = (columns: any[]) => renderToStaticMarkup(
  <RowElement element={{ id: "row1", elementType: "row", elements: columns }} churchSettings={{}} textColor="dark" />
);

const mobileRule = (html: string, idx: number) => {
  const match = html.match(new RegExp(`@media \\(max-width:767.98px\\)\\{#el-row1 \\.rowColumn-${idx}\\{([^}]*)\\}`));
  return match?.[1] || "";
};

describe("RowElement phone widths", () => {
  it("stacks columns full width on phones when no phone width is set", () => {
    const html = renderRow([column("c1", { size: 4 }), column("c2", { size: 4 }), column("c3", { size: 4 })]);
    for (const idx of [0, 1, 2]) expect(mobileRule(html, idx)).toContain("width:calc(100% - 12px)");
  });

  it("keeps an explicit phone width", () => {
    const html = renderRow([column("c1", { size: 4, mobileSize: 6 }), column("c2", { size: 8, mobileSize: 6 })]);
    expect(mobileRule(html, 0)).toContain("width:calc(50% - 12px)");
    expect(mobileRule(html, 1)).toContain("width:calc(50% - 12px)");
  });
});
