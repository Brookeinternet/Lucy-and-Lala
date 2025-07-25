// This is conceptual server-side (Node.js) code, NOT for your frontend HTML files.
// You would need to set up a Node.js server (e.g., with Express.js) and Firebase Admin SDK.

const express = require('express');
const Stripe = require('stripe');
const admin = require('firebase-admin'); // Firebase Admin SDK

// Initialize Firebase Admin SDK (replace with your service account key)
// const serviceAccount = require('./path/to/your/serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://lucyandlala.firebaseapp.com" // Your Firebase project URL
// });

// const db = admin.firestore();
// const stripe = Stripe('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'); // Use your live secret key

const app = express();
app.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = 'whsec_U18Pa8dBVgz99nZyntdZhcBPnuKJgl8O'; // YOUR WEBHOOK SECRET

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Checkout Session Completed:', session.id);

      // Retrieve line items to check product/price IDs
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0].price.id; // Assuming one line item for simplicity

      const firebaseUid = session.metadata.firebaseUid; // Assuming you pass UID in metadata
      const userRef = db.collection('artifacts').doc('your-app-id').collection('users').doc(firebaseUid).collection('profile').doc('subscription');
      const donationsRef = db.collection('artifacts').doc('your-app-id').collection('public').doc('data').collection('donations'); // Example public donations

      if (priceId === 'price_1Ro7rMReyOAsAwqJwRz0TYwd') {
        // PRO Subscriber plan purchased
        await userRef.set({ isProSubscriber: true, stripeCustomerId: session.customer }, { merge: true });
        console.log(`User ${firebaseUid} is now a PRO subscriber.`);
      } else if (priceId === 'price_1Ro7tKReyOAsAwqJDgaezn5Q') {
        // Sweet Roll purchased
        await donationsRef.add({ type: 'sweet_roll', amount: 5, timestamp: admin.firestore.FieldValue.serverTimestamp(), userId: firebaseUid });
        console.log(`Sweet roll donated by ${firebaseUid}.`);
      } else if (priceId === 'price_1Ro7toReyOAsAwqJXl7LoSwU') {
        // Donut purchased
        await donationsRef.add({ type: 'donut', amount: 5, timestamp: admin.firestore.FieldValue.serverTimestamp(), userId: firebaseUid });
        console.log(`Donut donated by ${firebaseUid}.`);
      }
      break;
    // Handle other event types (e.g., 'customer.subscription.deleted')
    // case 'customer.subscription.deleted':
    //   const subscription = event.data.object;
    //   // Update Firestore to set isProSubscriber: false for the user
    //   break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.json({ received: true });
});

// app.listen(4242, () => console.log('Running on port 4242'));
