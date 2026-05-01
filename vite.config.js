import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import Anthropic from '@anthropic-ai/sdk'
import { curriculum, QUESTIONS_PER_LEVEL } from './lib/curriculum.js'

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
  })
}

function apiRoute(handler) {
  return async (req, res, next) => {
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })) }
    res.setHeader('Content-Type', 'application/json')
    try {
      const body = await parseBody(req)
      await handler(body, res)
    } catch (e) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: e.message }))
    }
  }
}

function apiPlugin(apiKey) {
  const client = new Anthropic({ apiKey })

  return {
    name: 'api-plugin',
    configureServer(server) {

      // /api/generate-level-questions
      server.middlewares.use('/api/generate-level-questions', apiRoute(async ({ levelId, description, count }, res) => {
        const questionsCount = count || QUESTIONS_PER_LEVEL
        const levelData = curriculum.find(l => l.id === Number(levelId))
        const levelTitle = levelData?.title || `רמה ${levelId}`
        const levelHints = levelData?.promptExtra || ''

        const userDirective = description
          ? `## הנחיות המשתמש — עדיפות עליונה, עקוב אחריהן במדויק:\n${description}\n`
          : ''
        const defaultHints = !description && levelHints
          ? `## הנחיות ברירת מחדל לרמה:\n${levelHints}\n`
          : ''

        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `אתה יוצר שאלות לחידון לתלמידי תיכון ישראלים.

צור בדיוק ${questionsCount} שאלות לרמה ${levelId}: "${levelTitle}".

${userDirective}${defaultHints}## חוקים:
- כל הטקסט בעברית
- השתמש ב-$...$ לכל ביטוי מתמטי
- 4 אפשרויות תשובה — אחת נכונה, שלוש שגויות סבירות
- אין שדה explanation
- אל תחזור על אותה שאלה פעמיים

## פורמט — JSON בלבד:
[{"text":"...","options":["...","...","...","..."],"correctIndex":0}]`
          }]
        })
        const raw = message.content[0].text.trim()
        const match = raw.match(/\[[\s\S]*\]/)
        if (!match) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'תגובה לא תקינה' })) }
        res.end(JSON.stringify({ questions: JSON.parse(match[0]) }))
      }))

      // /api/generate-daily-challenge
      server.middlewares.use('/api/generate-daily-challenge', apiRoute(async (_, res) => {
        const today = new Date().toISOString().split('T')[0]
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [{
            role: 'user',
            content: `צור שאלת אתגר יומי אחת לתחום הגדרה — רמת בגרות 5 יחידות.

## דרישות:
- שאלה קשה מאוד: שילוב של לפחות שלוש הגבלות (שורש, שבר, לוגריתם, ערך מוחלט)
- "מצא את תחום ההגדרה של $f(x) = ...$"
- 4 אפשרויות בסימון קטעים ואי-שוויון
- תשובות שגויות: טעויות קלאסיות של בגרות
- כל הטקסט בעברית, $...$ לכל מתמטיקה
- אין שדה explanation
- תאריך: ${today}

## פורמט — JSON בלבד:
{"text":"...","options":["...","...","...","..."],"correctIndex":0}`
          }]
        })
        const raw = message.content[0].text.trim()
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'תגובה לא תקינה' })) }
        res.end(JSON.stringify({ question: JSON.parse(match[0]), date: today }))
      }))

      // /api/generate-questions (existing custom prompt)
      server.middlewares.use('/api/generate-questions', apiRoute(async ({ topic, count, level }, res) => {
        if (!topic || !count) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Missing topic or count' })) }
        const useInterval = level >= 6
        const fmt = useInterval
          ? `תשובות בסימון קטעים ואי-שוויון.`
          : `תשובות: $\\mathbb{R}$, $x \\neq a$, $x \\geq a$ וכדומה.`
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `צור ${count} שאלות חידון תחום הגדרה בעברית על: "${topic}" ברמה ${level}.
כל שאלה: "מצא את תחום ההגדרה של $f(x)=...$". ${fmt}
תשובות שגויות סבירות. אין explanation. $...$ לכל מתמטיקה.
JSON בלבד: [{"text":"...","options":["...","...","...","..."],"correctIndex":0}]`
          }]
        })
        const raw = message.content[0].text.trim()
        const match = raw.match(/\[[\s\S]*\]/)
        if (!match) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'תגובה לא תקינה' })) }
        res.end(JSON.stringify({ questions: JSON.parse(match[0]), level }))
      }))

      // /api/generate-curriculum-questions (admin panel)
      server.middlewares.use('/api/generate-curriculum-questions', apiRoute(async ({ level, count }, res) => {
        const levelData = curriculum.find(l => l.id === Number(level))
        if (!levelData) { res.statusCode = 400; return res.end(JSON.stringify({ error: `רמה ${level} לא קיימת` })) }
        const message = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `צור ${count} שאלות תחום הגדרה לרמה ${levelData.id}: "${levelData.title}".
${levelData.promptExtra}
כל שאלה: "מצא את תחום ההגדרה של $f(x)=...$". אין explanation. $...$ לכל מתמטיקה.
JSON בלבד: [{"text":"...","options":["...","...","...","..."],"correctIndex":0}]`
          }]
        })
        const raw = message.content[0].text.trim()
        const match = raw.match(/\[[\s\S]*\]/)
        if (!match) { res.statusCode = 500; return res.end(JSON.stringify({ error: 'תגובה לא תקינה' })) }
        res.end(JSON.stringify({ questions: JSON.parse(match[0]), level, levelTitle: levelData.title }))
      }))
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiPlugin(env.ANTHROPIC_API_KEY)],
  }
})
