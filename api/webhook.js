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
      console.log("📩 BODY:", JSON.stringify(req.body, null, 2));
      return res.status(200).send("OK");
    }

    return res.status(405).send("Method Not Allowed");
  } catch (error) {
    console.error("❌ ERROR:", error);
    return res.status(200).send("OK");
  }
}
