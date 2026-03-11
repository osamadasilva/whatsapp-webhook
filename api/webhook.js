export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = req.body?.Body || "";
  const from = req.body?.From || "";

  let reply = "تم استلام رسالتك";

  if (body.toLowerCase().includes("hi")) {
    reply = "أهلاً 👋 البوت يعمل الآن على Vercel";
  }

  const twiml = `
  <Response>
    <Message>${reply}</Message>
  </Response>
  `;

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twiml);
}
