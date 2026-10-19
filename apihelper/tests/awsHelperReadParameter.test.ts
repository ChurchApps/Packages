import { test } from "node:test";
import assert from "node:assert/strict";

import { AwsHelper } from "../src/helpers/AwsHelper";

// LessonsApi prod 2026-10-15 16:10Z: 394 cold starts in six seconds throttled SSM GetParameter.
// readParameter swallowed the error and returned "", so EnvironmentBase.connectionString was ""
// and every request on those containers died in parseConnectionString ("reading 'split'").
test("readParameter retries a throttled read and returns the value", async () => {
  let calls = 0;
  const send = async (_cmd: any) => {
    calls++;
    if (calls < 3) throw Object.assign(new Error("Rate exceeded"), { name: "ThrottlingException" });
    return { Parameter: { Value: "mysql://u:p@host:3306/db" } };
  };
  const value = await AwsHelper.readParameter("/prod/lessonsApi/connectionString", send, { attempts: 3, baseDelayMs: 1 });
  assert.equal(value, "mysql://u:p@host:3306/db");
  assert.equal(calls, 3);
});

test("readParameter gives up after the configured attempts and says which parameter failed", async () => {
  const errors: string[] = [];
  const original = console.error;
  console.error = (...args: any[]) => { errors.push(args.map(String).join(" ")); };
  try {
    const send = async (_cmd: any) => { throw Object.assign(new Error("Rate exceeded"), { name: "ThrottlingException" }); };
    const value = await AwsHelper.readParameter("/prod/lessonsApi/connectionString", send, { attempts: 2, baseDelayMs: 1 });
    assert.equal(value, "");
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\/prod\/lessonsApi\/connectionString/);
    assert.match(errors[0], /ThrottlingException/);
  } finally {
    console.error = original;
  }
});

test("readParameter returns the value on the first try without retrying", async () => {
  let calls = 0;
  const send = async (_cmd: any) => { calls++; return { Parameter: { Value: "secret" } }; };
  assert.equal(await AwsHelper.readParameter("/prod/x", send, { attempts: 3, baseDelayMs: 1 }), "secret");
  assert.equal(calls, 1);
});
