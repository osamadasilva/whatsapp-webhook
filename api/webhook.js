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

  const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

تكلم بالعربية بلهجة قصيمية خفيفة.
كن ودود ومختصر واستخدم إيموجي بسيط.

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
- إذا كانت الرسالة سؤال عن المنيو أو الأسعار أو المكونات، ادخل مباشرة في الجواب.
- إذا أرسل العميل لوكيشن، رد عليه: "تم استلام موقعك 📍 والسائق في الطريق إليك إن شاء الله 🛵"

معلومات المطعم:
- الموقع: الرس، ريف جلاس
- الدوام: من 4 مساء إلى 1 صباحاً
- التوصيل: 10 ريال — العميل يرسل اللوكيشن ونوصله
- رقم التواصل: 0533373974

المنيو:

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

أسلوب البيع:
- لا تسأل عن التأكيد إلا مرة واحدة فقط بعد اكتمال الطلب.
- إذا طلب صنف واحد فقط، اقترح عليه إضافة جانبي أو مشروب:
  مثال: "تبي معاه فرايز؟ 🍟 بس بعشرة"
  أو: "نضيف بيبسي؟ 🥤 بثلاثة ريال"
- إذا طلب بيتزا فقط، اقترح باستا أو جانبي.
- إذا طلب باستا، اقترح كرات الريزوتو أو فرايز.
- اقترح مرة واحدة فقط ولا تكرر الاقتراح.
- بعد الاقتراح أو رفضه، اعرض الطلب بهذا الأسلوب:

طلبك كذا يا طويل العمر 👇

ثم اذكر الأصناف والأسعار
ثم اكتب المجموع

بعدها اسأل:
هل نأكد؟

إذا أكد العميل بأي طريقة — موافقة أو إيجاب أو تأكيد — قل له بالضبط هذه الجملة:
تم تأكيد طلبك 🌷
وبيكون جاهز خلال 15 دقيقة إن شاء الله 🍕
بعد التأكيد اطلب منه يرسل اللوكيشن إذا يبي توصيل.

إذا طُلب منك الترحيب، استخدم هذا النص فقط:
ياهلا 👋
أنا Pizza Peel 🍕
أزين بيتزا نابولي بالقصيم 😋
وش مشتهي يا خلفهم؟
`;

  const userMessage = shouldGreet
    ? `هذه أول تحية من العميل. رحب به فقط.\n\nرسالة العميل: ${body || "هلا"}`
    : body || "هلا";

  history.push({ role: "user", content: userMessage });

  if (history.length > 10) {
    history.splice(0, history.length - 10);
  }

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
        max_tokens: 250,
        system: systemPrompt,
        messages: history
      })
    });

    const data = await response.json();

    const reply =
      data?.content?.[0]?.text?.trim() ||
      "ياهلا 👋 أنا Pizza Peel 🍕 وش مشتهي يا خلفهم؟";

    history.push({ role: "assistant", content: reply });

    if (shouldGreet && from) {
      greetedUsers.add(from);
    }

    // إرسال الطلب لرقمك لما Claude يؤكد الطلب أو يستلم لوكيشن
    const isConfirmed = reply.includes("تم تأكيد طلبك");

    if (isConfirmed || isLocation) {
      const lastOrders = history
        .slice(-6)
        .map(m => `${m.role === "user" ? "العميل" : "البوت"}: ${m.content}`)
        .join("\n");

      await fetch(
        "https://api.twilio.com/2010-04-01/Accounts/" +
          process.env.TWILIO_ACCOUNT_SID +
          "/Messages.json",
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(
                process.env.TWILIO_ACCOUNT_SID +
                  ":" +
                  process.env.TWILIO_AUTH_TOKEN
              ).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            From: "whatsapp:+14155238886",
            To: "whatsapp:+966534459277",
            Body: `🔔 طلب جديد!\nمن: ${from}\n\n${lastOrders}${
              isLocation
                ? `\n\n📍 اللوكيشن: https://maps.google.com/?q=${latitude},${longitude}`
                : ""
            }`
          })
        }
      );
    }

    const twiml = `
<Response>
<Message>${escapeXml(reply)}</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send(twiml);
  } catch (err) {
    const twiml = `
<Response>
<Message>ياهلا 👋 صار خطأ بسيط، جرب مرة ثانية.</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send(twiml);
  }
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
