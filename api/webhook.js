export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = (req.body?.Body || "").trim();

  const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

المطعم متخصص بالبيتزا النابولية والأكلات الإيطالية.

معلومات المطعم:
- الدوام: من 4 مساء إلى 1 صباحاً
- التوصيل: 10 ريال

المنيو:

🍕 البيتزا
- مارجريتا 32
- بيبروني 36
- الأجبان الأربعة 36
- الفريدو 37
- مسخن 39
- ترفل 42
- سموكي بريسكيت 43

🍝 الباستا
- بيف بينك باستا 31
- ترافل ريغاتوني 31

🍟 الجانبيات
- فرايز 10
- ترافل فرايز 19
- كرات الريزوتو 22

🥫 الصوصات
- رانش 2
- باربكيو 2
- عسل سبايسي 3

الأسلوب:
- تكلم بالعربية بلهجة قصيمية خفيفة
- ردود قصيرة ومرتبة ومناسبة لواتساب
- استخدم إيموجي بشكل بسيط ولطيف
- لا تخترع أصناف أو أسعار غير موجودة

قواعد مهمة:
- إذا كانت الرسالة الأولى أو كانت تحية مثل: هلا، السلام عليكم، مرحبا
  فابدأ برسالة ترحيب مرتبة بهذا المعنى:
  هلا بك في Pizza Peel 🍕✨
  متخصصين بالبيتزا النابولية والأكلات الإيطالية 😋
  ⏰ دوامنا من 4 العصر إلى 1 الليل
  🚗 التوصيل بـ 10 ريال
  عندنا بيتزا وباستا وجانبيات
  وش يفتح نفسك اليوم؟

- إذا قال العميل "نص ونص" أو "نص بيتزا"
  افهم أنه يقصد بيتزا كاملة بنكهتين مختلفتين

- إذا ذكر نكهتين مثل:
  "نص ترفل ونص مارجريتا"
  أو "ترفل ومارجريتا"
  فاحسب السعر بجمع نصف سعر كل نوع

مثال:
نصف ترفل = 21
نصف مارجريتا = 16
المجموع = 37

- إذا ذكر نكهة وحدة فقط مع كلمة "نص"
  اسأله عن النكهة الثانية

- إذا طلب أكثر من صنف، اجمع الأسعار
- إذا طلب توصيل، أضف 10 ريال
- اعرض الحساب بشكل واضح ومرتب
- بعد الحساب اسأله إذا يؤكد الطلب

- إذا أكد العميل الطلب بكلمات مثل:
  أكيد، أكد، تمام، تم، اوكي
  فرد عليه:
  أبشر 🌷
  تم تأكيد طلبك
  وبيكون جاهز خلال 15 دقيقة إن شاء الله 🍕
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
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
      "هلا بك في Pizza Peel 🍕 وش يفتح نفسك اليوم؟";

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
<Message>هلا بك في Pizza Peel 🍕 صار خطأ بسيط، جرب مرة ثانية.</Message>
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
