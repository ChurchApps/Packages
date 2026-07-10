import { test } from "node:test";
import assert from "node:assert/strict";

import { DateHelper } from "../src/DateHelper";

test("toDate parses YYYY-MM-DD as local noon, avoiding day-shift from UTC conversion", () => {
  const d = DateHelper.toDate("2026-03-15");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 12);
});

test("addDays adds/subtracts calendar days without mutating the input", () => {
  const start = new Date(2026, 0, 31);
  const forward = DateHelper.addDays(start, 1);
  assert.equal(forward.getMonth(), 1);
  assert.equal(forward.getDate(), 1);
  assert.equal(start.getMonth(), 0, "original date must not be mutated");

  const back = DateHelper.addDays(new Date(2026, 2, 1), -1);
  assert.equal(back.getMonth(), 1);
  assert.equal(back.getDate(), 28);
});

test("prettyDate/prettyDateTime/prettyTime return empty string for null/undefined", () => {
  assert.equal(DateHelper.prettyDate(null as unknown as Date), "");
  assert.equal(DateHelper.prettyDateTime(undefined as unknown as Date), "");
  assert.equal(DateHelper.prettyTime(null as unknown as Date), "");
});

test("prettyDate formats using local month/day/year (matches dayjs format contract)", () => {
  const d = new Date(2026, 6, 4); // July 4, 2026, local
  assert.equal(DateHelper.prettyDate(d), "Jul 4, 2026");
});

test("getWeekSunday returns the Sunday that begins the given ISO-ish week of the year", () => {
  const week1 = DateHelper.getWeekSunday(2026, 1);
  assert.equal(week1.getDay(), 0);
  assert.equal(week1.getFullYear(), 2026);

  const week2 = DateHelper.getWeekSunday(2026, 2);
  assert.equal((week2.getTime() - week1.getTime()) / (1000 * 60 * 60 * 24), 7);
});

test("getNextSunday is exactly 7 days after getLastSunday", () => {
  const last = DateHelper.getLastSunday();
  const next = DateHelper.getNextSunday();
  assert.equal(last.getDay(), 0);
  assert.equal(next.getDay(), 0);
  assert.equal((next.getTime() - last.getTime()) / (1000 * 60 * 60 * 24), 7);
});

test("formatHtml5Date passes through YYYY-MM-DD strings and extracts the date part of ISO strings", () => {
  assert.equal(DateHelper.formatHtml5Date("2026-05-09"), "2026-05-09");
  assert.equal(DateHelper.formatHtml5Date("2026-05-09T10:15:00.000Z"), "2026-05-09");
  assert.equal(DateHelper.formatHtml5Date(null), "");
  assert.equal(DateHelper.formatHtml5Date(undefined), "");
});

test("formatHtml5Date formats a Date object using its local year/month/day", () => {
  const d = new Date(2026, 8, 3); // Sep 3, 2026, local
  const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  assert.equal(DateHelper.formatHtml5Date(d), expected);
});

test("toMysqlDateOnly extracts the date portion from a string and local y/m/d from a Date", () => {
  assert.equal(DateHelper.toMysqlDateOnly("2026-05-09T10:15:00.000Z"), "2026-05-09");
  assert.equal(DateHelper.toMysqlDateOnly(null), null);
  const d = new Date(2026, 11, 25);
  const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  assert.equal(DateHelper.toMysqlDateOnly(d), expected);
});

test("formatHtml5Time zero-pads local hours/minutes/seconds", () => {
  const d = new Date(2026, 0, 1, 4, 5, 6);
  assert.equal(DateHelper.formatHtml5Time(d), "04:05:06");
  assert.equal(DateHelper.formatHtml5Time(null as unknown as Date), "");
});

test("getShortDate builds M/D/YYYY from local date parts", () => {
  const d = new Date(2026, 0, 9);
  assert.equal(DateHelper.getShortDate(d), "1/9/2026");
});

test("getDisplayDuration buckets elapsed time into s/m/h/d with singular forms", () => {
  const now = Date.now();
  assert.equal(DateHelper.getDisplayDuration(new Date(now - 1000)), "1s");
  assert.equal(DateHelper.getDisplayDuration(new Date(now - 90 * 1000)), "1m");
  assert.equal(DateHelper.getDisplayDuration(new Date(now - 2 * 3600 * 1000)), "2h");
  assert.equal(DateHelper.getDisplayDuration(new Date(now - 3 * 86400 * 1000)), "3d");
});

test("toMysqlDate formats a Date as 'YYYY-MM-DD HH:mm:ss' in local time (dayjs default) and undefined passes through", () => {
  const d = new Date(2026, 5, 1, 13, 30, 45);
  assert.equal(DateHelper.toMysqlDate(d), "2026-06-01 13:30:45");
  assert.equal(DateHelper.toMysqlDate(null as unknown as Date), undefined);
  assert.equal(DateHelper.toMysqlDate(undefined as unknown as Date), undefined);
});
