import { test } from "node:test";
import assert from "node:assert/strict";

import { EmailHelper } from "../src/helpers/EmailHelper";

async function renderBody(...args: any[]) {
  const sent: any[] = [];
  const original = EmailHelper.sendEmail;
  (EmailHelper as any).sendEmail = async (payload: any) => { sent.push(payload); };
  try {
    await (EmailHelper.sendTemplatedEmail as any)(...args);
  } finally {
    (EmailHelper as any).sendEmail = original;
  }
  return sent[0].body as string;
}

test("sendTemplatedEmail renders a church logo as an image above the escaped app name", async () => {
  const body = await renderBody("from@x.com", "to@x.com", "Grace Church", "https://grace.b1.church", "Thanks", "<p>Hi</p>", "ChurchEmailTemplate.html", undefined, "https://content.churchapps.org/logo.png");
  assert.ok(body.includes("<img src=\"https://content.churchapps.org/logo.png\""), "logo should render as an <img> tag");
  assert.ok(!body.includes("&lt;img"), "logo markup should not be escaped into visible text");
  assert.ok(body.includes("Grace Church</a>"));
});

test("sendTemplatedEmail still escapes HTML in the app name and drops unsafe logo URLs", async () => {
  const body = await renderBody("from@x.com", "to@x.com", "<b>Grace</b>", "https://grace.b1.church", "Thanks", "<p>Hi</p>", "ChurchEmailTemplate.html", undefined, "javascript:alert(1)");
  assert.ok(body.includes("&lt;b&gt;Grace&lt;/b&gt;"));
  assert.ok(!body.includes("javascript:"));
  assert.ok(!body.includes("<img"));
});
