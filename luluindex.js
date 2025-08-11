// index.js (ESM)
import app from './server.js';

const PORT = process.env.PORT || 3000;

// If /health is already defined in server.js this is optional; keeping it is harmless.
app.all('/health', (_req, res) => res.status(200).send('ok'));

app.listen(PORT, () => {
  console.log(`Lulu backend listening on :${PORT}`);
});
