import Anthropic from "@anthropic-ai/sdk";
import { curriculum, QUESTIONS_PER_LEVEL } from "../lib/curriculum.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { levelId, description, count } = req.body;
  const questionsCount = count || QUESTIONS_PER_LEVEL;

  const levelData = curriculum.find(l => l.id === Number(levelId));
  const levelTitle = levelData?.title || `רמה ${levelId}`;
  const levelHints = levelData?.promptExtra || "";

  const userDirective = description
    ? `## הנחיות המשתמש — עדיפות עליונה, עקוב אחריהן במדויק:\n${description}\n`
    : "";
  const defaultHints = !description && levelHints
    ? `## הנחיות ברירת מחדל לרמה:\n${levelHints}\n`
    : "";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `אתה יוצר שאלות לחידון לתלמידי תיכון ישראלים.

צור בדיוק ${questionsCount} שאלות לרמה ${levelId}: "${levelTitle}".

${userDirective}${defaultHints}## חוקים:
- כל הטקסט בעברית
- השתמש ב-$...$ לכל ביטוי מתמטי
- 4 אפשרויות תשובה — אחת נכונה, שלוש שגויות סבירות (טעויות תלמידים)
- אין שדה explanation
- אל תחזור על אותה שאלה פעמיים
- כל שאלה חייבת לכלול שדה "hint" — רמז קצר (משפט אחד או שניים) נכון מתמטית, שמכוון את התלמיד לדרך הפתרון מבלי לתת את התשובה ישירות

## פורמט — JSON בלבד:
[{"text":"...","options":["...","...","...","..."],"correctIndex":0,"hint":"..."}]`
      }]
    });

    const raw = message.content[0].text.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: "תגובה לא תקינה מ-AI" });

    return res.status(200).json({ questions: JSON.parse(match[0]) });
  } catch (e) {
    console.error("generate-level-questions error:", e);
    return res.status(500).json({ error: e.message || "שגיאת שרת" });
  }
}
