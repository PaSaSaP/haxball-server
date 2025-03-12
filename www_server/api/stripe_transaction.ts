import express, { Request, Response } from "express";
import Stripe from 'stripe';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { PaymentsDB } from "../../src/db/payments";
import * as config from "../../src/config";

const router = express.Router();
router.use(bodyParser.raw({ type: 'application/json' }));

const stripe = new Stripe(config.StripeKey, {
  apiVersion: '2025-02-24.acacia',
});
let roomConfig = config.getRoomConfig("3vs3");
let vipDb = new sqlite3.Database(roomConfig.vipDbFile, (err) => {
  if (err) console.error('Error opening database:', err.message);
});
let paymentsDb = new PaymentsDB(vipDb);
paymentsDb.setupDatabase();

router.post("/", async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = 'whsec_2tYDJMQsRRLjjaeYIjLpFMQMUWcoCoDB';
  // const endpointSecret = 'whsec_m1Pil0eJQTGRVHrDt8kjChPXLMkFahgg'; // debug
  // const endpointSecret = 'whsec_0d0e11d12d975328157357239bef174e6fb1b2c64d388215ae1f3eff9f33c471'; // debug from cli

  try {
    const event = stripe.webhooks.constructEvent(req.body as Buffer, sig, endpointSecret);
    let newPaymentState: 'started' | 'completed' | 'failed' = 'started';
    let paymentTransactionId = 0;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        const session = event.data.object;
        newPaymentState = "completed";
        paymentTransactionId = Number.parseInt(session.metadata?.transaction_id ?? 'NaN');
        console.log(`Payment was successful (t:${paymentTransactionId})!`);
        break;

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        const failedSession = event.data.object;
        newPaymentState = "failed";
        paymentTransactionId = Number.parseInt(failedSession.metadata?.transaction_id ?? 'NaN');
        console.log(`Payment failed or expired (t:${paymentTransactionId})!`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    if (newPaymentState != 'started' && !isNaN(paymentTransactionId)) {
      paymentsDb.updatePaymentStatus(paymentTransactionId, newPaymentState);
    }
    res.status(200).send('Event received');
  } catch (err) {
    console.error(`Error processing webhook: ${err}`);
    res.status(400).send(`Webhook Error: ${err}`);
  }
});

export default router;
