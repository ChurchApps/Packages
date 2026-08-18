import { test } from "node:test";
import assert from "node:assert/strict";

import { EventHelper } from "../src/EventHelper";
import type { EventInterface } from "../src/interfaces";

await EventHelper.ensureInitialized();

const localKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

test("getFullRRule includes the selected start date for weekly rules without BYDAY", () => {
  // Thursday Jan 8, 2026 — the reporter's "1st date selected"
  const start = new Date(2026, 0, 8, 18, 30, 0);
  const event: EventInterface = {
    start,
    end: new Date(2026, 0, 8, 20, 0, 0),
    recurrenceRule: "FREQ=WEEKLY;INTERVAL=1;UNTIL=20260301T235959Z"
  };
  const range = EventHelper.getRange(event, new Date(2026, 0, 1), new Date(2026, 0, 31, 23, 59, 59));
  const dates = range.map(localKey);
  assert.ok(dates.includes("2026-1-8"), `first occurrence missing, got ${dates.join(",")}`);
  for (const d of range) assert.equal(d.getDay(), 4, "weekly series should stay on Thursday");
});

test("getFullRRule still honors an explicit BYDAY", () => {
  const start = new Date(2026, 6, 1, 18, 30, 0); // Wednesday
  const event: EventInterface = {
    start,
    end: new Date(2026, 6, 1, 20, 0, 0),
    recurrenceRule: "FREQ=WEEKLY;BYDAY=WE"
  };
  const range = EventHelper.getRange(event, new Date(2026, 6, 1), new Date(2026, 6, 31, 23, 59, 59));
  assert.ok(range.length >= 4);
  for (const d of range) assert.equal(d.getDay(), 3);
});

test("removeExcludeDates drops an occurrence matched by calendar date, not exact ISO timestamp", () => {
  const start = new Date(2026, 0, 8, 18, 30, 0);
  const events: EventInterface[] = [
    { id: "keep", start: new Date(2026, 0, 15, 18, 30, 0), exceptionDates: [new Date(2026, 0, 8, 12, 0, 0)] as any },
    { id: "drop", start, exceptionDates: [new Date(2026, 0, 8, 12, 0, 0)] as any }
  ];
  EventHelper.removeExcludeDates(events);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, "keep");
});

test("removeExcludeDates matches mysql-style datetime strings that would fail ISO equality", () => {
  const start = new Date(2026, 0, 8, 18, 30, 0);
  const events: EventInterface[] = [
    { id: "drop", start, exceptionDates: ["2026-01-08 12:00:00"] as any }
  ];
  EventHelper.removeExcludeDates(events);
  assert.equal(events.length, 0);
});
