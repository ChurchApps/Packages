import { afterEach, describe, expect, it, vi } from "vitest";
import { shareLink } from "../shareLink";

// ChurchAppsSupport#1696: Share on podcast episodes uses the member app's share fallback chain.
const args = { title: "Walking Through Ruth", text: "Check out this episode: \"Walking Through Ruth\"", url: "https://grace.b1.church/sermons/ep-2" };

afterEach(() => { vi.unstubAllGlobals(); });

describe("shareLink", () => {
  it("uses the share sheet when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    expect(await shareLink(args)).toBe("shared");
    expect(share).toHaveBeenCalledWith(args);
  });

  it("reports a dismissed share sheet as cancelled", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" });
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { share: vi.fn().mockRejectedValue(abort), clipboard: { writeText } });
    expect(await shareLink(args)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the text when there is no share sheet", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareLink(args)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(args.text);
  });

  it("fails when neither is available", async () => {
    vi.stubGlobal("navigator", {});
    expect(await shareLink(args)).toBe("failed");
  });
});
