import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-04-22.dahlia',
  appInfo: {
    name: 'OpenBillet Core Engine',
    version: '1.0.0',
  },
});

// Tier configuration — driven entirely by env vars, never hardcoded
// Set these in Vercel / .env.local after creating products in Stripe dashboard
export const PRICE_TIER_MAP: Record<string, 'standard' | 'pro_unlimited'> = {
  [process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID!]: 'standard',
  [process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID!]: 'standard',
  [process.env.STRIPE_PRO_MONTHLY_PRICE_ID!]: 'pro_unlimited',
  [process.env.STRIPE_PRO_ANNUAL_PRICE_ID!]: 'pro_unlimited',
};