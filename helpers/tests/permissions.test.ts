import { test } from "node:test";
import assert from "node:assert/strict";

import { Permissions } from "../src/interfaces/Permissions";

test("membershipApi.people.viewNames matches the Api's View People Names Only permission", () => {
  assert.deepEqual(Permissions.membershipApi.people.viewNames, { api: "MembershipApi", contentType: "People", action: "View Names" });
});

test("givingApi.donations.enter matches the Api's Enter Donations permission", () => {
  assert.deepEqual(Permissions.givingApi.donations.enter, { api: "GivingApi", contentType: "Donations", action: "Enter" });
});
