// In-app purchases for the iPhone/Android app via RevenueCat (App Store / Google Play billing).
// Apple and Google require their own billing for digital subscriptions inside the app; the web keeps Stripe.
// RevenueCat's webhook (supabase/functions/revenuecat-webhook) writes the same `entitlements` row Stripe does,
// so isPro() works the same everywhere. Inert until VITE_REVENUECAT_IOS_KEY / VITE_REVENUECAT_ANDROID_KEY are set.
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { getState, setAccount } from '../store/store';
import { isNative, nativePlatform } from './native';

const KEYS = {
  ios: import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined,
  android: import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined,
};
export const ENTITLEMENT = 'pro';

// Loaded only inside the app, so the web build stays small.
const rc = async () => (await import('@revenuecat/purchases-capacitor')).Purchases;

const key = () => (nativePlatform() === 'ios' ? KEYS.ios : nativePlatform() === 'android' ? KEYS.android : undefined);
/** True inside the app when store billing is configured. */
export const storeBillingEnabled = (): boolean => isNative() && !!key();
/** True inside the app: purchases must go through the store (never Stripe). */
export const mustUseStoreBilling = (): boolean => isNative();

let configured: Promise<void> | null = null;
export function configureStore(userId?: string): Promise<void> {
  if (!storeBillingEnabled()) return Promise.resolve();
  if (!configured) configured = rc().then((P) => P.configure({ apiKey: key()!, appUserID: userId ?? getState().account?.userId ?? undefined }));
  return configured.then(async () => {
    if (userId) await (await rc()).logIn({ appUserID: userId }).catch(() => undefined);
  });
}

export interface StorePrices { monthly?: string; lifetime?: string }
let packages: { monthly?: PurchasesPackage; lifetime?: PurchasesPackage } = {};

/** Loads the current offering's monthly and lifetime packages and their local prices. */
export async function loadStorePrices(): Promise<StorePrices> {
  await configureStore();
  const { current } = await (await rc()).getOfferings();
  packages = { monthly: current?.monthly ?? undefined, lifetime: current?.lifetime ?? undefined };
  return { monthly: packages.monthly?.product.priceString, lifetime: packages.lifetime?.product.priceString };
}

function applyCustomerInfo(info: { entitlements: { active: Record<string, { productIdentifier: string; expirationDate?: string | null }> } }) {
  const e = info.entitlements.active[ENTITLEMENT];
  const a = getState().account;
  if (!a || !e) return false;
  const lifetime = /lifetime/i.test(e.productIdentifier);
  setAccount({ ...a, plan: lifetime ? 'pro_lifetime' : 'pro_monthly', planStatus: 'active', periodEnd: e.expirationDate ? Date.parse(e.expirationDate) : null });
  return true;
}

/** Buys a plan through the App Store / Google Play. Returns true when Pro is active. */
export async function buyInStore(plan: 'monthly' | 'lifetime'): Promise<boolean> {
  if (!packages[plan]) await loadStorePrices();
  const pkg = packages[plan];
  if (!pkg) throw new Error('This plan isn\'t available in the store yet.');
  try {
    const { customerInfo } = await (await rc()).purchasePackage({ aPackage: pkg });
    return applyCustomerInfo(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return false;
    throw new Error('The purchase didn\'t go through. You haven\'t been charged.');
  }
}

/** Required by Apple: restores purchases made with this Apple ID / Google account. */
export async function restoreStorePurchases(): Promise<boolean> {
  await configureStore();
  const { customerInfo } = await (await rc()).restorePurchases();
  return applyCustomerInfo(customerInfo);
}

/** Store pages where subscribers manage or cancel. */
export const MANAGE_SUBSCRIPTION_URL = () =>
  nativePlatform() === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';
