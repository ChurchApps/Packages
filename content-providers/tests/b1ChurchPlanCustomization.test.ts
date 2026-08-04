import { test } from "node:test";
import assert from "node:assert/strict";

import { getOrderedFiles } from "../src/providers/b1Church/planCustomization";
import { Instructions } from "../src/interfaces";

// Regression for issue #963: the same downloadUrl legitimately appears on
// section, action, and file levels of a B1 plan tree; only leaves may play.
const DUP_URL = "https://content.lessons.church/files/video1.mp4";

const instructions: Instructions = {
  items: [
    {
      id: "section1",
      itemType: "section",
      label: "Worship",
      downloadUrl: DUP_URL,
      children: [
        {
          id: "action1",
          itemType: "action",
          label: "Countdown",
          downloadUrl: DUP_URL,
          children: [{ id: "file1", itemType: "file", label: "Countdown Video", downloadUrl: DUP_URL, seconds: 120 }]
        },
        { id: "action2", itemType: "action", label: "Welcome", children: [{ id: "file2", itemType: "file", label: "Welcome Slide", downloadUrl: "https://content.lessons.church/files/slide1.jpg" }] }
      ]
    }
  ]
};

test("getOrderedFiles emits one entry per unique leaf file, not one per tree level", () => {
  const files = getOrderedFiles(instructions);
  assert.equal(files.length, 2);
  assert.equal(files.filter(f => f.url === DUP_URL).length, 1);
  assert.deepEqual(files.map(f => f.id), ["file1", "file2"]);
});

test("childless non-file nodes with a downloadUrl still play", () => {
  const files = getOrderedFiles({ items: [{ id: "a1", itemType: "action", label: "Standalone", downloadUrl: DUP_URL }] });
  assert.equal(files.length, 1);
  assert.equal(files[0].id, "a1");
});
