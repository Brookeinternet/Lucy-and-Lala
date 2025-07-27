// This is a conceptual server-side Node.js Express application.
// DO NOT run this directly in a browser or expose sensitive keys publicly.
// You would deploy this on a secure server environment (e.g., Google Cloud Functions, Vercel, Heroku).

const express = require('express');
const Stripe = require('stripe');
const admin = require('firebase-admin'); // Firebase Admin SDK

// --- Configuration ---
// IMPORTANT: Replace with your actual secure keys and paths.
// For production, use environment variables (e.g., process.env.STRIPE_SECRET_KEY)
// Never hardcode sensitive keys in production code.

// 1. Firebase Admin SDK Initialization
// You need to download a service account key JSON file from your Firebase project settings:
// Project settings -> Service accounts -> Generate new private key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Replace with your actual database URL from Firebase Project Settings -> Database
  databaseURL: "https://lucyandlala.firebaseapp.com"
});

const db = admin.firestore();

// 2. Stripe Initialization
// Replace with your actual Stripe Secret Key (sk_live_...)


// 4. Your Stripe Price IDs
const PRO_SUBSCRIPTION_PRICE_ID = 'price_1Ro7rMReyOAsAwqJwRz0TYwd';
const SWEET_ROLL_PRODUCT_PRICE_ID = 'price_1Ro7tKReyOAsAwqJDgaezn5Q';
const DONUT_PRODUCT_PRICE_ID = 'price_1Ro7toReyOAsAwqJXl7LoSwU';

// Your Firebase App ID (used for Firestore collection paths)


// --- Express App Setup ---
const app = express();

// Use express.raw for Stripe webhook body parsing
// This is crucial for Stripe webhook signature verification
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, stripeWebhookSecret);
  } catch (err) {
    console.error(`❌ Webhook signature verification failed.`, err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the event type for debugging
  console.log(`✅ Received Stripe event: ${event.type}`);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(`Checkout Session Completed: ${session.id}`);

        // Retrieve line items to get the price ID(s)
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 }); // Assuming one line item per session for simplicity
        const priceId = lineItems.data[0]?.price?.id;

        // Retrieve firebaseUid from metadata (passed from your frontend during checkout session creation)
        const firebaseUid = session.metadata.firebaseUid;

        if (!firebaseUid) {
          console.warn(`⚠️ Checkout session ${session.id} completed but no firebaseUid found in metadata.`);
          // You might want to handle this case, e.g., send an alert to yourself
          response.status(400).send('Missing firebaseUid in metadata.');
          return;
        }

        // Firestore paths
        const userSubscriptionRef = db.collection('artifacts').doc(FIREBASE_APP_ID).collection('users').doc(firebaseUid).collection('profile').doc('subscription');
        const userDonationsRef = db.collection('artifacts').doc(FIREBASE_APP_ID).collection('users').doc(firebaseUid).collection('donations');


        if (priceId === PRO_SUBSCRIPTION_PRICE_ID) {
          // --- Handle Pro Subscription ---
          await userSubscriptionRef.set({
            isProSubscriber: true,
            stripeCustomerId: session.customer, // Store Stripe Customer ID for future reference
            subscriptionId: session.subscription, // Store Stripe Subscription ID
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`🎉 User ${firebaseUid} is now a PRO subscriber!`);

        } else if (priceId === SWEET_ROLL_PRODUCT_PRICE_ID) {
          // --- Handle Sweet Roll Donation ---
          await userDonationsRef.add({
            type: 'sweet_roll',
            amount: 5, // Or get from Stripe line item if variable
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            checkoutSessionId: session.id,
            stripeCustomerId: session.customer // Optional: link to customer
          });
          console.log(`🍩 Sweet roll donated by user ${firebaseUid || 'anonymous'}.`);

        } else if (priceId === DONUT_PRODUCT_PRICE_ID) {
          // --- Handle Donut Donation ---
          await userDonationsRef.add({
            type: 'donut',
            amount: 5, // Or get from Stripe line item if variable
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            checkoutSessionId: session.id,
            stripeCustomerId: session.customer // Optional: link to customer
          });
          console.log(`🥐 Donut donated by user ${firebaseUid || 'anonymous'}.`);

        } else {
          console.log(`🤷‍♀️ Unhandled price ID: ${priceId} in checkout.session.completed for session ${session.id}`);
        }
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        // Logic to handle subscription updates (e.g., status changes, renewals)
        // You'll need to link this subscription back to a Firebase user.
        // This often involves storing the Stripe customer ID on the user's Firestore profile.
        console.log(`Subscription updated: ${subscriptionUpdated.id}, Status: ${subscriptionUpdated.status}`);

        // Example: If subscription becomes 'active' or 'canceled'
        // const customerId = subscriptionUpdated.customer;
        // const userDoc = await db.collection('artifacts').doc(FIREBASE_APP_ID).collection('users').where('stripeCustomerId', '==', customerId).get();
        // if (!userDoc.empty) {
        //   const userRef = userDoc.docs[0].ref;
        //   await userRef.collection('profile').doc('subscription').update({
        //     isProSubscriber: subscriptionUpdated.status === 'active',
        //     status: subscriptionUpdated.status,
        //     lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        //   });
        //   console.log(`User subscription status updated to ${subscriptionUpdated.status}`);
        // }
        break;

      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object;
        // Logic to handle subscription cancellations
        console.log(`Subscription deleted: ${subscriptionDeleted.id}`);

        // Example: Find user by Stripe Customer ID and set isProSubscriber to false
        // const customerIdDeleted = subscriptionDeleted.customer;
        // const userDocDeleted = await db.collection('artifacts').doc(FIREBASE_APP_ID).collection('users').where('stripeCustomerId', '==', customerIdDeleted).get();
        // if (!userDocDeleted.empty) {
        //   const userRefDeleted = userDocDeleted.docs[0].ref;
        //   await userRefDeleted.collection('profile').doc('subscription').update({
        //     isProSubscriber: false,
        //     status: 'canceled',
        //     lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        //   });
        //   console.log(`User subscription status set to canceled for ${customerIdDeleted}`);
        // }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`🚨 Error handling Stripe event ${event.type}:`, error);
    response.status(500).send('Error processing webhook.');
    return;
  }

  // Return a 200 response to acknowledge receipt of the event
  response.json({ received: true });
});

// Basic Express server listener (for local testing or non-serverless deployment)
// For serverless functions (e.g., Cloud Functions), you'd export the app.
// app.listen(3000, () => console.log('Webhook server running on port 3000'));

// For Google Cloud Functions, you would export the app:
// exports.stripeWebhook = functions.https.onRequest(app);
