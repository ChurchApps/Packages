import { test } from "node:test";
import assert from "node:assert/strict";

import { B1ChurchProvider } from "../src/providers/b1Church/B1ChurchProvider";

const iso = (daysFromToday: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${key}T00:00:00.000Z`;
};

test("browse plan list keeps yesterday's plan regardless of timezone", async t => {
  const plans = [
    { id: "old", name: "Two Weeks Ago", serviceDate: iso(-14), churchId: "c1" },
    { id: "yesterday", name: "Yesterday", serviceDate: iso(-1), churchId: "c1" },
    { id: "future", name: "Next Week", serviceDate: iso(7), churchId: "c1" }
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: true, json: async () => plans })) as any;
  t.after(() => { globalThis.fetch = originalFetch; });

  const items = await new B1ChurchProvider().browse("/ministries/m1/pt1", null);
  assert.deepEqual(items.map(i => i.id), ["yesterday", "future"]);
});
