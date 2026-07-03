/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @churchapps/helpers — WebPushHelper imports ApiHelper + UserHelper from there.
const apiPostMock = vi.fn().mockResolvedValue(undefined);
const apiGetMock = vi.fn().mockResolvedValue({ publicKey: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", enabled: true });

vi.mock("@churchapps/helpers", () => ({
  ApiHelper: { get: apiGetMock, post: apiPostMock },
  UserHelper: { user: { id: "USR00000001" } }
}));

const { WebPushHelper } = await import("../WebPushHelper");

describe("WebPushHelper.subscribe", () => {
  let fakeSubscription: any;
  let pushManagerSubscribeMock: ReturnType<typeof vi.fn>;
  let pushManagerGetSubscriptionMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiPostMock.mockClear();
    apiGetMock.mockClear();

    fakeSubscription = {
      endpoint: `https://example-push.test/endpoint/${Date.now()}`,
      toJSON() {
        return {
          endpoint: this.endpoint,
          keys: { p256dh: "p256dh-fake", auth: "auth-fake" }
        };
      }
    };
    pushManagerSubscribeMock = vi.fn().mockResolvedValue(fakeSubscription);
    pushManagerGetSubscriptionMock = vi.fn().mockResolvedValue(null);

    const fakeRegistration = {
      scope: "/mobile",
      pushManager: {
        subscribe: pushManagerSubscribeMock,
        getSubscription: pushManagerGetSubscriptionMock
      }
    };

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue(fakeRegistration),
        register: vi.fn().mockResolvedValue(fakeRegistration),
        ready: Promise.resolve(fakeRegistration)
      }
    });
    // PushManager presence is what isSupported() checks for
    (window as any).PushManager = function () { /* */ };
    // Notification API
    (window as any).Notification = function () { /* */ };
    (window as any).Notification.permission = "default";
    (window as any).Notification.requestPermission = vi.fn().mockResolvedValue("granted");
    // Clear any prior opt-out / cooldown state in the jsdom localStorage
    window.localStorage.clear();
  });

  it("posts a webpush subscription to the server when the user grants permission", async () => {
    WebPushHelper.configure({ scope: "/mobile", appName: "B1AppPwa" });
    const sub = await WebPushHelper.subscribe();

    expect(sub).toBeTruthy();
    expect(sub?.endpoint).toBe(fakeSubscription.endpoint);

    expect(apiGetMock).toHaveBeenCalledWith("/webpush/publicKey", "MessagingApi");

    expect(pushManagerSubscribeMock).toHaveBeenCalledTimes(1);
    const args = pushManagerSubscribeMock.mock.calls[0][0];
    expect(args.userVisibleOnly).toBe(true);
    expect(args.applicationServerKey).toBeInstanceOf(Uint8Array);

    expect(apiPostMock).toHaveBeenCalledWith(
      "/webpush/subscribe",
      expect.objectContaining({
        appName: "B1AppPwa",
        subscription: expect.objectContaining({
          endpoint: fakeSubscription.endpoint,
          keys: expect.objectContaining({ p256dh: "p256dh-fake", auth: "auth-fake" })
        })
      }),
      "MessagingApi"
    );
  });

  it("returns null and does not POST if permission is denied", async () => {
    (window as any).Notification.requestPermission = vi.fn().mockResolvedValue("denied");

    const sub = await WebPushHelper.subscribe();

    expect(sub).toBeNull();
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(pushManagerSubscribeMock).not.toHaveBeenCalled();
  });

  it("re-posts an existing subscription instead of subscribing again", async () => {
    pushManagerGetSubscriptionMock.mockResolvedValue(fakeSubscription);

    const sub = await WebPushHelper.subscribe();

    expect(sub).toBeTruthy();
    expect(pushManagerSubscribeMock).not.toHaveBeenCalled();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });
});
