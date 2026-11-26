/**
 * Vercel Serverless Function: POST /api/analyze-notebook
 * Qo'lda yozilgan daftar, ombor jadvali yoki mahsulotlar ro'yxati rasmini
 * multimodal AI (Gemini yoki OpenAI) orqali xavfsiz tahlil qiladi.
 * API kalitlari faqat server muhitida (Environment Variables) saqlanadi.
 */

function stripCodeFences(text) {
  return String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function buildSystemInstruction(catalogHints = []) {
  const hintsStr = Array.isArray(catalogHints) && catalogHints.length > 0
    ? `\nMavjud do'kon mahsulotlari (nomlarni to'g'ri tanish uchun yordamchi ro'yxat, lekin rasmda yo'q narsani qo'shma): ${catalogHints.slice(0, 60).join(', ')}`
    : '';

  return `Siz O'zbekiston do'koni uchun qo'lda yozilgan savdo daftari, kirim-chiqim jadvali, ombor hisoboti va mahsulotlar ro'yxati rasmlarini o'qiydigan aniq OCR va ma'lumot ajratuvchi yordamchisiz.

QAT'IY QOIDALAR:
1. Rasmda HAQIQATDAN ko'rinib turgan mahsulot nomlari, narxlar va miqdorlarni ajrating (o'zbek lotin, kirill yoki aralash qo'lyozma bo'lishi mumkin).
2. NOANIQ YOKI KO'RINMAYDIGAN RAQAMLARNI ASLO TO'QIB CHIQARMANG! Agar biror ustun rasmda bo'lmasa yoki o'qib bo'lmasa, qiymatini null qiling va shu maydon nomini "uncertainFields" ro'yxatiga yozing.
3. Agar rasmda faqat "Jami" (kirim) va "Qoldiq" bo'lsa, "soldQty" ni null qoldiring (yoki aniq hisoblanmasa null qiling — dastur o'zi hisoblaydi). Agar faqat "Jami" va "Sotildi" bo'lsa, "remainingQty" ni null qiling.
4. Narxlar o'zbek so'mida (masalan: 6000, 10000; agar "6 ming" yoki "6k" yozilgan bo'lsa 6000 deb oling).
5. Faqat toza JSON qaytaring, boshqa izoh yozmang.${hintsStr}

JSON formati:
{
  "seller": string | null,
  "reportDate": "YYYY-MM-DD" | null,
  "notes": string,
  "items": [
    {
      "name": string,
      "price": number | null,
      "totalQty": number | null,
      "soldQty": number | null,
      "remainingQty": number | null,
      "lineTotal": number | null,
      "unit": "dona" | "kg" | "litr" | "quti" | "porsiya",
      "confidence": "high" | "medium" | "low",
      "uncertainFields": string[],
      "rawText": string
    }
  ]
}`;
}

async function callGeminiVision(apiKey, base64Data, mimeType, catalogHints) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      contents: [
        {
          parts: [
            { text: buildSystemInstruction(catalogHints) },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      lastError = new Error(`Gemini (${model}) xatosi ${resp.status}: ${errTxt.slice(0, 220)}`);
      continue;
    }

    const json = await resp.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      lastError = new Error(`Gemini (${model}) bo'sh javob qaytardi`);
      continue;
    }
    return { provider: `gemini:${model}`, parsed: JSON.parse(stripCodeFences(text)) };
  }

  throw lastError || new Error('Gemini API bilan bog‘lanib bo‘lmadi');
}

async function callOpenAIVision(apiKey, base64Data, mimeType, catalogHints) {
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemInstruction(catalogHints) },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Ushbu rasmdagi mahsulotlar, narxlar, kirim, sotuv va qoldiq jadvalini aniq JSON formatida ajratib bering.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    })
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`OpenAI xatosi ${resp.status}: ${errTxt.slice(0, 220)}`);
  }

  const json = await resp.json();
  const text = json?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI bo‘sh javob qaytardi');
  return { provider: `openai:${model}`, parsed: JSON.parse(stripCodeFences(text)) };
}

function sanitizeParsedResult(parsed) {
  const toNumOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const cleaned = typeof v === 'string' ? v.replace(/\s+/g, '').replace(',', '.') : v;
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return {
    seller: parsed?.seller ? String(parsed.seller).trim() : null,
    reportDate: parsed?.reportDate ? String(parsed.reportDate).trim() : null,
    notes: parsed?.notes ? String(parsed.notes).trim() : '',
    items: items
      .filter(it => it && it.name && String(it.name).trim())
      .map(it => ({
        name: String(it.name).trim(),
        price: toNumOrNull(it.price),
        totalQty: toNumOrNull(it.totalQty),
        soldQty: toNumOrNull(it.soldQty),
        remainingQty: toNumOrNull(it.remainingQty),
        lineTotal: toNumOrNull(it.lineTotal),
        unit: ['dona', 'kg', 'litr', 'quti', 'porsiya'].includes(it.unit) ? it.unit : 'dona',
        confidence: ['high', 'medium', 'low'].includes(it.confidence) ? it.confidence : 'medium',
        uncertainFields: Array.isArray(it.uncertainFields) ? it.uncertainFields : [],
        rawText: it.rawText ? String(it.rawText).trim() : ''
      }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Faqat POST so‘rovi qabul qilinadi.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    let imageBase64 = String(body.imageBase64 || '').trim();
    let mimeType = String(body.mimeType || 'image/jpeg').trim();
    const catalogHints = Array.isArray(body.catalogHints) ? body.catalogHints : [];

    if (imageBase64.startsWith('data:')) {
      const m = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        mimeType = m[1];
        imageBase64 = m[2];
      }
    }

    if (!imageBase64 || imageBase64.length < 50) {
      return res.status(400).json({ ok: false, error: 'Rasm ma’lumoti yuborilmadi.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return res.status(503).json({
        ok: false,
        code: 'MISSING_API_KEY',
        error: 'Serverda AI API kaliti sozlanmagan. Vercel loyiha sozlamalarida GEMINI_API_KEY yoki OPENAI_API_KEY muhit o‘zgaruvchisini kiriting.'
      });
    }

    let result;
    if (geminiKey) {
      try {
        result = await callGeminiVision(geminiKey, imageBase64, mimeType, catalogHints);
      } catch (gemErr) {
        if (openaiKey) {
          result = await callOpenAIVision(openaiKey, imageBase64, mimeType, catalogHints);
        } else {
          throw gemErr;
        }
      }
    } else {
      result = await callOpenAIVision(openaiKey, imageBase64, mimeType, catalogHints);
    }

    const cleanData = sanitizeParsedResult(result.parsed);
    return res.status(200).json({
      ok: true,
      provider: result.provider,
      data: cleanData
    });
  } catch (err) {
    console.error('AI Notebook analysis error:', err);
    return res.status(500).json({
      ok: false,
      code: 'AI_ERROR',
      error: err.message || 'Rasmni AI orqali tahlil qilishda server xatoligi yuz berdi.'
    });
  }
};
