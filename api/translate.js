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

  const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Translate naturally, preserving meaning and tone rather than doing a literal word-for-word translation. If the text is already in ${targetLang}, just return it as-is (lightly corrected if needed).

Return ONLY the translated text — no quotes, no explanation, no labels, no commentary of any kind.

Text to translate:
${text}`;

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.3,
            thinking_config: { thinking_budget: 0 },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Gemini API error (attempt ${attempt}):`, errText);
        lastError = errText;
        if (response.status === 503 || response.status === 429) continue;
        res.status(502).json({ error: "Upstream API error" });
        return;
      }

      const data = await response.json();
      const translatedText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

      if (!translatedText) {
        lastError = "empty translation";
        continue;
      }

      res.status(200).json({ translatedText });
      return;
    } catch (err) {
      console.error(`Translate function error (attempt ${attempt}):`, err);
      lastError = err.message;
    }
  }

  console.error("All translate attempts failed:", lastError);
  res.status(502).json({ error: "Translation failed after retries. Google's servers may be busy — please try again shortly." });
}
