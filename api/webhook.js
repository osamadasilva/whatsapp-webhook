const greetedUsers = new Set();
const conversationHistory = new Map();
const processedMessages = new Set();

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

    if (value?.statuses) {
      return res.status(200).send("OK");
    }

    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).send("OK");
    }

    const message = messages[0];
    const from = message.from;
    const messageId = message.id;

    if (processedMessages.has(messageId)) {
      return res.status(200).send("OK");
    }
    processedMessages.add(messageId);

    if (processedMessages.size > 1000) {
      const first = processedMessages.values().next().value;
      processedMessages.delete(first);
    }

    let body = "";
    let isLocation = false;
    let latitude = "";
    let longitude = "";

    if (message.type === "location") {
      latitude = message.location.latitude;
      longitude = message.location.longitude;
      isLocation = true;
      body = "[لوكيشن العميل: https://maps.google.com/?q=" + latitude + "," + longitude + "]";
    } else if (message.type === "button") {
      const payload = message.button?.payload || "";
      if (payload === "قائمة الطعام") {
        body = "المنيو";
      } else if (payload === "الموقع والمعلومات") {
        body = "اعطني معلومات المطعم والموقع";
      } else {
        body = payload;
      }
    } else if (message.type === "interactive") {
      const buttonReply = message.interactive?.button_reply?.title || "";
      if (buttonReply === "الموقع والمعلومات") {
        body = "اعطني معلومات المطعم والموقع";
      } else if (buttonReply === "قائمة الطعام") {
        body = "المنيو";
      } else {
        body = buttonReply;
      }
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

    if (isGreeting && !greetedUsers.has(from)) {
      greetedUsers.add(from);
      await fetch("https://graph.facebook.com/v19.0/" + process.env.WHATSAPP_PHONE_ID + "/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.WHATSAPP_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: from,
          type: "template",
          template: {
            name: "menu",
            language: { code: "ar" }
          }
        })
      });
      return res.status(200).send("OK");
    }

    if (!conversationHistory.has(from)) {
      conversationHistory.set(from, []);
    }
    const history = conversationHistory.get(from);

    const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

تكلم بالعربية بلهجة قصيمية خفيفة محترمة.
كن ودود ومختصر واستخدم إيموجي بسيط.
استخدم "يا عزيزي" في مخاطبة العميل دائماً.
لا تقول أبداً "وش أبي لك" — بدلها قل دائماً "وش أخدمك فيه يا عزيزي؟ 😊"

فهم السياق مهم جداً:

إذا كان العميل يسأل عن صنف معين ثم قال:
"عطني وحده" أو "أبي وحده" أو "خلاص وحدة"
فالمقصود هو نفس الصنف الذي كان يتحدث عنه العميل آخر مرة.

لا تغيّر الصنف إلى بيتزا إذا كان الحديث عن باستا أو جانبيات.

مهم جداً:
- لا تكرر الرسالة الترحيبية.
- إذا قال العميل "المنيو" أو "وش عندكم" اعرض المنيو كامل فوراً.
- إذا أرسل العميل لوكيشن، رد: "تم استلام موقعك 📍 والسائق في الطريق إليك إن شاء الله 🛵"
- إذا طلب معلومات المطعم أو الموقع، أعطه المعلومات كاملة.

--- تعديل أو إلغاء الطلب ---

إذا قال العميل في أي وقت بعد تأكيد الطلب أي كلمة أو جملة تدل على الإلغاء مثل:
"كنسل" أو "لا" أو "ما أبي" أو "وقّف" أو "الغِ" أو "مو ذا" أو "بكره" أو "ما راح آخذ" أو أي عبارة فيها رفض أو تراجع عن الطلب —
قل له بالضبط: "تم إلغاء طلبك يا عزيزي 🙏 إذا تبغى تطلب مرة ثانية أنا هنا 😊"

إذا طلب تعديل — عدّل الطلب معه وأعرضه من جديد واسأله: هل نأكد الطلب الجديد؟
لا ترسل أي تأكيد نهائي إلا بعد ما يقول العميل نعم أو أكد أو صح على الطلب الجديد.

إذا سأل عن المنيو:

