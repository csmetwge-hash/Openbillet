import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
}

// Instantiate the Stripe client with the appropriate SDK configurations
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Specifying the official API version ensures type safety and predictable runtime payloads
  apiVersion: '2026-04-22.dahlia',
  appInfo: {
    name: 'OpenBillet Core Engine',
    version: '1.0.0',
  },
});