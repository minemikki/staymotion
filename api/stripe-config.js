// Returns the Stripe publishable key so the order page can render the
// Apple Pay / Google Pay express button. Publishable keys are safe to expose.
// If the key isn't set, the page simply hides the Apple Pay button and keeps
// the card button.

export default function handler(req, res) {
  res.json({ pk: process.env.STRIPE_PUBLISHABLE_KEY || '' });
}
