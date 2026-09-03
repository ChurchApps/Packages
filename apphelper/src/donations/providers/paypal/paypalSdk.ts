declare global {
  interface Window { paypal?: any }
}

let sdkPromise: Promise<any> | null = null;
let sdkClientId = "";

function injectSdk(clientId: string, clientToken?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(window.paypal); return; }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons,hosted-fields&enable-funding=venmo&intent=capture&commit=true`;
    script.async = true;
    script.dataset.apphelperPaypalSdk = "true";
    if (clientToken) script.dataset.clientToken = clientToken;
    script.addEventListener("load", () => resolve(window.paypal));
    script.addEventListener("error", (e) => reject(e));
    document.body.appendChild(script);
  });
}

// One script tag serves Hosted Fields and Buttons; the client token must be on that tag before it loads,
// so the first caller wins and everyone else shares its promise.
export function loadPayPalSdk(clientId: string, getClientToken?: () => Promise<string | undefined>): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Window not available"));
  if (!sdkPromise || sdkClientId !== clientId) {
    sdkClientId = clientId;
    sdkPromise = (async () => {
      let clientToken: string | undefined;
      if (getClientToken) {
        try { clientToken = await getClientToken(); } catch { /* hosted fields will report ineligible */ }
      }
      return injectSdk(clientId, clientToken);
    })().catch((e) => { sdkPromise = null; throw e; });
  }
  return sdkPromise;
}
