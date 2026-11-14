import { describe, expect, it } from "vitest";
import { applyFormat, continueList } from "../formatSelection";

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

// ChurchAppsSupport#1575: Enter at the end of a list line starts the next item.
describe("continueList", () => {
  it("adds the next bullet after a bullet line", () => {
    expect(continueList("- milk", 6)).toEqual({ value: "- milk\n- ", start: 9, end: 9 });
    expect(continueList("* milk", 6)).toEqual({ value: "* milk\n* ", start: 9, end: 9 });
  });

  it("increments the number after a numbered line", () => {
    expect(continueList("Shopping\n1. milk\n2. eggs", 24)).toEqual({ value: "Shopping\n1. milk\n2. eggs\n3. ", start: 28, end: 28 });
  });

  it("splits the line when the caret is mid-item", () => {
    expect(continueList("- milkeggs", 6)).toEqual({ value: "- milk\n- eggs", start: 9, end: 9 });
  });

  it("ends the list on Enter in an empty item", () => {
    expect(continueList("- milk\n- ", 9)).toEqual({ value: "- milk\n", start: 7, end: 7 });
    expect(continueList("1. milk\n2. ", 11)).toEqual({ value: "1. milk\n", start: 8, end: 8 });
  });

  it("leaves plain lines and the marker itself alone", () => {
    expect(continueList("Hello", 5)).toBeNull();
    expect(continueList("- milk", 1)).toBeNull();
  });
});

