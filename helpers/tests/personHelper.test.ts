import { test } from "node:test";
import assert from "node:assert/strict";

import { PersonHelper } from "../src/PersonHelper";

test("getDisplayName wraps a non-empty nickname in quotes, otherwise omits it", () => {
  assert.equal(PersonHelper.getDisplayName("John", "Smith", "Johnny"), 'John "Johnny" Smith');
  assert.equal(PersonHelper.getDisplayName("John", "Smith", ""), "John Smith");
  assert.equal(PersonHelper.getDisplayName("John", "Smith", null as unknown as string), "John Smith");
});

test("getDisplayNameFromPerson mirrors getDisplayName's nickname rule off person.name", () => {
  const withNick = { name: { first: "Jane", last: "Doe", nick: "JD" } };
  assert.equal(PersonHelper.getDisplayNameFromPerson(withNick), 'Jane "JD" Doe');
  const noNick = { name: { first: "Jane", last: "Doe", nick: "" } };
  assert.equal(PersonHelper.getDisplayNameFromPerson(noNick), "Jane Doe");
});

test("getAge computes whole years elapsed since the birthdate", () => {
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
  assert.equal(PersonHelper.getAge(tenYearsAgo), "10 years");
  assert.equal(PersonHelper.getAge(undefined as unknown as Date), "");
  assert.equal(PersonHelper.getAge(null as unknown as Date), "");
});

test("getBirthMonth returns the 1-indexed local month of the birthdate, or -1 when absent", () => {
  const bday = new Date(1990, 5, 15); // June, local
  assert.equal(PersonHelper.getBirthMonth(bday), bday.getMonth() + 1);
  assert.equal(PersonHelper.getBirthMonth(null as unknown as Date), -1);
});

test("addressToString joins address fields, only inserting a comma when both city and state are present", () => {
  const full = PersonHelper.addressToString({ address1: "123 Main St", city: "Springfield", state: "IL", zip: "62701" });
  assert.equal(full, "123 Main St  Springfield, IL 62701");

  const cityOnly = PersonHelper.addressToString({ city: "Springfield" });
  assert.equal(cityOnly, "  Springfield  ");

  const empty = PersonHelper.addressToString({});
  assert.equal(empty, "    ");
});

test("compareAddress reports true when the formatted addresses differ", () => {
  const a = { address1: "123 Main St", city: "Springfield", state: "IL", zip: "62701" };
  const b = { address1: "123 Main St", city: "Springfield", state: "IL", zip: "62701" };
  const c = { address1: "456 Elm St", city: "Springfield", state: "IL", zip: "62701" };
  assert.equal(PersonHelper.compareAddress(a, b), false);
  assert.equal(PersonHelper.compareAddress(a, c), true);
});

test("checkAddressAvailabilty is true only when the formatted address has non-whitespace content", () => {
  assert.equal(PersonHelper.checkAddressAvailabilty({ contactInfo: { city: "Springfield" } } as any), true);
  assert.equal(PersonHelper.checkAddressAvailabilty({ contactInfo: {} } as any), false);
});

test("getPhotoUrl falls back to the sample image when no photo is set, and passes through absolute/base64 photos", () => {
  assert.equal(PersonHelper.getPhotoUrl({} as any), "/images/sample-profile.png");
  assert.equal(PersonHelper.getPhotoUrl({ photo: "https://x/p.png" } as any), "https://x/p.png");
  const base64 = "data:image/png;base64,abc123";
  assert.equal(PersonHelper.getPhotoUrl({ photo: base64 } as any), base64);
});

test("getPhotoUrl prefixes a relative photo path with ContentRoot (empty by default, unconfigured in tests)", () => {
  assert.equal(PersonHelper.getPhotoUrl({ photo: "/membership/people/1.png" } as any), "/membership/people/1.png");
});

test("getPhotoPath returns a demo avatar URL for demo person ids, empty string otherwise, when not photoUpdated", () => {
  assert.equal(PersonHelper.getPhotoPath("ch1", { id: "PER00001234" }), "https://app.staging.b1.church/images/demo/avatars/PER00001234.svg");
  assert.equal(PersonHelper.getPhotoPath("ch1", { id: "abc123" }), "");
});

test("getPhotoPath builds a cache-busted church-scoped path when photoUpdated is set", () => {
  const updated = new Date(2026, 0, 1);
  const path = PersonHelper.getPhotoPath("ch1", { id: "p1", photoUpdated: updated });
  assert.equal(path, `/ch1/membership/people/p1.png?dt=${updated.getTime()}`);
});
