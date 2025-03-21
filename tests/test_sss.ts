import Stripe from 'stripe';
import * as config from "../src/config";
const stripe = new Stripe(config.StripeKey, {
  apiVersion: '2025-02-24.acacia',
});

const cancelCheckoutSession = async (sessionId: string) => {
  try {
    const canceledSession = await stripe.checkout.sessions.expire(sessionId);
    console.log('Session canceled:', canceledSession.id);
  } catch (err) {
    console.error('Error canceling session:', err);
  }
};

async function createCheckoutSession() {
  // // const session = await stripe.checkout.sessions.create({
  // //   payment_method_types: ['card'],
  // //   line_items: [
  // //     {
  // //       price_data: {
  // //         currency: 'pln',
  // //         product_data: {
  // //           name: 'Sample Product',
  // //         },
  // //         unit_amount: 1000, // Amount in cents
  // //       },
  // //       quantity: 1,
  // //     },
  // //   ],
  // //   mode: 'payment',
  // //   success_url: 'https://yourdomain.com/success',
  // //   cancel_url: 'https://yourdomain.com/cancel',
  // //   metadata: {
  // //     transaction_id: '12',  // Twoje metadane
  // //     auth_id: 'your_auth_id',  // Dodatkowe metadane
  // //   },
  // // });
  // await cancelCheckoutSession(session.id);
  // console.log(session.id);

  let sessionId = 'cs_live_a1SVg7ztiFSnoMW9rw2Z3X95MO8axDByqtFcjhUwCqO5nTjA8rja1S0Ime';
  await cancelCheckoutSession(sessionId);
}

createCheckoutSession().catch(console.error);
