import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GroupInterface } from "@churchapps/helpers";
import GroupCard from "../GroupCard";

describe("GroupCard", () => {
  it("links to the group detail route B1App actually serves", () => {
    const group = { id: "g1", name: "Main Service", slug: "main-service" } as GroupInterface;

    const html = renderToStaticMarkup(<GroupCard group={group} />);

    expect(html).toContain('href="/mobile/groups/main-service"');
  });
});
