// Optional AI coach: calls the Claude API directly from the phone with the user's own key.

export interface CoachReply {
  summary: string;
  strengths: string[];
  fixes: string[];
  rewrite: string;
}

export async function coach(key: string, args: { prompt: string; frame?: string[]; transcript: string; metrics: Record<string, unknown> }): Promise<CoachReply> {
  const system =
    'You are an executive speaking coach. The user practiced answering a workplace prompt out loud; you get the speech-to-text transcript (it may contain recognition errors) and measured delivery metrics. ' +
    'Coach confident, clear, concise North American business English. Be direct and specific, warm but not gushing. ' +
    'Reply with ONLY a JSON object: {"summary": one sentence verdict, "strengths": up to 2 short strings, "fixes": up to 3 short actionable strings quoting their words where useful, "rewrite": a stronger version of their answer in their own voice, same facts, under 90 words, no filler or hedges}.';
  const user = `Prompt: ${args.prompt}\n${args.frame ? `Suggested structure: ${args.frame.join(' → ')}\n` : ''}Metrics: ${JSON.stringify(args.metrics)}\nTranscript: """${args.transcript}"""`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('The API key was rejected. Check it in Settings.');
    if (res.status === 429) throw new Error('Rate limited. Try again in a minute.');
    throw new Error(`The AI coach is unavailable (${res.status}). ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const text: string = data?.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json) as Partial<CoachReply>;
  return { summary: parsed.summary ?? '', strengths: parsed.strengths ?? [], fixes: parsed.fixes ?? [], rewrite: parsed.rewrite ?? '' };
}

export async function testKey(key: string): Promise<boolean> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] }),
  }).catch(() => null);
  return !!res?.ok;
}
