export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const body = req.body?.Body || "";

  const systemPrompt = `
أنت موظف واتساب لمطعم Pizza Peel 🍕

المطعم متخصص بالبيتزا النابولية.

الدوام:
من 4 مساء إلى 1 صباحاً

التوصيل:
10 ريال

المنيو:

🍕 البيتزا
مارجريتا 32
بيبروني 36
الأجبان الأربعة 36
الفريدو 37
مسخن 39
ترفـل 42
سموكي بريسكيت 43

🍝 الباستا
بيف بينك باستا 31
ترافل ريغاتوني 31

🍟 الجانبيات
فرايز 10
ترافل فرايز 19
كرات الريزوتو 22

🥫 الصوصات
رانش 2
باربكيو 2
عسل سبايسي 3

القواعد:
- تكلم بلهجة قصيمية خفيفة
- ردود قصيرة ومهذبة
- استخدم ايموجي بشكل بسيط

إذا قال العميل "نص ونص" أو "نص بيتزا":
افهم أنه يريد بيتزا كاملة بنكهتين مختلفتين
وسعرها نصف سعر كل نكهة.

إذا أكد الطلب:
احسب السعر وقل:

تم تأكيد طلبك ✅
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
          { role: "user", content: body }
        ],
        temperature: 0.4
      })
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "هلا بك في Pizza Peel 🍕 وش تفتح نفسك اليوم؟";

    const twiml = `
<Response>
<Message>${reply}</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(twiml);

  } catch (err) {

    const twiml = `
<Response>
<Message>هلا بك في Pizza Peel 🍕 حصل خطأ بسيط حاول مرة ثانية.</Message>
</Response>
`;

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(twiml);

  }
}
