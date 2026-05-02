import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date().toISOString().split("T")[0];

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `צור שאלת אתגר יומי אחת לתחום הגדרה של פונקציות — רמת בגרות 5 יחידות.

## דרישות:
- שאלה קשה מאוד: שילוב של לפחות שלוש הגבלות שונות (שורש, שבר, לוגריתם, ערך מוחלט, הרכבה)
- "מצא את תחום ההגדרה של $f(x) = ...$"
- 4 אפשרויות — כתובות בסימון קטעים ובסימון אי-שוויון
- תשובות שגויות: טעויות קלאסיות של בגרות (נקודת קצה שגויה, פתוח/סגור, שכחת תנאי)
- כל הטקסט בעברית, $...$ לכל מתמטיקה
- אין שדה explanation
- תאריך: ${today} (לגיוון — אל תחזור על פונקציות מימים קודמים)

## פורמט — JSON בלבד:
{"text":"...","options":["...","...","...","..."],"correctIndex":0}`
      }]
    });

    const raw = message.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: "תגובה לא תקינה מ-AI" });

    return res.status(200).json({ question: JSON.parse(match[0]), date: today });
  } catch (e) {
    console.error("generate-daily-challenge error:", e);
    return res.status(500).json({ error: e.message || "שגיאת שרת" });
  }
}
