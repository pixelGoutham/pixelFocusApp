const { GoogleGenAI } = require('@google/genai');
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const taskSchema = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title/Description' },
          subject: { type: 'string', description: 'Subject name (must match existing)' },
          date: { type: 'string', nullable: true, description: 'YYYY-MM-DD or null if not specified' },
          startTime: { type: 'string', nullable: true, description: 'HH:MM format or null' },
          quadrant: {
            type: 'string',
            enum: ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'neither'],
            description: 'Eisenhower quadrant'
          }
        },
        required: ['title', 'subject', 'quadrant'],
        additionalProperties: false
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
};

function getDefaultTime(dateStr) {
  if (!dateStr) return '18:00';
  const day = new Date(dateStr).getDay();
  return (day === 0 || day === 6) ? '09:00' : '18:00';
}

function buildContext(settings, sessions) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const nowTime = now.toTimeString().slice(0, 5);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().split('T')[0];

  const friday = new Date(now);
  const dayOfWeekNum = now.getDay();
  const daysUntilFriday = (5 - dayOfWeekNum + 7) % 7 || 7;
  friday.setDate(now.getDate() + daysUntilFriday);
  const fridayDate = friday.toISOString().split('T')[0];

  const nextMonday = new Date(now);
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const nextMondayDate = nextMonday.toISOString().split('T')[0];

  const recentSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    const diffDays = (now - sessionDate) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });

  const hourCounts = {};
  const dayCounts = {};
  recentSessions.forEach(s => {
    const hour = parseInt(s.startTime?.split(':')[0] || '18');
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    const day = new Date(s.date).getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const commonHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  const commonDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => parseInt(d));

  return {
    userName: settings.userName || 'Student',
    subjects: (settings.subjects || []).map(s => s.name),
    commonHours: commonHours.length ? commonHours : [18, 19, 20],
    commonDays: commonDays.length ? commonDays : [1, 2, 3, 4],
    today,
    dayOfWeek,
    now: nowTime,
    tomorrowDate,
    fridayDate,
    nextMondayDate,
  };
}

function buildPrompt(input, ctx) {
  return `Extract tasks from student rant. Return ONLY JSON.

CONTEXT:
- Name: ${ctx.userName}
- Subjects: ${ctx.subjects.join(', ') || 'None'}
- Peak study hours: ${ctx.commonHours.join(', ')}h, days ${ctx.commonDays.join(', ')} (Mon=1)
- Today: ${ctx.today} (${ctx.dayOfWeek}), Now: ${ctx.now}
- Tomorrow: ${ctx.tomorrowDate}, Friday: ${ctx.fridayDate}, Next Monday: ${ctx.nextMondayDate}

RULES:
1. Subject: MUST match list exactly. Fuzzy match: "phys" to "Physics", "math" to "Mathematics". No new subjects.
2. Date: "tomorrow" to ${ctx.tomorrowDate}, "friday" to ${ctx.fridayDate}, "next monday" to ${ctx.nextMondayDate}, "next week" to Mon-Fri next week. Unknown to null.
3. Time: "morning" to 09:00, "afternoon" to 14:00, "evening" to 18:00, "night" to 21:00, HH:MM to as-is. Unknown to null (default: weekdays 18:00, weekends 09:00).
4. Quadrant: YOU decide (urgent-important / not-urgent-important / urgent-not-important / neither).
5. If unsure on date/time to null.
6. Output ONLY : {"tasks":[{"title", "subject", "date", "startTime", "quadrant"}]}

RANT:
${input}`;
}

function parseResponse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No valid JSON in response');
  }
}

function normalizeTasks(parsed, subjects) {
  if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
    throw new Error('Invalid response: missing tasks array');
  }
  // meow 
  const validQuadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'neither'];
  const subjectSet = new Set(subjects.map(s => s.toLowerCase()));

  return parsed.tasks
    .map(t => ({
      title: String(t.title || '').trim(),
      subject: String(t.subject || '').trim(),
      date: t.date ? String(t.date).trim() : null,
      startTime: t.startTime ? String(t.startTime).trim() : null,
      quadrant: validQuadrants.includes(t.quadrant) ? t.quadrant : 'neither',
    }))
    .filter(t => t.title && subjectSet.has(t.subject.toLowerCase()))
    .map(t => ({
      ...t,
      startTime: t.startTime || (t.date ? (new Date(t.date).getDay() === 0 || new Date(t.date).getDay() === 6 ? '09:00' : '18:00') : '18:00'),
    }));
}

async function extractTasksFromText(userInput, settings = {}, sessions = []) {
  try {
    const ctx = buildContext(settings, sessions);
    const prompt = buildPrompt(userInput, ctx);

    const interaction = await genAI.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: taskSchema,
      },
    });

    const text = interaction.output_text;
    const parsed = JSON.parse(text);
    return normalizeTasks(parsed, ctx.subjects);
  } catch (error) {
    console.error('Pixel Flow extraction failed:', error);
    throw error;
  }
}

module.exports = { extractTasksFromText };