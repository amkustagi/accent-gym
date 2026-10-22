// AI features: coaching, follow-up questions (role-play), and fresh scenarios.
// Uses the user's own Claude API key, or the server proxy for signed-in Pro accounts.
import type { Scenario } from '../content/scenarios';
import { roleById } from '../content/roles';
import { worldLine } from '../learn/learner';
import { getState, type State } from '../store/store';
import { aiViaServer, backendEnabled, isPro } from './backend';

const MODEL = 'claude-sonnet-5-5';

export function aiAvailable(s: State): 'key' | 'server' | null {
  if (s.settings.aiKey) return 'key';
  if (backendEnabled && s.account && isPro(s)) return 'server';
  return null;
}

async function callDirect(key: string, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('The API key was rejected. Check it in Settings.');
    if (res.status === 429) throw new Error('Rate limited. Try again in a minute.');
    throw new Error(`The AI coach is unavailable (${res.status}).`);
  }
  const data = await res.json();
  return data?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
}

async function call(system: string, user: string, maxTokens = 700): Promise<string> {
  const s = getState();
  const via = aiAvailable(s);
  if (via === 'key') return callDirect(s.settings.aiKey, system, user, maxTokens);
  if (via === 'server') return aiViaServer(system, user, maxTokens);
  throw new Error('AI features need Pro or your own API key (Settings › AI coach).');
}

function json<T>(text: string): T {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  return JSON.parse(text.slice(start, end + 1)) as T;
}

function profileLine(s: State): string {
  const p = s.profile;
  const role = p.role === 'custom' ? p.customRole : roleById(p.role).name;
  const world = worldLine(s);
  return `Speaker: ${role || 'professional'}${p.industry ? ` in ${p.industry}` : ''}, ${p.seniority} level${p.nativeLanguage ? `, native language ${p.nativeLanguage}` : ''}. Goal: ${p.goal}.${world ? ` ${world} Use these real names where they fit.` : ''}`;
}

export interface CoachReply {
  summary: string;
  strengths: string[];
  fixes: string[];
  rewrite: string;
}

export async function coach(args: { prompt: string; frame?: string[]; transcript: string; metrics: Record<string, unknown> }): Promise<CoachReply> {
  const system =
    'You are an executive speaking coach. The user practiced answering a workplace prompt out loud; you get the speech-to-text transcript (it may contain recognition errors) and measured delivery metrics. ' +
    'Coach confident, clear, concise North American business English. Be direct and specific, warm but not gushing. ' +
    'Reply with ONLY a JSON object: {"summary": one sentence verdict, "strengths": up to 2 short strings, "fixes": up to 3 short actionable strings quoting their words where useful, "rewrite": a stronger version of their answer in their own voice, same facts, under 90 words, no filler or hedges}.';
  const user = `${profileLine(getState())}\nPrompt: ${args.prompt}\n${args.frame ? `Suggested structure: ${args.frame.join(' → ')}\n` : ''}Metrics: ${JSON.stringify(args.metrics)}\nTranscript: """${args.transcript}"""`;
  const p = json<Partial<CoachReply>>(await call(system, user));
  return { summary: p.summary ?? '', strengths: p.strengths ?? [], fixes: p.fixes ?? [], rewrite: p.rewrite ?? '' };
}

/** Next question from a realistic, slightly skeptical listener, given the conversation so far. */
export async function followUp(args: { scenario: Scenario; turns: { q: string; a: string }[] }): Promise<{ question: string; persona: string }> {
  const system =
    'You role-play the other person in a workplace conversation so the user can practice speaking. Ask ONE realistic follow-up question or challenge that the person in the scenario would ask next, based on what the user just said. ' +
    'Be concise (under 30 words), natural spoken English, slightly skeptical but professional. Escalate difficulty gently each turn. ' +
    'Reply with ONLY JSON: {"persona": who is speaking, 2-5 words, "question": the line}.';
  const convo = args.turns.map((t, i) => `Turn ${i + 1}\nThem: ${t.q}\nUser: ${t.a}`).join('\n');
  const user = `${profileLine(getState())}\nScenario: ${args.scenario.context}. ${args.scenario.prompt}\n${convo}`;
  const p = json<{ question?: string; persona?: string }>(await call(system, user, 200));
  return { question: p.question ?? 'Can you say more about that?', persona: p.persona ?? 'Your colleague' };
}

/** Fresh, personalized scenarios. */
export async function freshScenarios(n = 5): Promise<Scenario[]> {
  const s = getState();
  const system =
    'You write short speaking-practice scenarios for workplace English. Each is a realistic moment from the speaker\'s actual job. ' +
    'Reply with ONLY a JSON array of objects: {"context": the setting in under 10 words, "prompt": what they must say, one sentence, "frame": 3 short structure steps, "secs": 30 to 90}.';
  const user = `${profileLine(s)}\nSituations they care about: ${s.profile.situations.join(', ') || 'meetings'}.\nWrite ${n} varied scenarios. Avoid generic ones.`;
  const arr = json<{ context: string; prompt: string; frame: string[]; secs: number }[]>(await call(system, user, 900));
  return arr.slice(0, n).map((x, i) => ({ id: `ai:${Date.now()}:${i}`, category: 'impromptu', context: x.context, prompt: x.prompt, frame: x.frame?.slice(0, 4) ?? ['Point', 'Reason', 'Example'], secs: Math.max(20, Math.min(120, x.secs || 45)) }));
}

export async function testKey(key: string): Promise<boolean> {
  try {
    await callDirect(key, 'Reply OK.', 'Say OK', 5);
    return true;
  } catch {
    return false;
  }
}
