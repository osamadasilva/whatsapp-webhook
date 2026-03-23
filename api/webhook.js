export default async function handler(req, res) {
  try {
    console.log("🔥 Webhook Hit");

    if (req.method === "GET") {
      const verify_token = "pizzapeel123";
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === verify_token) {
        console.log("✅ Verified");
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send("Forbidden");
      }
    }

    if (req.method === "POST") {
      const body = req.body;

      console.log("📩 BODY:", JSON.stringify(body, null, 2));

      const message =
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message) {
        const from = message.from;

        console.log("👤 From:", from);

        // 👇 إرسال رد تلقائي
        await fetch(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: from,
              type: "text",
              text: {
                body: "🔥 تم استلام رسالتك!",
              },
            }),
          }
        );
      }

      return res.status(200).send("OK");
    }

    return res.status(405).send("Method Not Allowed");
  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(200).send("OK");
  }
}
