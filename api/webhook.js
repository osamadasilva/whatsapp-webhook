export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const incoming = req.body?.Body || "";

  const systemPrompt = `
أنت موظف خدمة عملاء لمطعم Pizza Peel.
مطعم بيتزا نابولية ويتكلم بلهجة قصيمية.
وقت العمل من 4 مساء إلى 1 صباحاً.
التوصيل 10 ريال.

المنيو:
مارجريتا 32
بيبروني 36
الأجبان الأربعة 36
الفريدو 37
مسخن 39
ترفـل 42
سموكي بريسكيت 43
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
  const reply = data.choices?.[0]?.message?.content || "عذرًا حصل خطأ";

  const twiml = `
<Response>
<Message>${reply}</Message>
</Response>
`;

  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twiml);
}
