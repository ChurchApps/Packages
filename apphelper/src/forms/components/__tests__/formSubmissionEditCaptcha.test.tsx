import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, postAnonymous, auth } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), postAnonymous: vi.fn(), auth: { value: false } }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  const ApiHelper = { ...actual.ApiHelper, get, post, postAnonymous };
  Object.defineProperty(ApiHelper, "isAuthenticated", { get: () => auth.value });
  return { ...actual, ApiHelper };
});
vi.mock("react-google-recaptcha", () => ({ default: (p: any) => <button data-testid="recaptcha" onClick={() => p.onChange("tok")}>captcha</button> }));

import { FormSubmissionEdit } from "../FormSubmissionEdit";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe("FormSubmissionEdit bot check", () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    get.mockReset(); post.mockReset(); postAnonymous.mockReset();
    get.mockResolvedValue([{ id: "Q1", formId: "F1", title: "Favorite Color", fieldType: "Textbox" }]);
    post.mockResolvedValue([{ id: "FS1" }]);
    postAnonymous.mockResolvedValue({ response: "human", pass: "PASS1" });
  });
  afterEach(() => container?.remove());

  const render = async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    await act(async () => {
      createRoot(container).render(<FormSubmissionEdit churchId="CHU1" unRestrictedFormId="F1" addFormId="" contentType="form" contentId="F1" formSubmissionId="" showHeader={false} updatedFunction={() => { }} />);
    });
    await flush();
  };
  const submit = async () => {
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Submit")!;
    await act(async () => { button.click(); });
    await flush();
  };

  it("makes a signed-out submitter pass the captcha and sends its pass", async () => {
    auth.value = false;
    await render();
    await submit();
    expect(post).not.toHaveBeenCalled();
    expect(container.textContent).toContain("reCAPTCHA");

    await act(async () => { (container.querySelector("[data-testid='recaptcha']") as HTMLButtonElement).click(); });
    await flush();
    expect(postAnonymous).toHaveBeenCalledWith("/donate/captcha-verify", { token: "tok", churchId: "CHU1" }, "GivingApi");

    await submit();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1][0].captchaPass).toBe("PASS1");
  });

  it("does not show the captcha to a signed-in submitter", async () => {
    auth.value = true;
    await render();
    expect(container.querySelector("[data-testid='form-captcha']")).toBeNull();
    await submit();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][1][0].captchaPass).toBeUndefined();
  });
});
