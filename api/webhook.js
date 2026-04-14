const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const greetedUsers = new Set();
const processedMessages = new Set();

async function getHistory(phone) {
  const { data } = await supabase
    .from('conversations')
    .select('role, message')
    .eq('phone_number', phone)
    .order('created_at', { ascending: true })
    .limit(10);
  return data ? data.map(r => ({ role: r.role, content: r.message })) : [];
}

async function saveMessage(phone, role, message) {
  await supabase.from('conversations').insert({ phone_number: phone, role, message });
}

async function clearHistory(phone) {
  await supabase.from('conversations').delete().eq('phone_number', phone);
}

function getSaudiTime() {
  const now = new Date();
  const saudiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
  const hours = saudiTime.getHours();
  const minutes = saudiTime.getMinutes();
  const timeStr = hours + ":" + (minutes < 10 ? "0" + minutes : minutes);
  const isOpen = hours >= 16 || hours < 1 || (hours === 1 && minutes === 0);
  return { hours, minutes, timeStr, isOpen };
}

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

    if (!greetedUsers.has(from)) {
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

    const history = await getHistory(from);

    const lastBotMessage = [...history].reverse().find(m => m.role === "assistant")?.content || "";
    const isConfirmationQuestion = lastBotMessage.includes("هل نأكد") || lastBotMessage.includes("هل تأكد") || lastBotMessage.includes("نأكد؟") || lastBotMessage.includes("تأكد؟") || lastBotMessage.includes("هل ذاك") || lastBotMessage.includes("ذاك الطلب");
    const userSaidYes = ["يس","نعم","اكد","صح","تمام","اوك","ايه","ابي","خلاص","اقولك ايه","وليها","yes","ok"].some(w => body.trim().includes(w));

    if (isConfirmationQuestion && userSaidYes) {
      const confirmReply = "تم تأكيد طلبك 🌷";
      await saveMessage(from, "user", body);
      await saveMessage(from, "assistant", confirmReply);
      await fetch("https://graph.facebook.com/v19.0/" + process.env.WHATSAPP_PHONE_ID + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.WHATSAPP_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: from, type: "text", text: { body: confirmReply } })
      });
      const lastOrders = history.slice(-6).map(m => (m.role === "user" ? "العميل" : "البوت") + ": " + m.content).join("\n");
      await fetch("https://graph.facebook.com/v19.0/" + process.env.WHATSAPP_PHONE_ID + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.WHATSAPP_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: process.env.OWNER_PHONE, type: "text", text: { body: "🔔 طلب جديد!\nمن: " + from + "\n\n" + lastOrders } })
      });
      await clearHistory(from);
      return res.status(200).send("OK");
    }

    const { timeStr, isOpen } = getSaudiTime();

    const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

الوقت الحالي في السعودية: ${timeStr}
حالة المطعم الآن: ${isOpen ? "مفتوح ✅" : "مغلق ❌"}
أوقات الدوام: من 4 مساءً (16:00) حتى 1 صباحاً (01:00)

تكلم بالعربية بلهجة قصيمية خفيفة محترمة.
كن ودود ومختصر واستخدم إيموجي بسيط.
استخدم "يا عزيزي" في مخاطبة العميل دائماً.
لا تقول أبداً "وش أبي لك" — بدلها قل دائماً "وش أخدمك فيه يا عزيزي؟ 😊"

--- قواعد الوقت والدوام ---

البوت يشتغل بشكل طبيعي في أي وقت ويعرض المنيو والمعلومات.

بعد تأكيد الطلب — اسأل العميل: "متى تبي الطلب يا عزيزي؟ الحين أو وقت محدد؟ 🕐"

إذا قال "الحين" أو "الآن":
- إذا المطعم مفتوح: "بيكون جاهز خلال 15 دقيقة إن شاء الله 🍕 وإذا تبي توصيل أرسل لنا موقعك 📍"
- إذا المطعم مغلق: "عذراً يا عزيزي 🙏 المطعم مغلق الحين، دوامنا من 4 مساءً حتى 1 صباحاً. تبي تحدد وقت ضمن الدوام؟"

إذا حدد وقت معين:
- تحقق إذا الوقت ضمن الدوام (بين 16:00 و 01:00)
- إذا ضمن الدوام: "تمام يا عزيزي، بنجهز طلبك الساعة [الوقت] إن شاء الله 🍕 وإذا تبي توصيل أرسل لنا موقعك قبل الوقت بشوي 📍"
- إذا خارج الدوام: "عذراً يا عزيزي 🙏 هذا الوقت خارج دوامنا. نحن نعمل من 4 مساءً حتى 1 صباحاً، تبي تحدد وقت ثاني؟"

--- فهم السياق ---

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

إذا فهمت من سياق الكلام أن العميل يريد إلغاء الطلب —
قل بالضبط: "تم إلغاء طلبك يا عزيزي 🙏 إذا تبغى تطلب مرة ثانية أنا هنا 😊"

إذا طلب تعديل — عدّل الطلب معه وأعرضه من جديد واسأله: هل نأكد الطلب الجديد؟
لا ترسل أي تأكيد نهائي إلا بعد ما تفهم من السياق أن العميل موافق على الطلب الجديد.

إذا سأل عن المنيو:

🍕 البيتزا
- مارجريتا — 32 ريال
- بيبروني — 36 ريال
- الأجبان الأربعة — 36 ريال
- الفريدو — 37 ريال
- مسخن — 39 ريال
- ترفل — 42 ريال
- سموكي بريسكيت — 43 ريال

🍝 الباستا
- بيف بينك باستا — 31 ريال
- ترافل ريغاتوني — 31 ريال

🍟 الجانبيات
- فرايز — 10 ريال
- ترافل فرايز — 19 ريال
- كرات الريزوتو — 22 ريال

🥫 الصوصات
- رانش — 2 ريال
- باربكيو — 2 ريال
- عسل سبايسي — 3 ريال

🥤 المشروبات
- بيبسي — 3 ريال
- ماء — 1 ريال

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
`;

    await saveMessage(from, "user", body);

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
        messages: [...history, { role: "user", content: body }]
      })
    });

    const claudeData = await claudeResponse.json();
    const reply = claudeData?.content?.[0]?.text?.trim() || "ياهلا 👋 أنا Pizza Peel 🍕 وش أخدمك فيه يا عزيزي؟ 😊";

    await saveMessage(from, "assistant", reply);

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
      const lastOrders = [...history, { role: "user", content: body }, { role: "assistant", content: reply }]
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
      await clearHistory(from);
    }

    if (isCancelled) {
      const lastOrders = [...history, { role: "user", content: body }, { role: "assistant", content: reply }]
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
      await clearHistory(from);
    }

    return res.status(200).send("OK");

  } catch (err) {
    console.error("Error:", err);
    return res.status(200).send("OK");
  }
}
