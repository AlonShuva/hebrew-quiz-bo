import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { topic, count, level } = req.body;

  if (!topic || !count) {
    return res.status(400).json({ error: "Missing topic or count" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const useIntervalNotation = level >= 6;

  const answerFormatGuide = useIntervalNotation
    ? `תשובות חייבות לכלול גם סימון קטעים (למשל $(-\\infty, 3) \\cup (3, \\infty)$) וגם אי-שוויונות (למשל $x \\neq 3$) — ערבב בין שני הסימונים בין האפשרויות.`
    : `תשובות הן קבוצות כגון $\\mathbb{R}$, $x \\neq 3$, $x > 0$, $x \\geq 2$, $x \\neq 0 \\text{ ו-} x \\neq 5$ וכדומה.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `צור ${count} שאלות חידון מתמטיקה בעברית על הנושא: "${topic}" ברמה ${level}.

חוקים מחייבים:
- כל הטקסט בעברית
- השתמש ב-$...$ עבור כל ביטוי מתמטי (למשל $x \\neq 0$, $x \\geq 2$)
- ${answerFormatGuide}
- תשובות שגויות חייבות להיות סבירות — טעויות נפוצות של תלמידים (סימן לא נכון, שכחת ערך אחד, בלבול בין $\\geq$ ל-$>$, שגיאות off-by-one)
- אין שדה "explanation" — השחקן מגלה בעצמו
- השאלות ברמה זו צריכות להרגיש כמו שיעור קוהרנטי, לא אקראי
- אל תחזור על אותה פונקציה פעמיים
- כל שאלה היא על תחום הגדרה של פונקציה

החזר JSON בלבד (ללא טקסט נוסף), במבנה הבא:
[
  {
    "text": "טקסט השאלה",
    "options": ["תשובה1", "תשובה2", "תשובה3", "תשובה4"],
    "correctIndex": 0
  }
]
חשוב: correctIndex הוא מספר בין 0 ל-3.`
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "תגובה לא תקינה מ-AI" });
    }

    return res.status(200).json({ questions: JSON.parse(jsonMatch[0]), level });
  } catch (e) {
    console.error("AI generation error:", e);
    return res.status(500).json({ error: e.message || "שגיאת שרת פנימית" });
  }
}
