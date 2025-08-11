app.get('/api/lulu/products', async (_req, res) => {
  try {
    const source = (process.env.LULU_PRODUCTS_SOURCE || 'store').toLowerCase();

    if (USE_MOCK === '1' || !LULU_API_KEY || !LULU_API_BASE_URL) {
      if (NODE_ENV !== 'production') console.warn('[products] mock mode');
      return res.json(mockProducts());
    }

    // Choose endpoint
    // store   -> your synced items (requires authenticated API key)
    // catalog -> public catalog (no store data)
    const path = source === 'catalog' ? '/v2/products' : '/v2/store/products';
    const url  = new URL(path, LULU_API_BASE_URL).toString();

    const up = await fetch(url, {
      headers: { Accept:'application/json', 'Content-Type':'application/json', ...authHeaders() }
    });

    if (!up.ok) {
      const txt = await up.text();
      return res.status(up.status).json({ error:'UPSTREAM', status:up.status, message: txt.slice(0,500) });
    }

    const raw = await up.json().catch(() => ({}));

    // Printful often returns { code:200, result:[ ... ] } for lists.
    // Normalize result/items/products/array to { products: [...] }
    const arr =
      Array.isArray(raw) ? raw :
      (Array.isArray(raw.result) ? raw.result :
      (Array.isArray(raw.items)  ? raw.items  :
      (Array.isArray(raw.products)? raw.products : [])));

    const mapped = arr.map(p => {
      // Printful store product fields (sync): id, name, thumbnail_url
      // Catalog product fields: id, main_category_name, image
      const id    = p.id ?? p.product_id ?? p.sync_product_id ?? p.external_id ?? cryptoRandom();
      const title = p.name ?? p.title ?? p.main_category_name ?? 'Untitled';
      const image = p.thumbnail_url ?? p.thumbnail ?? p.image ?? '';
      // Price usually exists on variant detail endpoints; leave null for list
      const price = p.retail_price ?? p.price ?? null;
      const description = p.description ?? p.type ?? '';
      return { id, title, image, price, description };
    });

    return res.json({ products: mapped });
  } catch (e) {
    console.error('products error', e);
    // Non-throwing fallback so your frontend always renders
    return res.status(200).json(mockProducts());
  }
});

function cryptoRandom() {
  return Math.random().toString(36).slice(2);
}
