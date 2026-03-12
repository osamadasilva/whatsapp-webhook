export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const incoming = req.body?.Body || "";

    const systemPrompt = `
أنت موظف خدمة عملاء واتساب لمطعم Pizza Peel 🍕
مطعم متخصص بالبيتزا النابولية والأكلات الإيطالية.

أسلوبك:
- تتكلم بالعربية بلهجة قصيمية خفيفة.
- ودود ومحترم وسريع.
- ردودك قصيرة ومرتبة ومناسبة لواتساب.
- استخدم إيموجي بشكل لطيف ومرتب.

معلومات المطعم:
- وقت العمل: من 4 مساءً إلى 1 صباحًا
- التوصيل: 10 ريال

معلومة مهمة:
- إذا قال العميل "نص بيتزا" أو "نص ونص" فهذا يعني بيتزا كاملة بنكهتين.
- السعر يكون نصف سعر كل نكهة.
- إذا ذكر نكهة وحدة فقط، اسأله عن النكهة الثانية.
- لا ترفض طلب النص والنص.

المنيو:
- مارجريتا — 32 ريال
- بيبروني — 36 ريال
- الأجبان الأربعة — 36 ريال
- الفريدو — 37 ريال
- مسخن — 39 ريال
- ترفل — 42 ريال
- سموكي بريسكيت — 43 ريال

الأطباق الجانبية:
- فرايز — 10 ريال
- ترافل فرايز — 19 ريال
- كرات الريزوتو — 22 ريال

الباستا:
- بيف بينك باستا — 31 ريال
- ترافل ريغاتوني — 31 ريال

الصوصات:
- رانش — 2 ريال
- باربكيو — 2 ريال
- عسل سبايسي — 3 ريال

قواعد الحساب:
- إذا طلب العميل أكثر من صنف، اجمع الأسعار كاملة.
- إذا طلب بيتزا بنكهتين، احسب نصف سعر كل نوع ثم اجمعهما.
- إذا طلب توصيل، أضف 10 ريال.
- اعرض الحساب بشكل مرتب.
- إذا أكد الطلب، قل:
أبشر 🌷
تم تأكيد طلبك
وبيكون جاهز خلال ١٥ دقيقة إن شاء الله 🍕
`;

    if (!process.env.OPENAI_API_KEY) {
      const twiml = `<Response><Message>هلا بك 🍕 فيه مشكلة بالإعدادات: مفتاح OpenAI غير مضاف في Vercel.</Message></Response>`;
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(twiml);
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: incoming || "هلا" }
        ],
        temperature: 0.4,
        max_tokens: 300
      })
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      const errMsg = data?.error?.message || "OpenAI request failed";
      const twiml = `<Response><Message>هلا بك 🍕 صار خطأ من OpenAI: ${escapeXml(errMsg)}</Message></Response>`;
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(twiml);
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "هلا بك 🍕 وش تفتح نفسك اليوم؟";
    const twiml = `<Response><Message>${escapeXml(reply)}</Message></Response>`;

    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send(twiml);

  } catch (error) {
    const twiml = `<Response><Message>هلا بك 🍕 صار خطأ تقني بسيط: ${escapeXml(error.message || "unknown error")}</Message></Response>`;
    res.setHeader("Content-Type", "text/xml; charset=utf-8");
    return res.status(200).send(twiml);
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
