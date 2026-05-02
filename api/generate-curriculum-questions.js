import Anthropic from "@anthropic-ai/sdk";
import { curriculum } from "../lib/curriculum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { level, count } = req.body;
  if (!level || !count) {
    return res.status(400).json({ error: "Missing level or count" });
  }

  const levelData = curriculum.find(l => l.id === Number(level));
  if (!levelData) {
    return res.status(400).json({ error: `רמה ${level} לא קיימת` });
  }

  const formatGuide = levelData.answerFormat === "set"
    ? "תשובות הן תיאורים מילוליים או קבוצות כגון ℝ, x≠3, x>0."
    : levelData.answerFormat === "inequality"
    ? "תשובות בסימון אי-שוויון בלבד: x≠a, x≥a, x>a וכדומה."
    : "תשובות בשני סימונים: סימון אי-שוויון (x>2) וסימון קטעים ((2,∞)). ערבב בין שני הסימונים באפשרויות השונות.";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `אתה מעצב שאלות למשחק חידון מתמטיקה בעברית לתלמידי תיכון.

צור ${count} שאלות לרמה ${level} מתוך 30 בנושא תחום הגדרה של פונקציות.

## פרטי הרמה:
- כותרת: ${levelData.title}
- מושג: ${levelData.concept}
- הסבר לתלמיד: ${levelData.explanation}

## הנחיות ליצירת השאלות:
${levelData.promptExtra}

## כללי עיצוב:
- כל הטקסט בעברית
- השתמש ב-$...$ עבור כל ביטוי מתמטי
- ${formatGuide}
- תשובות שגויות חייבות להיות סבירות — טעויות נפוצות של תלמידים
- אין שדה "explanation"
- השאלות צריכות להרגיש כמו שיעור קוהרנטי
- אל תחזור על אותה פונקציה פעמיים
- שמור על קושי עולה בתוך הרמה

## פורמט החזרה — JSON בלבד (ללא טקסט נוסף):
[
  {
    "text": "טקסט השאלה",
    "options": ["תשובה1", "תשובה2", "תשובה3", "תשובה4"],
    "correctIndex": 0
  }
]
correctIndex הוא מספר בין 0 ל-3.`
      }]
    });

    const raw = message.content[0].text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "תגובה לא תקינה מ-AI" });
    }

    return res.status(200).json({
      questions: JSON.parse(jsonMatch[0]),
      level,
      levelTitle: levelData.title,
      levelConcept: levelData.concept,
    });
  } catch (e) {
    console.error("Curriculum generation error:", e);
    return res.status(500).json({ error: e.message || "שגיאת שרת פנימית" });
  }
}
