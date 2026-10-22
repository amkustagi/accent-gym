/// <reference lib="webworker" />
// Runs the Kokoro-82M neural voice off the main thread. The model (~90 MB) downloads once
// from Hugging Face and is cached by the browser for offline use.
import { KokoroTTS } from 'kokoro-js';

type In = { type: 'load' } | { type: 'speak'; id: number; text: string; voice: string };

let tts: KokoroTTS | null = null;
let loading: Promise<void> | null = null;

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

async function load() {
  if (tts) return;
  if (!loading) {
    loading = (async () => {
      const seen = new Map<string, { loaded: number; total: number }>();
      tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file && p.total) {
            seen.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
            let l = 0;
            let t = 0;
            seen.forEach((v) => {
              l += v.loaded;
              t += v.total;
            });
            post({ type: 'progress', loaded: l, total: t });
          }
        },
      });
    })();
  }
  await loading;
}

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      await load();
      post({ type: 'ready' });
    } else if (m.type === 'speak') {
      await load();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audio = await tts!.generate(m.text, { voice: m.voice as any });
      const blob = audio.toBlob();
      post({ type: 'audio', id: m.id, blob });
    }
  } catch (err) {
    loading = null;
    tts = null;
    post({ type: 'error', id: m.type === 'speak' ? m.id : undefined, message: String((err as Error)?.message ?? err) });
  }
};
