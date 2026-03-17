const greetedUsers = new Set();
const conversationHistory = new Map();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const latitude = req.body?.Latitude || "";
  const longitude = req.body?.Longitude || "";
  const isLocation = latitude && longitude;
  const body = isLocation
    ? `[لوكيشن العميل: https://maps.google.com/?q=${latitude},${longitude}]`
    : (req.body?.Body || "").trim();

  const from = req.body?.From || "";
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

  const menuImages = {
    "مارجريتا": "https://i.imgur.com/W8KLU4v.jpeg",
    "بيبروني": "",
    "مسخن": "",
    "سموكي بريسكيت": "",
    "ترفل": "",
    "الأجبان الأربعة": "",
    "الفريدو": "",
    "بيف بينك باستا": "",
    "ترافل ريغاتوني": "",
    "كرات الريزوتو": "",
    "فرايز": "",
    "ترافل فرايز": "",
  };

  const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

تكلم بالعربية بلهجة قصيمية خفيفة محترمة.
كن ودود ومختصر واستخدم إيموجي بسيط.
استخدم "يا عزيزي" في مخاطبة العميل دائماً.
لا تقول أبداً "وش أبي لك" — بدلها قل دائماً "وش أخدمك فيه يا عزيزي؟ 😊"

فهم السياق مهم جداً:

إذا كان العميل يسأل عن صنف معين ثم قال:
"عطني وحده"
"أبي وحده"
"خلاص وحدة"

فالمقصود هو نفس الصنف الذي كان يتحدث عنه العميل آخر مرة.

مثال:
العميل: وش ترافل ريغاتوني
الموظف: يشرح الباستا
العميل: عطنا وحده
المقصود: ترافل ريغاتوني باستا وليس بيتزا.

لا تغيّر الصنف إلى بيتزا إذا كان الحديث عن باستا أو جانبيات.

مهم جداً:
- لا تكرر الرسالة الترحيبية.
- استخدم الترحيب فقط إذا وصلك تنبيه بأن هذه أول تحية من العميل.
- إذا لم تكن أول تحية، جاوب مباشرة على السؤال بدون ترحيب.
- إذا قال العميل "المنيو" أو "ارسل المنيو" أو "اعرض المنيو" أو "وش عندكم" اعرض المنيو كامل فوراً بدون أي سؤال.
- إذا أرسل العميل لوكيشن، رد عليه: "تم استلام موقعك 📍 والسائق في الطريق إليك إن شاء الله 🛵"

إذا سأل العميل عن المنيو اعرضه بهذا الشكل بالضبط:

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
- التوصيل: 10 ريال — العميل يرسل اللوكيشن ونوصله
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

أسلوب البيع — مهم جداً:

المرحلة 1 — بعد طلب البيتزا:
اقترح جانبي أو باستا مرة واحدة فقط:
"تبي معاها جانبي يا عزيزي؟ عندنا فرايز 🍟 أو كرات ريزوتو 🧆 أو باستا 🍝"

المرحلة 2 — بعد اكتمال الطلب الرئيسي:
اقترح صوص أو مشروب مرة واحدة فقط:
"تبي صوص معاه؟ رانش أو باربكيو أو عسل سبايسي 🥫"
أو: "نضيف بيبسي؟ 🥤 بثلاثة ريال"

المرحلة 3 — بعد الاقتراحات:
اعرض الطلب النهائي بهذا الأسلوب:

طلبك كذا يا عزيزي 👇

ثم اذكر الأصناف والأسعار
ثم اكتب المجموع

بعدها اسأل: هل نأكد؟

قواعد البيع:
- لا تكرر نفس الاقتراح أبداً.
- اقتراح واحد فقط في كل مرحلة.
- لا تقترح فرايز بمفردها — قدم خيارات.
- إذا رفض العميل الاقتراح انتقل للمرحلة التالية مباشرة.

إذا أكد العميل بأي طريقة — قل له بالضبط هذه الجملة:
تم تأكيد طلبك 🌷

بعدها اسأله مباشرة:
"متى تبي الطلب يا عزيزي؟ الحين أو وقت محدد؟ 🕐"

إذا قال الحين أو الآن:
"بيكون جاهز خلال 15 دقيقة إن شاء الله 🍕
وإذا تبي توصيل أرسل لنا موقعك 📍"

إذا حدد وقت معين مثل بعد ساعتين أو الساعة 8:
"تمام يا عزيزي، بنجهز طلبك الساعة [الوقت المحدد] إن شاء الله 🍕
وإذا تبي توصيل أرسل لنا موقعك قبل الوقت بشوي 📍"

إذا طُلب منك الترحيب، استخدم هذا النص فقط:
ياهلا 👋
أنا Pizza Peel 🍕
أزين بيتزا نابولي بالقصيم 😋
تبي تشوف المنيو؟
`;

  const userMessage = shouldGreet
    ? `هذه أول تحية من العميل. رحب به فقط.\n\nرسالة العميل: ${body || "هلا"}`
    : body || "هلا";

  history.push({ role: "user", content: userMessage });

  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }

  const twilioAuth = Buffer.from(
    process.env.TWILIO_ACCOUNT_SID + ":" + process.env.TWILIO_AUTH_TOKEN
  ).toString("base64");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await response.json();

    const reply =
      data?.content?.[0]?.text?.trim() ||
      "ياهلا 👋 أنا Pizza Peel 🍕 وش أخدمك فيه يا عزيزي؟ 😊";

    history.push({ role: "assistant", content: reply });

    if (shouldGreet && from) {
      greetedUsers.add(from);
    }

    const matchedImage = Object.keys(menuImages).find(item =>
      (body.includes(item) || reply.includes(item)) && menuImages[item] !== ""
    );
    const imageUrl = matchedImage ? menuImages[matchedImage] : null;

    // إرسال الرد عبر Twilio API مباشرة
    const msgParams = new URLSearchParams({
      From: "whatsapp:+966538633103",
      To: from,
      Body: reply
    });

    if (imageUrl) {
      msgParams.append("MediaUrl0", imageUrl);
    }

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${twilioAuth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: msgParams
      }
    );

    // إرسال الطلب لرقمك بعد التأكيد
    const isConfirmed = reply.includes("تم تأكيد طلبك");

    if (isConfirmed || isLocation) {
      const lastOrders = history
        .slice(-6)
        .map(m => `${m.role === "user" ? "العميل" : "البوت"}: ${m.content}`)
        .join("\n");

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${twilioAuth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            From: "whatsapp:+966538633103",
            To: "whatsapp:+966553419919",
            Body: `🔔 طلب جديد!\nمن: ${from}\n\n${lastOrders}${
              isLocation
                ? `\n\n📍 اللوكيشن: https://maps.google.com/?q=${latitude},${longitude}`
                : ""
            }`
          })
        }
      );
    }

    // رد على Twilio Webhook
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send("<Response></Response>");

  } catch (err) {
    console.error("Error:", err);
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send("<Response></Response>");
  }
}
