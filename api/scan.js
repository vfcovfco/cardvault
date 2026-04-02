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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `你是名片資料擷取助理。請從名片圖片中擷取所有資訊，僅回傳 JSON，不要有任何說明文字或 markdown。
格式：{"nameZh":"","nameEn":"","title":"","company":"","email":"","phone":"","address":"","website":""}
如果某欄位找不到，回傳空字串。`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: "請擷取這張名片的所有資訊",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Anthropic error:", JSON.stringify(data.error));
      return res.status(500).json({ error: data.error.message || "API 錯誤" });
    }

    const raw = data.content?.find(b => b.type === "text")?.text || "{}";

    let parsed = {};
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
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
