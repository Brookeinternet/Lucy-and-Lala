// index.js (ESM)
import app from './server.js';

const PORT = process.env.PORT || 3000;

// If /health is already defined in server.js this is optional; keeping it is harmless.
app.all('/health', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.log(`Lulu backend listening on :${PORT}`);
});
// luluindex.js
import express from 'express';
import cors from 'cors';

const app = express();

// Health route
app.all('/health', (_req, res) => res.status(200).send('ok'));

// Example products route
app.get('/api/lulu/products', (_req, res) => {
  res.json({ products: [{ id: 1, title: 'Test Product' }] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