🍕 البيتزا
• مارجريتا — 32 ريال
• بيبروني — 36 ريال
• الأجبان الأربعة — 36 ريال
• الفريدو — 37 ريال
• مسخن — 39 ريال
• ترفل — 42 ريال
• سموكي بريسكيت — 43 ريال

🍝 الباستا
• بيف بينك باستا — 31 ريال
• ترافل ريغاتوني — 31 ريال

🍟 الجانبيات
• فرايز — 10 ريال
• ترافل فرايز — 19 ريال
• كرات الريزوتو — 22 ريال

🥫 الصوصات
• رانش — 2 ريال
• باربكيو — 2 ريال
• عسل سبايسي — 3 ريال

🥤 المشروبات
• بيبسي — 3 ريال
• ماء — 1 ريال

معلومات المطعم:
- الموقع: الرس، ريف جلاس
- الدوام: من 4 مساء إلى 1 صباحاً
- التوصيل: 10 ريال
- رقم التواصل: 0533373974

المنيو الكامل:

🍕 البيتزا

مارجريتا — 32
صلصة طماطم سان مارزانو، موزاريلا طازجة، بارميزان، ريحان

بيبروني — 36
موزاريلا، شيدر، بيبروني

الأجبان الأربعة — 36
موزاريلا، شيدر، روكفورد، بارميزان

الفريدو — 37
صوص أبيض، دجاج، موزاريلا، بطاطا مشوية، رانش

مسخن — 39
صوص أبيض، دجاج مسخن، بصل، سماق

ترفل — 42
صوص ترفل، فطر، موزاريلا، بارميزان، زيت ترفل

سموكي بريسكيت — 43
باربكيو، موزاريلا، شيدر، لحم بريسكيت مدخن

🍝 الباستا
- بيف بينك باستا — 31
- ترافل ريغاتوني — 31

🍟 الجانبيات
- فرايز — 10
- ترافل فرايز — 19
- كرات الريزوتو — 22

🥫 الصوصات
- رانش — 2
- باربكيو — 2
- عسل سبايسي — 3

🥤 المشروبات
- بيبسي — 3
- ماء — 1

أسلوب البيع:

المرحلة 1 — بعد طلب البيتزا:
"تبي معاها جانبي يا عزيزي؟ عندنا فرايز 🍟 أو كرات ريزوتو 🧆 أو باستا 🍝"

المرحلة 2 — بعد اكتمال الطلب:
"تبي صوص معاه؟ رانش أو باربكيو أو عسل سبايسي 🥫"

المرحلة 3 — اعرض الطلب النهائي:
طلبك كذا يا عزيزي 👇
ثم الأصناف والأسعار والمجموع
بعدها اسأل: هل نأكد؟

إذا أكد العميل — قل بالضبط:
تم تأكيد طلبك 🌷

بعدها اسأله:
"متى تبي الطلب يا عزيزي؟ الحين أو وقت محدد؟ 🕐"

إذا قال الحين:
"بيكون جاهز خلال 15 دقيقة إن شاء الله 🍕
وإذا تبي توصيل أرسل لنا موقعك 📍"

إذا حدد وقت:
"تمام يا عزيزي، بنجهز طلبك الساعة [الوقت] إن شاء الله 🍕
وإذا تبي توصيل أرسل لنا موقعك قبل الوقت بشوي 📍"
`;

    history.push({ role: "user", content: body });

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
    const reply = claudeData?.content?.[0]?.text?.trim() || "ياهلا 👋 أنا Pizza Peel 🍕 وش أخدمك فيه يا عزيزي؟ 😊";

    history.push({ role: "assistant", content: reply });

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
    const isCancelled = reply.includes("تم إلغاء طلبك");
    const isEditing = reply.includes("هل نأكد الطلب الجديد");

    if ((isConfirmed && !isEditing) || isLocation) {
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
            body: "🔔 طلب جديد!\nمن: " + from + "\n\n" + lastOrders + (isLocation ? "\n\n📍 اللوكيشن: https://maps.google.com/?q=" + latitude + "," + longitude : "")
          }
        })
      });
    }

    if (isCancelled) {
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
            body: "❌ تم إلغاء الطلب!\nمن: " + from + "\n\n" + lastOrders
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
