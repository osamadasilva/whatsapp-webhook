const greetedUsers = new Set();
const conversationHistory = new Map();

module.exports = async function handler(req, res) {

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).send("OK");
    }

    const message = messages[0];
    const from = message.from;

    let body = "";
    let isLocation = false;
    let latitude = "";
    let longitude = "";

    if (message.type === "location") {
      latitude = message.location.latitude;
      longitude = message.location.longitude;
      isLocation = true;
      body = "[لوكيشن العميل: https://maps.google.com/?q=" + latitude + "," + longitude + "]";
    } else if (message.type === "text") {
      body = message.text.body.trim();
    } else {
      return res.status(200).send("OK");
    }

    const lowerBody = body.toLowerCase();

    const isGreeting =
      lowerBody === "هلا" ||
      lowerBody === "السلام عليكم" ||
      lowerBody === "مرحبا" ||
      lowerBody === "مساء الخير" ||
      lowerBody === "صباح الخير";

    const shouldGreet = from && isGreeting && !greetedUsers.has(from);

    if (!conversationHistory.has(from)) {
      conversationHistory.set(from, []);
    }
    const history = conversationHistory.get(from);

    const systemPrompt = "أنت موظف واتساب لمطعم Pizza Peel. تكلم بالعربية بلهجة قصيمية خفيفة محترمة. كن ودود ومختصر واستخدم إيموجي بسيط. استخدم يا عزيزي في مخاطبة العميل دائما. لا تقول وش أبي لك، بدلها قل وش أخدمك فيه يا عزيزي. إذا قال العميل المنيو أو وش عندكم اعرض المنيو كامل فورا. إذا أرسل العميل لوكيشن رد: تم استلام موقعك والسائق في الطريق. المنيو: البيتزا: مارجريتا 32، بيبروني 36، الأجبان الأربعة 36، الفريدو 37، مسخن 39، ترفل 42، سموكي بريسكيت 43. الباستا: بيف بينك باستا 31، ترافل ريغاتوني 31. الجانبيات: فرايز 10، ترافل فرايز 19، كرات الريزوتو 22. الصوصات: رانش 2، باربكيو 2، عسل سبايسي 3. المشروبات: بيبسي 3، ماء 1. الموقع: الرس ريف جلاس. الدوام: 4 مساء إلى 1 صباحا. التوصيل: 10 ريال. إذا أكد العميل الطلب قل: تم تأكيد طلبك ثم اسأله متى يبي الطلب.";

    const userMessage = shouldGreet
      ? "هذه أول تحية من العميل. رحب به فقط. رسالة العميل: " + (body || "هلا")
      : body || "هلا";

    history.push({ role: "user", content: userMessage });

    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemPrompt,
        messages: history
      })
    });

    const claudeData = await claudeResponse.json();
    const reply = claudeData?.content?.[0]?.text?.trim() || "ياهلا أنا Pizza Peel وش أخدمك فيه يا عزيزي";

    history.push({ role: "assistant", content: reply });

    if (shouldGreet && from) {
      greetedUsers.add(from);
    }

    await fetch("https://graph.facebook.com/v19.0/" + process.env.WHATSAPP_PHONE_ID + "/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.WHATSAPP_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: from,
        type: "text",
        text: { body: reply }
      })
    });

    const isConfirmed = reply.includes("تم تأكيد طلبك");

    if (isConfirmed || isLocation) {
      const lastOrders = history
        .slice(-6)
        .map(function(m) { return (m.role === "user" ? "العميل" : "البوت") + ": " + m.content; })
        .join("\n");

      await fetch("https://graph.facebook.com/v19.0/" + process.env.WHATSAPP_PHONE_ID + "/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.WHATSAPP_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: process.env.OWNER_PHONE,
          type: "text",
          text: {
            body: "طلب جديد!\nمن: " + from + "\n\n" + lastOrders + (isLocation ? "\n\nاللوكيشن: https://maps.google.com/?q=" + latitude + "," + longitude : "")
          }
        })
      });
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.error("Error:", err);
    return res.status(200).send("OK");
  }
}
