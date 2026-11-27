/**
 * Vercel Serverless Function: GET / POST /api/sync
 * Kompyuter va telefon o'rtasida mahsulotlar, rasmlar, savdolar va sozlamalarni
 * Upstash Redis / Vercel KV REST API orqali sinxronlashtiradi.
 * Tashqi npm kutubxonasisiz faqat fetch() orqali ishlaydi.
 */

const ALLOWED_PASS_HASH = 'cf2e9bde';

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function redisPipeline(cfg, commands) {
  const resp = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Redis xatosi ${resp.status}: ${txt.slice(0, 180)}`);
  }

  return resp.json();
}

function parseJsonSafe(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pos-Auth');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = String(req.headers['x-pos-auth'] || '').trim();
  if (authHeader !== ALLOWED_PASS_HASH) {
    return res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      error: 'Sinxronizatsiya uchun tizimga kirish talab qilinadi.'
    });
  }

  const cfg = getRedisConfig();
  if (!cfg) {
    return res.status(503).json({
      ok: false,
      configured: false,
      code: 'SYNC_NOT_CONFIGURED',
      error: 'Bulut bazasi (Upstash Redis / Vercel KV) ulanmagan.'
    });
  }

  try {
    if (req.method === 'GET') {
      const results = await redisPipeline(cfg, [
        ['GET', 'dokon:meta'],
        ['GET', 'dokon:catalog'],
        ['GET', 'dokon:sales'],
        ['GET', 'dokon:settings']
      ]);

      const meta = parseJsonSafe(results[0]?.result, null);
      const catalog = parseJsonSafe(results[1]?.result, { products: [], updatedAt: null });
      const salesDoc = parseJsonSafe(results[2]?.result, { sales: [], updatedAt: null });
      const settingsDoc = parseJsonSafe(results[3]?.result, { settings: null, updatedAt: null });

      const products = Array.isArray(catalog.products) ? catalog.products : [];
      const cloudImgIds = [];
      products.forEach((p) => {
        if (p && typeof p.image === 'string' && p.image.startsWith('cloud://')) {
          cloudImgIds.push(p.image.slice(8));
        }
      });

      const images = {};
      if (cloudImgIds.length > 0) {
        const imgCmds = cloudImgIds.map((id) => ['GET', `dokon:img:${id}`]);
        const imgRes = await redisPipeline(cfg, imgCmds);
        cloudImgIds.forEach((id, idx) => {
          const val = imgRes[idx]?.result;
          if (val && typeof val === 'string') {
            images[id] = val;
          }
        });
      }

      return res.status(200).json({
        ok: true,
        configured: true,
        hasCloudData: !!meta,
        meta,
        products,
        images,
        sales: Array.isArray(salesDoc.sales) ? salesDoc.sales : [],
        settings: settingsDoc.settings || null
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const now = new Date().toISOString();
      const cmds = [];

      const existingMetaRes = await redisPipeline(cfg, [['GET', 'dokon:meta']]);
      const meta = parseJsonSafe(existingMetaRes[0]?.result, null) || {
        version: 1,
        updatedAt: now,
        productsUpdatedAt: null,
        salesUpdatedAt: null,
        settingsUpdatedAt: null
      };

      if (Array.isArray(body.products)) {
        const cleanProducts = [];
        for (const p of body.products) {
          if (!p || !p.id) continue;
          const copy = { ...p };
          delete copy.resolvedImage;

          if (copy.image && typeof copy.image === 'string' && copy.image.startsWith('data:image')) {
            // Shaxsiy mahsulot rasmini alohida Redis kalitida saqlaymiz (jadval tez yuklanishi uchun)
            cmds.push(['SET', `dokon:img:${copy.id}`, copy.image]);
            copy.image = `cloud://${copy.id}`;
          }
          cleanProducts.push(copy);
        }

        const catPayload = { updatedAt: now, products: cleanProducts };
        cmds.push(['SET', 'dokon:catalog', JSON.stringify(catPayload)]);
        meta.productsUpdatedAt = now;
      }

      if (Array.isArray(body.deletedImageIds)) {
        body.deletedImageIds.forEach((id) => {
          if (id) cmds.push(['DEL', `dokon:img:${id}`]);
        });
      }

      if (Array.isArray(body.sales)) {
        const trimmedSales = body.sales.slice(0, 1000);
        cmds.push(['SET', 'dokon:sales', JSON.stringify({ updatedAt: now, sales: trimmedSales })]);
        meta.salesUpdatedAt = now;
      }

      if (body.settings && typeof body.settings === 'object') {
        cmds.push(['SET', 'dokon:settings', JSON.stringify({ updatedAt: now, settings: body.settings })]);
        meta.settingsUpdatedAt = now;
      }

      meta.updatedAt = now;
      cmds.push(['SET', 'dokon:meta', JSON.stringify(meta)]);

      if (cmds.length > 0) {
        await redisPipeline(cfg, cmds);
      }

      return res.status(200).json({
        ok: true,
        configured: true,
        meta
      });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Sync API xatosi:', err);
    return res.status(500).json({
      ok: false,
      code: 'SYNC_ERROR',
      error: err.message || 'Server sinxronizatsiya xatosi'
    });
  }
};
