// luluindex.js — single-file Express server (no dotenv)

// Pull env vars directly from process.env (Render sets these automatically)
const {
  PORT = 3000,
  NODE_ENV = 'development',
  FRONTEND_ORIGIN = 'https://<https://brookeinternet.github.io',

  // Printful config
  LULU_API_BASE_URL = 'https://api.printful.com',
  LULU_AUTH_SCHEME = 'Basic',       // Printful uses Basic <base64(apikey:)>
  LULU_API_KEY = 'JuWNtfNQsIW2OJdFMKd8OcBzYT2HWL3d12rmY1bb',                // <-- your Printful API key
  LULU_PRODUCTS_SOURCE = 'store',   

  // Control live vs mock
  USE_MOCK = '0'
} = process.env;

import express from 'express';


import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();
import express from 'express';
import cors from 'cors'; // ✅ add this

const app = express();

// Allow all origins (or restrict to your frontend URL)
app.use(cors({
  origin: '*' // or: ['https://yourfrontend.com', 'http://localhost:3000']
}));

// ... your other middleware and routes


// ------- Middleware -------
const allowed = [FRONTEND_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    cb(null, allowed.includes(origin));
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.options('*', cors());

app.use(helmet());
app.use(express.json());
app.use(morgan(NODE_ENV === 'production' ? 'tiny' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

// ------- Helpers -------
function authHeaders() {
  if (!LULU_API_KEY) return {};
  if (LULU_AUTH_SCHEME.toLowerCase() === 'basic') {
    const token = Buffer.from(`${LULU_API_KEY}:`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return { Authorization: `Bearer ${LULU_API_KEY}` };
}
function normalizeProducts(raw) {
  const arr = Array.isArray(raw) ? raw
    : (Array.isArray(raw?.result) ? raw.result
    : (Array.isArray(raw?.items) ? raw.items
    : (Array.isArray(raw?.products) ? raw.products : [])));
  return {
    products: arr.map(p => ({
      id: p.id ?? p.product_id ?? p.sync_product_id ?? p.external_id ?? Math.random().toString(36).slice(2),
      title: p.name ?? p.title ?? p.main_category_name ?? 'Untitled',
      image: p.thumbnail_url ?? p.thumbnail ?? p.image ?? '',
      price: p.retail_price ?? p.price ?? null,
      description: p.description ?? p.type ?? ''
    }))
  };
}
function mockProducts() {
  return {
    products: [
      { id:'mock-tee-pink',     title:'Lulu Pink Tee', price:19.99, image:'https://i.imgur.com/jXcGCKg.png', description:'Soft tee with strawberry sprinkles.' },
      { id:'mock-romper-stars', title:'Star Romper',   price:24.50, image:'https://i.imgur.com/WxA5W6K.png', description:'Comfy romper with twinkle stars.' },
      { id:'mock-mug-heart',    title:'Heart Mug',     price:12.00, image:'https://i.imgur.com/C2BDyp6.jpeg', description:'Cozy mug for cocoa time.' }
    ]
  };
}

// ------- Routes -------
// Always-on health
app.all('/health', (_req, res) => res.status(200).send('ok'));

// Debug: list mounted routes
app.get('/__routes', (_req, res) => {
  const routes = [];
  app._router?.stack?.forEach(m => {
    if (m.route?.path) routes.push({ method: Object.keys(m.route.methods)[0].toUpperCase(), path: m.route.path });
    if (m.name === 'router' && m.handle?.stack) {
      m.handle.stack.forEach(h => {
        if (h.route?.path) routes.push({ method: Object.keys(h.route.methods)[0].toUpperCase(), path: h.route.path });
      });
    }
  });
  res.json({ routes });
});

// GUARANTEE this GET exists (temporary safety net)
// Keep your real handler above this; this one is just a fallback.
app.get('/api/lulu/products', (_req, res) => {
  res.json({
    products: [
      { id:'mock-tee-pink', title:'Lulu Pink Tee', price:19.99, image:'https://i.imgur.com/jXcGCKg.png', description:'Soft tee with strawberry sprinkles.' },
      { id:'mock-romper-stars', title:'Star Romper', price:24.50, image:'https://i.imgur.com/WxA5W6K.png', description:'Comfy romper with twinkle stars.' }
    ]
  });
});


