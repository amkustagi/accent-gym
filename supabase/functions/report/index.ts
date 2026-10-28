// In-app problem reports and ideas → a clean GitHub issue, filed automatically.
// The user taps Send; this function asks Claude to turn what they said (plus the screenshot and
// device details) into a proper ticket, uploads the screenshot, and opens the issue.
// No sign-in needed. Secrets: GITHUB_TOKEN (fine-grained: Issues + Contents read/write on the repo),
// ANTHROPIC_API_KEY. Optional: GITHUB_REPO, REPORT_AI_MODEL, REPORT_HOURLY_LIMIT.

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const REPO = Deno.env.get('GITHUB_REPO') ?? 'amkustagi/accent-gym';
const GH = Deno.env.get('GITHUB_TOKEN') ?? '';
const AI_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = Deno.env.get('REPORT_AI_MODEL') ?? 'claude-haiku-5-5';
const HOURLY = Number(Deno.env.get('REPORT_HOURLY_LIMIT') ?? '12');
const SHOT_BRANCH = 'feedback-assets';

type Kind = 'bug' | 'idea' | 'other';
interface Body {
  id: string;
  kind: Kind;
  text: string;
  /** Title made on the phone, used if the AI is unavailable. */
  fallbackTitle: string;
  /** Feature the user was on, e.g. "Shadowing". */
  area?: string;
  diagnostics?: Record<string, unknown>;
  /** data:image/jpeg;base64,… */
  screenshot?: string;
}
interface Ticket {
  title: string;
  type: 'bug' | 'idea' | 'question';
  summary: string;
  steps: string[];
  expected: string;
  actual: string;
  area: string;
}

// Best-effort abuse guard per server instance.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600e3);
  list.push(now);
  hits.set(ip, list);
  return list.length > HOURLY;
}

const gh = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${GH}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'speakco-report', ...(init.headers ?? {}) },
  });

const SYSTEM = `You turn a user's in-app report about the Speakco app into a GitHub ticket a developer can act on.
Speakco is a phone app for speaking confidently and directly at work. Screens and features: Today (daily plan), Practice (courses, drills, lessons), Speak, Accent (accent goal, sound lessons, Shadowing = listen to a model line and repeat it), Progress, Settings.
Drills: Warm-up (guided voice warm-up), Meeting simulator (answer a workplace scenario, then optional follow-up questions), Pressure round, Swaps (weak phrases), Pace trainer, Pause power, Vocal variety, Clarity/tongue twisters, Pronunciation sound lessons, Accent check, Video presence, Courses with lessons. The model voice is the app's text-to-speech voice; the coach is an animated character that talks.
The user usually speaks the report, so the text comes from speech-to-text and has recognition errors and filler. Work out what they meant using the screen they were on, the recent screens and the screenshot. Do not invent details that aren't supported.
Reply with ONLY a JSON object:
{"title": specific, plain-English, sentence case, max 65 characters, no trailing period, no "Bug:"/"Problem:" prefix (e.g. "Shadowing: second take doesn't record"),
 "type": "bug" | "idea" | "question",
 "summary": 1-2 clear sentences of what's wrong or what they want,
 "steps": short steps to reproduce if it's a bug and you can infer them, else [],
 "expected": what should happen ("" if unclear),
 "actual": what happens instead ("" if unclear),
 "area": the screen or feature, 1-3 words}`;

async function writeTicket(b: Body): Promise<Ticket | null> {
  if (!AI_KEY) return null;
  const d = b.diagnostics ?? {};
  const facts = {
    kind: b.kind,
    area: b.area,
    screen: d.screen,
    recentScreens: d.recentScreens,
    recentErrors: d.recentErrors,
    version: d.version,
    platform: d.platform,
  };
  const content: unknown[] = [];
  const m = b.screenshot?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (m) content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  content.push({ type: 'text', text: `What the user said:\n"""${b.text}"""\n\nContext: ${JSON.stringify(facts)}${m ? '\nThe image is a screenshot of the screen they were on (typed text is blanked out).' : ''}` });
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system: SYSTEM, messages: [{ role: 'user', content }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
    const p = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Partial<Ticket>;
    if (!p.title) return null;
    return {
      title: String(p.title).replace(/\s+/g, ' ').trim().replace(/[.]$/, '').slice(0, 80),
      type: p.type === 'idea' || p.type === 'question' ? p.type : 'bug',
      summary: String(p.summary ?? ''),
      steps: Array.isArray(p.steps) ? p.steps.map(String).slice(0, 8) : [],
      expected: String(p.expected ?? ''),
      actual: String(p.actual ?? ''),
      area: String(p.area ?? b.area ?? ''),
    };
  } catch {
    return null;
  }
}

