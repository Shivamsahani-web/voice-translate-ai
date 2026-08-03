// Language codes that need a specific regional variant for this translation endpoint
const LANG_OVERRIDES = {
  zh: "zh-CN",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { text, sourceLang, targetLang } = req.body || {};
  if (!text || !text.trim() || !sourceLang || !targetLang) {
    res.status(400).json({ error: "text, sourceLang, and targetLang are required" });
    return;
  }

  const sl = LANG_OVERRIDES[sourceLang] || sourceLang;
  const tl = LANG_OVERRIDES[targetLang] || targetLang;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
      }

      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const segments = data?.[0] || [];
      const translatedText = segments.map((seg) => seg?.[0] || "").join("").trim();

      if (!translatedText) {
        lastError = "empty translation";
        continue;
      }

      res.status(200).json({ translatedText });
      return;
    } catch (err) {
      console.error(`Translate attempt ${attempt} failed:`, err.message);
      lastError = err.message;
    }
  }

  console.error("All translate attempts failed:", lastError);
  res.status(502).json({ error: "Translation failed. Please try again." });
}
