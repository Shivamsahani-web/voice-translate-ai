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

  try {
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

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
      console.error("Gemini API error:", errText);
      res.status(502).json({ error: "Upstream API error" });
      return;
    }

    const data = await response.json();
    const translatedText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    if (!translatedText) {
      res.status(502).json({ error: "No translation generated" });
      return;
    }

    res.status(200).json({ translatedText });
  } catch (err) {
    console.error("Translate function error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
}
