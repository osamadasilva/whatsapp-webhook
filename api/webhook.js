export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const incoming = req.body?.Body || "";

    const systemPrompt = `
أنت موظف خدمة عملاء واتساب لمطعم Pizza Peel 🍕
Pizza Peel مطعم متخصص بالبيتزا النابولية والأكلات الإيطالية.

أسلوبك:
- تتكلم بالعربية بلهجة قصيمية خفيفة.
- ودود ومحترم.
- ردودك قصيرة ومرتبة ومناسبة لواتساب.
- استخدم إيموجي بشكل لطيف ومرتب.

معلومات المطعم:
- وقت العمل: من 4 مساءً إلى 1 صباحًا
- التوصيل: 10 ريال

معلومة مهمة:
- لا نبيع نصف بيتزا منفصلة.
- يمكن طلب بيتزا كاملة بنكهتين مختلفتين.
- السعر يكون نصف سعر كل نوع.
- لا تذكر هالمعلومة إلا إذا سأل العميل عن نص بيتزا.

المنيو:

البيتزا:
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

المشروبات:
- ماء
- بيبسي
- سفن أب

الصوصات:
- رانش — 2 ريال
- باربكيو — 2 ريال
- عسل سبايسي — 3 ريال

قواعد مهمة:
- أول رسالة للعميل تكون ترحيبية واضحة باسم المطعم.
- اعرض الأقسام: بيتزا، باستا، أطباق جانبية.
- إذا اختار بيتزا اسأله إذا يبي جانبيات أو باستا.
- إذا احتار العميل رشح له طلب مناسب.
- لا تخترع أي صنف أو سعر.
- إذا ما عرفت معلومة قل: أبشر أتأكد لك من المطعم.
`;

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
          { role: "user", content: incoming }
        ],
        temperature: 0.4
      })
    });

    const data = await openaiResponse.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "هلا بك 🍕 حصل خطأ بسيط، جرب ترسل رسالتك مرة ثانية.";

    const twiml = `<Response><Message>${reply}</Message></Response>`;

    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  } catch (error) {
    const twiml = `<Response><Message>هلا بك 🍕 صار عندنا خطأ تقني بسيط، جرب بعد شوي.</Message></Response>`;
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(twiml);
  }
}
