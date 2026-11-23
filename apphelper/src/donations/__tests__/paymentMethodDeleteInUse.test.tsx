import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, del } = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));
vi.mock("@churchapps/helpers", async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    ApiHelper: { ...actual.ApiHelper, get, delete: del },
    UserHelper: { ...actual.UserHelper, checkAccess: () => true, currentUserChurch: { church: { id: "C1" }, person: { id: "P1" } } }
  };
});
vi.mock("../providers", () => ({
  getPaymentProvider: () => ({ capabilities: { savedCard: true }, MemberEntry: () => null }),
  pickDefaultGateway: (gateways: any[]) => gateways[0]
}));

import { PaymentMethods } from "../components/PaymentMethods";
import { DonationHelper } from "../helpers";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const IN_USE = "This payment method is used by a recurring gift. Move the gift to another payment method, then delete this one.";

async function deleteMethod() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const dataUpdate = vi.fn();
  const method: any = { id: "pm_1", type: "card", name: "visa", last4: "4242", provider: "stripe" };
  await act(async () => {
    createRoot(container).render(<PaymentMethods person={{ id: "P1" } as any} customerId="cus_1" paymentMethods={[method]} appName="B1" dataUpdate={dataUpdate} />);
  });
  await act(async () => { (container.querySelector("[aria-label='edit-button']") as HTMLElement).click(); });
  const deleteButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Delete") as HTMLElement;
  await act(async () => { deleteButton.click(); });
  return dataUpdate;
}

describe("Deleting a saved payment method", () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ gateways: [{ id: "G1", provider: "stripe", publicKey: "pk" }] });
    del.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("tells the member to move the recurring gift first when the Api blocks the delete", async () => {
    del.mockRejectedValue(new Error(JSON.stringify({ error: IN_USE, code: "payment_method_in_use" })));
    const dataUpdate = await deleteMethod();
    expect(del.mock.calls[0][0]).toBe("/paymentmethods/pm_1/cus_1?provider=stripe");
    expect(window.alert).toHaveBeenCalledWith(IN_USE);
    expect(dataUpdate).not.toHaveBeenCalled();
  });

  it("keeps the generic message for other failures", async () => {
    del.mockRejectedValue(new Error("Internal Server Error"));
    await deleteMethod();
    expect(window.alert).toHaveBeenCalledWith("Failed to delete payment method. Please try again.");
  });
});

describe("DonationHelper.parseApiError", () => {
  it("reads the Api's error and code from a thrown response body", () => {
    expect(DonationHelper.parseApiError(new Error("{\"error\":\"x\",\"code\":\"y\"}"))).toEqual({ error: "x", code: "y" });
  });

  it("returns nothing for a plain message", () => {
    expect(DonationHelper.parseApiError(new Error("Bad Gateway"))).toEqual({});
    expect(DonationHelper.parseApiError(undefined)).toEqual({});
  });
});
