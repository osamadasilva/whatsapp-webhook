export default async function handler(req, res) {
  try {
    console.log("🔥 Webhook Hit");

    if (req.method === "GET") {
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === verifyToken) {
        console.log("✅ Webhook verified");
        return res.status(200).send(challenge);
      }

      console.log("❌ Verification failed");
      return res.status(403).send("Forbidden");
    }

    if (req.method === "POST") {
      const body = req.body;
      console.log("📩 BODY:", JSON.stringify(body, null, 2));

      const change = body?.entry?.[0]?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];

      if (!message) {
        console.log("ℹ️ No incoming message in payload");
        return res.status(200).send("OK");
      }

      const from = message.from;
      const messageType = message.type;

      let incomingText = "";

      if (messageType === "text") {
        incomingText = message.text?.body || "";
      } else if (messageType === "button") {
        incomingText = message.button?.text || "";
      } else if (messageType === "interactive") {
        incomingText =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          "";
      }

      console.log("👤 From:", from);
      console.log("💬 Incoming text:", incomingText);

      const replyText = incomingText
        ? `وصلت رسالتك: ${incomingText}`
        : "تم استلام رسالتك بنجاح ✅";

      const graphUrl = `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

      const whatsappResponse = await fetch(graphUrl, {
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
            body: replyText,
          },
        }),
      });

      const whatsappData = await whatsappResponse.json();
      console.log("📤 WhatsApp API response:", JSON.stringify(whatsappData, null, 2));

      if (!whatsappResponse.ok) {
        console.error("❌ Failed to send reply");
      }

      return res.status(200).send("OK");
    }

    return res.status(405).send("Method Not Allowed");
  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(200).send("OK");
  }
}
