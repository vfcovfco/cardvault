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
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
                text: `從這張名片擷取資訊，只回傳以下 JSON，不要有任何其他文字、標點或 markdown：
{"nameZh":"","nameEn":"","title":"","company":"","email":"","phone":"","address":"","website":""}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message || "Gemini API 錯誤" });
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 強健的 JSON 解析：用正則抓出第一個完整的 {} 物件
    let parsed = {};
    try {
      // 先嘗試直接解析
      parsed = JSON.parse(raw.trim());
    } catch {
      // 失敗的話，用正則抓出 JSON 物件部分
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          console.error("JSON parse fallback failed:", e2.message, "raw:", raw.slice(0, 200));
          // 還是失敗的話回傳空欄位，讓使用者手動填寫
          parsed = { nameZh: "", nameEn: "", title: "", company: "", email: "", phone: "", address: "", website: "" };
        }
      }
    }

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error("Scan API error:", err.message);
    return res.status(500).json({ error: err.message || "辨識失敗，請重試" });
  }
}
