import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import Stripe from 'stripe';
import { RejoiceDB } from "../src/db/rejoice";
import {RejoiceTransactionsDB} from "../src/db/rejoice_transactions";
import {RejoiceTransactionsWatcher} from "../src/db/rejoice_transactions_watcher";
import { RejoicePricesDB } from "../src/db/rejoice_prices";
import { VipOptionsDB } from '../src/db/vip_options';
import { VipTransactionsDB } from '../src/db/vip_transactions';
import { VipOptionsPricesDB } from '../src/db/vip_options_prices';
import { VipTransactionsWatcher } from '../src/db/vip_transactions_watcher';
import { PaymentLinksDB } from "../src/db/payment_links";
import { PaymentsDB } from "../src/db/payments";
import { PaymentsWatcher } from "../src/db/payments_watcher"; 
import { ShortLinksDB } from "../src/db/short_links";
import * as config from "../src/config";
import { getTimestampHM } from '../src/utils';


async function main() {
  console.log("Zaczynamy Handlowanie!");
  const stripe = new Stripe(config.StripeKey, {
    apiVersion: '2025-02-24.acacia',
  });
  let roomConfig = config.getRoomConfig("3vs3");
  let vipDb = new sqlite3.Database(roomConfig.vipDbFile, (err) => {
    if (err) console.error('Error opening database:', err.message);
  });
  let rejoiceDb = new RejoiceDB(vipDb);
  let rejoiceTransactionsDb = new RejoiceTransactionsDB(vipDb);
  let rejoiceTransactionsWatcher = new RejoiceTransactionsWatcher(vipDb);
  let rejoicePrices = new RejoicePricesDB(vipDb);
  let vipOptionsDb = new VipOptionsDB(vipDb);
  let vipTransactionsDb = new VipTransactionsDB(vipDb);
  let vipTransactionsWatcher = new VipTransactionsWatcher(vipDb);
  let vipOptionPrices = new VipOptionsPricesDB(vipDb);
  let paymentLinksDb = new PaymentLinksDB(vipDb);
  let paymentsDb = new PaymentsDB(vipDb);
  let paymentsWatcher = new PaymentsWatcher(vipDb);
  let shortLinksDb = new ShortLinksDB(vipDb);
  await rejoiceDb.setupDatabase();
  await rejoiceTransactionsDb.setupDatabase();
  await rejoiceTransactionsWatcher.setupDatabase();
  await rejoicePrices.setupDatabase();
  await vipOptionsDb.setupDatabase();
  await vipTransactionsDb.setupDatabase();
  await vipTransactionsWatcher.setupDatabase();
  await vipOptionPrices.setupDatabase();
  await paymentLinksDb.setupDatabase();
  await paymentsDb.setupDatabase();
  await paymentsWatcher.setupDatabase();
  await shortLinksDb.setupDatabase();

  rejoiceTransactionsWatcher.setCallback(async (authId: string, rejoiceTransactionId: number, selector: string) => {
    console.log(`Nowa transakcja: auth_id=${authId}, transaction_id=${rejoiceTransactionId} selector=${selector}`);
    let transaction = await rejoiceTransactionsDb.getPendingRejoiceTransaction(rejoiceTransactionId);
    if (!transaction) {
      console.error(`Nie ma transakcji z ${rejoiceTransactionId}`);
      return;
    }

    let rejoiceId = transaction.rejoice_id;
    let forDays = transaction.for_days;
    let price = await rejoicePrices.getRejoicePrice(rejoiceId, forDays);
    if (price === null) {
      console.error(`Brak ceny dla rejoice_id=${rejoiceId} na ${forDays} dni`);
      return;
    }

    let paymentTransactionId = await paymentsDb.insertPayment(price.price, 'started');
    await rejoiceTransactionsDb.updatePaymentTransactionId(rejoiceTransactionId, paymentTransactionId);
    let paymentLink = await requestStripePaymentLink(`Cieszynka - ${price.rejoice_id} na ${price.for_days} dni`, authId, paymentTransactionId, price.price);
    if (!paymentLink) {
      console.error(`nie mozna wygenerowac linku dla pId:${paymentTransactionId} rId:${rejoiceTransactionId}`);
      return;
    }

    const hash = generateUniqueHash(authId, paymentTransactionId);
    await shortLinksDb.insertShortLink(hash, paymentLink);
    const shortLink = `${config.webpageLink}/stripe/${hash}`; // it is redirection
    await paymentLinksDb.insertPaymentLink(authId, paymentTransactionId, shortLink, selector, 'rejoice');
    console.log(`Nowy link: ${shortLink} dla transakcji ${paymentTransactionId} dla auth ${authId}`);
  });

  vipTransactionsWatcher.setCallback(async (authId: string, vipOptionTransactionId: number, selector: string) => {
    console.log(`VIP Nowa transakcja: auth_id=${authId}, transaction_id=${vipOptionTransactionId} selector=${selector}`);
    let transaction = await vipTransactionsDb.getPendingVipTransaction(vipOptionTransactionId);
    if (!transaction) {
      console.error(`VIP Nie ma transakcji z ${vipOptionTransactionId}`);
      return;
    }

    let vipOption = transaction.option;
    let forDays = transaction.for_days;
    let price = await vipOptionPrices.getVipOptionPrice(vipOption, forDays);
    if (price === null) {
      console.error(`VIP Brak ceny dla rejoice_id=${vipOption} na ${forDays} dni`);
      return;
    }

    let paymentTransactionId = await paymentsDb.insertPayment(price.price, 'started');
    await vipTransactionsDb.updatePaymentTransactionId(vipOptionTransactionId, paymentTransactionId);
    let paymentLink = await requestStripePaymentLink(`Opcja VIP - ${price.option} na ${price.for_days} dni`, authId, paymentTransactionId, price.price);
    if (!paymentLink) {
      console.error(`VIP nie mozna wygenerowac linku dla pId:${paymentTransactionId} rId:${vipOptionTransactionId}`);
      return;
    }

    const hash = generateUniqueHash(authId, paymentTransactionId);
    await shortLinksDb.insertShortLink(hash, paymentLink);
    const shortLink = `${config.webpageLink}/stripe/${hash}`; // it is redirection
    await paymentLinksDb.insertPaymentLink(authId, paymentTransactionId, shortLink, selector, 'vip');
    console.log(`VIP Nowy link: ${shortLink} dla transakcji ${paymentTransactionId} dla auth ${authId}`);
  });

  paymentsWatcher.setCallback(async (paymentTransactionId: number, oldStatus: string, newStatus: string) => {
    if (newStatus === 'completed') { // TODO debug
      try {
        let rejoiceTransaction = await rejoiceTransactionsDb.getRejoiceTransactionByPaymentId(paymentTransactionId);
        if (rejoiceTransaction) {
          let authId = rejoiceTransaction.auth_id;
          let rejoiceId = rejoiceTransaction.rejoice_id;
          let forDays = rejoiceTransaction.for_days;
          let timeFrom = Date.now();
          let timeTo = timeFrom + forDays * 24 * 60 * 60 * 1000;
          rejoiceDb.updateOrInsertRejoice(authId, rejoiceId, timeTo, timeTo);
          console.log(`Gracz ${authId} dostał ${rejoiceId} na ${forDays} dni do ${timeTo}`);
          return;
        }
        let vipTransaction = await vipTransactionsDb.getVipTransactionByPaymentId(paymentTransactionId);
        if (vipTransaction) {
          let authId = vipTransaction.auth_id;
          let option = vipTransaction.option;
          let forDays = vipTransaction.for_days;
          let timeFrom = Date.now();
          let timeTo = timeFrom + forDays * 24 * 60 * 60 * 1000;
          vipOptionsDb.updateOrInsertVipOption(authId, option, timeTo, timeTo);
          console.log(`VIP Gracz ${authId} dostał ${option} na ${forDays} dni do ${timeTo}`);
          return;
        }
        
        console.error(`Nie mozna znalezc transaction dla pId:${paymentTransactionId}`);
      } catch (e) { console.error(`Błąd przy aktualizacji cieszynek bądź opcji VIP ${e}`) };
    } else {
      console.log(`Nieukończona transakcja pId:${paymentTransactionId} ma status ${newStatus}`);
    }
  });

  rejoiceTransactionsWatcher.startWatching();
  vipTransactionsWatcher.startWatching();
  paymentsWatcher.startWatching();

  async function createStripePrice(product_name: string, price: number) {
    try {
      const priceObj = await stripe.prices.create({
        unit_amount: price * 100, // Kwota w groszach
        currency: 'pln',  // Waluta
        product_data: {
          name: product_name,  // Nazwa produktu
        },
      });
      return priceObj.id;
    } catch (error) {
      console.error('Error creating price:', error);
      throw error;
    }
  }

  function generateUniqueHash(auth_id: string, transaction_id: number): string {
    // Tworzymy string, który będzie używany jako input dla algorytmu hashującego
    const input = `${auth_id}:${transaction_id}`;
    // Używamy algorytmu sha256, który jest bardzo silny, aby uzyskać unikalny hash
    const hash = crypto.createHash('sha256')
      .update(input)
      .digest('hex');
    const shortHash = hash.slice(0, 8);
  
    return shortHash;
  }

  async function requestStripePaymentLink(product_name: string, auth_id: string, transaction_id: number, price: number) {
    try {
      const priceId = await createStripePrice(product_name, price);
    
      // paymentLinks does not inherits metadata, so session here is used
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['blik', 'p24', 'card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          auth_id: auth_id,
          transaction_id: transaction_id.toString(),
        },
        success_url: config.webpageLink,
        cancel_url: config.webpageLink,
      });
      console.log(`Created session ID: ${session.id}`);
      return session.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  setInterval(() => {
    console.log(`${getTimestampHM()} Handlowanie trwa`);
  }, 60000); // Co minutę
}

main();
