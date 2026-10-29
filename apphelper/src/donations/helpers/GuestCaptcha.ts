import { ApiHelper } from "@churchapps/helpers";

export interface GuestCaptchaResult { status: string; pass: string }

// The Api refuses guest card saves and charges that do not carry the short-lived pass /donate/captcha-verify issues.
export class GuestCaptcha {
  static async verify(token: string, churchId: string): Promise<GuestCaptchaResult> {
    const data: any = await ApiHelper.postAnonymous("/donate/captcha-verify", { token, churchId }, "GivingApi");
    const ok = data?.response === "success" || data?.response === "human" || data?.success === true || data?.score >= 0.5;
    return { status: ok ? "success" : (data?.response || "robot"), pass: ok ? (data?.pass || "") : "" };
  }

  static withPass<T extends object>(body: T, pass: string): T & { captchaPass?: string } {
    return pass ? { ...body, captchaPass: pass } : body;
  }
}
