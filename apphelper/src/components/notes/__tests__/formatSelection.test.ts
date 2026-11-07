import { describe, expect, it } from "vitest";
import { applyFormat } from "../formatSelection";

// ChurchAppsSupport#1474: Bold / Italic / Bullets / Numbered for plain note and chat boxes.
describe("applyFormat", () => {
  it("wraps a selection in ** for bold and keeps the word selected", () => {
    expect(applyFormat("Hello world", 6, 11, "bold")).toEqual({ value: "Hello **world**", start: 8, end: 13 });
  });

  it("wraps a selection in _ for italic", () => {
    expect(applyFormat("Hello world", 0, 5, "italic")).toEqual({ value: "_Hello_ world", start: 1, end: 6 });
  });

  it("inserts an empty pair with the caret between the markers", () => {
    expect(applyFormat("Hi ", 3, 3, "bold")).toEqual({ value: "Hi ****", start: 5, end: 5 });
  });

  it("unwraps when the selection is already bold", () => {
    expect(applyFormat("Hello **world**", 8, 13, "bold")).toEqual({ value: "Hello world", start: 6, end: 11 });
  });

  it("prefixes every touched line with a bullet", () => {
    const r = applyFormat("milk\neggs\nbread", 2, 7, "bullets");
    expect(r.value).toBe("- milk\n- eggs\nbread");
    expect(r.value.slice(r.start, r.end)).toBe("- milk\n- eggs");
  });

  it("numbers lines 1. 2. 3.", () => {
    expect(applyFormat("a\nb\nc", 0, 5, "numbered").value).toBe("1. a\n2. b\n3. c");
  });

  it("bullets the current line when nothing is selected", () => {
    expect(applyFormat("one\ntwo", 5, 5, "bullets")).toEqual({ value: "one\n- two", start: 9, end: 9 });
  });

  it("removes the prefixes when every line already has them", () => {
    expect(applyFormat("- a\n- b", 0, 7, "bullets").value).toBe("a\nb");
    expect(applyFormat("1. a\n2. b", 0, 9, "numbered").value).toBe("a\nb");
  });

  it("switches numbered lines to bullets", () => {
    expect(applyFormat("1. a\n2. b", 0, 9, "bullets").value).toBe("- a\n- b");
  });
});
