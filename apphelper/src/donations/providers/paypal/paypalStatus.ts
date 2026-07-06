// PayPal capture is money-in-hand only at COMPLETED/APPROVED.
export function isPayPalCaptureComplete(status?: string): boolean {
  return status === "COMPLETED" || status === "APPROVED";
}
