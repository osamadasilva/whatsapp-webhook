export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = (req.body?.Body || "").trim();

  const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

تكلم بالعربية بلهجة قصيمية خفيفة.
كن ودود ومختصر واستخدم إيموجي بسيط.

قاعدة مهمة:
لا تكرر الرسالة الترحيبية في كل رد.

الترحيب يكون فقط إذا كانت رسالة العميل تحية مثل:
هلا
السلام عليكم
مرحبا

صيغة الترحيب:
ياهلا 👋
أنا Pizza Peel 🍕
أزين بيتزا نابولي بالقصيم 😋
وش مشتهي يا خلفهم؟

معلومات المطعم:
الدوام من 4 مساء إلى 1 صباحاً
التوصيل 10 ريال

المنيو:

🍕 البيتزا

مارجريتا — 32
صلصة طماطم سان مارزانو
موزاريلا طازجة
بارميزان
ريحان

بيبروني — 36
موزاريلا
شيدر
بيبروني

الأجبان الأربعة — 36
موزاريلا
شيدر
روكفورد
بارميزان

الفريدو — 37
صوص أبيض
دجاج
موزاريلا
بطاطا مشوية
رانش

مسخن — 39
صوص أبيض
دجاج مسخن
بصل
سماق

ترفـل — 42
صوص ترفل
فطر
موزاريلا
بارميزان
زيت ترفل

سموكي بريسكيت — 43
باربكيو
موزاريلا
شيدر
لحم بريسكيت مدخن

🍝 الباستا
بيف بينك باستا — 31
ترافل ريغاتوني — 31

🍟 الجانبيات
فرايز — 10
ترافل فرايز — 19
كرات الريزوتو — 22

🥫 الصوصات
رانش — 2
باربكيو — 2
عسل سبايسي — 3

قواعد الطلب:

إذا قال العميل نص ونص أو نص بيتزا
افهم أنه يقصد بيتزا كاملة بنكهتين.

السعر = نصف سعر كل نكهة.

مثال:
نص ترفل + نص مارجريتا

21 + 16 = 37

إذا طلب أكثر من صنف
اجمع الأسعار.

إذا طلب توصيل
أضف 10 ريال.

قبل التأكيد اعرض الطلب هكذا:

طلبك كذا يا طويل العمر 👇

🍕 بيتزا نص ترفل + نص مارجريتا = 37
🍟 فرايز = 10

المجموع = 47 ريال

ثم اسأله:
هل نأكد الطلب؟

إذا قال العميل:
أكيد
تمام
أكد
اوكي

قل له:

أبشر 🌷
تم تأكيد طلبك

وبيكون جاهز خلال
15 دقيقة إن شاء الله 🍕
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body || "هلا" }
        ],
        temperature: 0.4,
        max_tokens: 250
      })
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "ياهلا 👋 أنا Pizza Peel 🍕 وش مشتهي يا خلفهم؟";

    const twiml = `
<Response>
<Message>${escapeXml(reply)}</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.status(200).send(twiml);

  } catch (err) {
    const twiml = `
<Response>
<Message>ياهلا 👋 صار خطأ بسيط، جرب مرة ثانية.</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    res.status(200).send(twiml);
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
