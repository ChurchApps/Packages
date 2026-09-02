import { test } from "node:test";
import assert from "node:assert/strict";

import { LessonsChurchProvider } from "../src/providers/lessonsChurch/LessonsChurchProvider";
import { GoCurriculumProvider } from "../src/providers/goCurriculum/GoCurriculumProvider";
import { ContentProviderAuthData } from "../src/interfaces";

function mockFetch(handler: (url: string) => unknown) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    const body = handler(String(url));
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  return () => { globalThis.fetch = realFetch; };
}

const VENUE_PATH = "/lessons/PGM00000001/STU00000001/LSN00000001/VEN00000002";

const lessonsFeed = {
  lessonName: "I Can Pray",
  lessonImage: "https://content.lessons.church/lesson.jpg",
  downloads: [
    { name: "Slides and Printables", files: [{ id: "f1", name: "Slides and Printables.zip", url: "https://content.lessons.church/files/slides-and-printables.zip", fileType: "application/zip", bytes: 2048 }] },
    { name: "Leader Materials", files: [
      { id: "f2", name: "Leader Guide.pdf", url: "https://content.lessons.church/files/leader-guide.pdf", fileType: "application/pdf" },
      { id: "f3", name: "Handout.pdf", url: "https://content.lessons.church/files/handout.pdf", fileType: "application/pdf" }
    ] },
    { name: "Lesson Video", files: [{ id: "f4", name: "lesson.mp4", url: "https://content.lessons.church/files/lesson.mp4", fileType: "video/mp4" }] },
    { name: "Worship Track", files: [{ id: "f5", name: "worship-track.mp3", url: "https://content.lessons.church/files/worship-track" }] }
  ]
};

test("Lessons.church getInstructions surfaces printable bundles as downloads and drops playlist media", async () => {
  const restore = mockFetch((url) => {
    if (url.includes("/venues/public/planItems/")) return { venueName: "Classroom", items: [{ id: "pi1", itemType: "section", label: "Warm Up" }] };
    if (url.includes("/venues/public/actions/")) return { venueName: "Classroom", sections: [] };
    if (url.includes("/venues/public/feed/")) return lessonsFeed;
    return null;
  });
  try {
    const provider = new LessonsChurchProvider();
    const instructions = await provider.getInstructions(VENUE_PATH);
    assert.ok(instructions);
    const downloads = instructions.downloads || [];
    // zip + two pdfs survive; the mp4 (fileType) and mp3 (name sniff, extension-less url) do not
    assert.deepEqual(downloads.map(d => d.title), ["Slides and Printables", "Leader Guide.pdf", "Handout.pdf"]);
    assert.equal(downloads[0].url, "https://content.lessons.church/files/slides-and-printables.zip");
    assert.equal(downloads[0].bytes, 2048);
    assert.equal(downloads[0].fileType, "application/zip");
  } finally {
    restore();
  }
});

test("Lessons.church getInstructions omits downloads when the feed has none", async () => {
  const restore = mockFetch((url) => {
    if (url.includes("/venues/public/planItems/")) return { venueName: "Classroom", items: [] };
    if (url.includes("/venues/public/actions/")) return { venueName: "Classroom", sections: [] };
    if (url.includes("/venues/public/feed/")) return { lessonName: "I Can Pray" };
    return null;
  });
  try {
    const provider = new LessonsChurchProvider();
    const instructions = await provider.getInstructions(VENUE_PATH);
    assert.ok(instructions);
    assert.equal(instructions.downloads, undefined);
  } finally {
    restore();
  }
});

const goAuth: ContentProviderAuthData = { access_token: "at", refresh_token: "rt", token_type: "Bearer", created_at: 0, expires_in: 3600, scope: "basic" };

const goCatalog = {
  catalog: [{
    id: "faith-lab",
    name: "Faith Lab",
    lessons: [{
      id: "lesson-1",
      name: "God Keeps His Promises",
      playlist: [{ title: "Big Idea Video", file: "big-idea.mp4", url: "https://go.example.com/big-idea.mp4", mediaType: "video" }],
      resources: [
        { title: "Leader Guide", file: "leader-guide.pdf", url: "https://go.example.com/leader-guide.pdf" },
        { title: "Activity Sheet", file: "activity-sheet.docx", url: "https://go.example.com/activity-sheet.docx" },
        { title: "Countdown Video", file: "countdown.mp4", url: "https://go.example.com/countdown.mp4" }
      ]
    }]
  }]
};

test("Go Curriculum getInstructions maps resources to downloads and keeps the playlist as-is", async () => {
  const restore = mockFetch((url) => {
    if (url.includes("/oauth/me")) return { ID: "1" };
    return goCatalog;
  });
  try {
    const provider = new GoCurriculumProvider();
    const instructions = await provider.getInstructions("/faith-lab/lesson-1", goAuth);
    assert.ok(instructions);
    // playlist untouched: the one video still presents
    assert.equal(instructions.items.length, 1);
    // pdf/docx resources become downloads; the countdown video (playlist media) is skipped
    assert.deepEqual((instructions.downloads || []).map(d => ({ title: d.title, url: d.url })), [
      { title: "Leader Guide", url: "https://go.example.com/leader-guide.pdf" },
      { title: "Activity Sheet", url: "https://go.example.com/activity-sheet.docx" }
    ]);
  } finally {
    restore();
  }
});
