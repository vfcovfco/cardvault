export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64, mediaType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                text: `你是名片資料擷取助理。請從這張名片圖片中擷取所有資訊。
僅回傳 JSON，不要有任何說明文字或 markdown 格式。
格式如下：
{"nameZh":"","nameEn":"","title":"","company":"","email":"","phone":"","address":"","website":""}
如果某欄位找不到，回傳空字串。`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini error:", data.error);
      return res.status(500).json({ error: data.error.message || "Gemini API 錯誤" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ success: true, data: parsed });
  } catch (err) {
    console.error("Scan API error:", err);
    return res.status(500).json({ error: "辨識失敗，請重試" });
  }
}
