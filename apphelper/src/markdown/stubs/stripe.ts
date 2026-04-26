// Stub for Stripe packages - apphelper-markdown doesn't use Stripe,
// but @churchapps/apphelper imports it. This prevents build errors in dev.
export const Elements = () => null;
export const CardElement = () => null;
export const useElements = () => null;
export const useStripe = () => null;
export const loadStripe = () => Promise.resolve(null);
export default {};