/** Stores the screenshot on a side branch (deploys only run on main) and returns its URL. */
async function uploadShot(id: string, dataUrl: string): Promise<string | null> {
  const m = dataUrl.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!m) return null;
  let ref = await gh(`/repos/${REPO}/git/ref/heads/${SHOT_BRANCH}`);
  if (ref.status === 404) {
    const repo = await (await gh(`/repos/${REPO}`)).json();
    const base = await (await gh(`/repos/${REPO}/git/ref/heads/${repo.default_branch}`)).json();
    ref = await gh(`/repos/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${SHOT_BRANCH}`, sha: base.object.sha }) });
    if (!ref.ok) return null;
  }
  const path = `feedback/${new Date().toISOString().slice(0, 10)}-${id.replace(/[^a-z0-9-]/gi, '')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  const put = await gh(`/repos/${REPO}/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: `Screenshot for report ${id}`, content: m[2], branch: SHOT_BRANCH }) });
  if (!put.ok && put.status !== 422) return null; // 422: already uploaded on an earlier try
  return `https://raw.githubusercontent.com/${REPO}/${SHOT_BRANCH}/${path}`;
}

/** An earlier attempt may have filed the ticket even though the phone never heard back. */
async function existing(id: string): Promise<{ number: number; html_url: string; title: string } | null> {
  const q = encodeURIComponent(`repo:${REPO} is:issue in:body "report-id: ${id}"`);
  const res = await gh(`/search/issues?q=${q}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0] ?? null;
}

function issueBody(b: Body, t: Ticket | null, shot: string | null): string {
  const d = b.diagnostics ?? {};
  const lines: string[] = [];
  if (t?.summary) lines.push(t.summary, '');
  if (t?.steps.length) lines.push('**Steps**', ...t.steps.map((s, i) => `${i + 1}. ${s}`), '');
  if (t?.expected) lines.push(`**Expected:** ${t.expected}`);
  if (t?.actual) lines.push(`**Actual:** ${t.actual}`);
  if (t?.expected || t?.actual) lines.push('');
  if (shot) lines.push(`<img src="${shot}" alt="Screenshot" width="300">`, '');
  lines.push('**What the user said**', ...b.text.split('\n').map((l) => `> ${l}`), '');
  lines.push(`Area: ${t?.area || b.area || 'unknown'} · Speakco ${d.version ?? '?'} · ${d.platform ?? ''}`.trim(), '');
  if (Object.keys(d).length) lines.push('<details><summary>Device details</summary>', '', '```json', JSON.stringify(d, null, 2), '```', '</details>', '');
  lines.push(`<sub>Filed from the app${t ? ', written up by AI from the user\'s words' : ''}. report-id: ${b.id}</sub>`);
  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only.' }, 405);
  if (!GH) return json({ error: 'Reporting is not set up on the server.' }, 503);

  const b = (await req.json().catch(() => null)) as Body | null;
  if (!b || typeof b.text !== 'string' || typeof b.id !== 'string' || !['bug', 'idea', 'other'].includes(b.kind)) return json({ error: 'Bad request.' }, 400);
  const text = b.text.trim();
  if (text.length < 3 || text.length > 4000 || (b.screenshot && b.screenshot.length > 4_000_000)) return json({ error: 'Report is empty or too long.' }, 400);
  b.text = text;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (limited(ip)) return json({ error: 'Too many reports. Try again in an hour.' }, 429);

  const prior = await existing(b.id);
  if (prior) return json({ number: prior.number, url: prior.html_url, title: prior.title });

  const [ticket, shot] = await Promise.all([writeTicket(b), b.screenshot ? uploadShot(b.id, b.screenshot).catch(() => null) : Promise.resolve(null)]);
  const type = ticket?.type ?? (b.kind === 'idea' ? 'idea' : b.kind === 'other' ? 'question' : 'bug');
  const title = ticket?.title || b.fallbackTitle.slice(0, 80) || 'Report from the app';
  const labels = ['from-app', type === 'bug' ? 'bug' : type === 'idea' ? 'enhancement' : 'question'];

  const res = await gh(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify({ title, body: issueBody(b, ticket, shot), labels }) });
  if (!res.ok) return json({ error: `GitHub said ${res.status}.` }, 502);
  const issue = await res.json();
  return json({ number: issue.number, url: issue.html_url, title: issue.title, summary: ticket?.summary ?? '' });
});
