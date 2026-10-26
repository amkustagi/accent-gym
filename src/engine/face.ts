// Video presence: reads the front camera on the phone and measures what a video-call audience sees:
// eye contact with the lens, framing, lighting, smiling and head stillness. Nothing is recorded or sent;
// frames are analyzed in memory and dropped. The face model (MediaPipe) loads only when first used.

export interface FaceFrame {
  t: number;
  present: boolean;
  /** Head turn left/right and up/down, in degrees (0 = facing the camera). */
  yaw: number;
  pitch: number;
  /** 0–1. */
  smile: number;
  /** Face center (0–1 of the frame) and height as a share of the frame. */
  cx: number;
  cy: number;
  size: number;
  /** Average brightness of the frame, 0–255. */
  light: number;
}

export interface PresenceSummary {
  seconds: number;
  /** Share of time a face was in view. */
  facePct: number;
  /** Share of face-time looking at the lens. */
  eyeContactPct: number;
  framing: 'good' | 'far' | 'close' | 'off-center' | 'unknown';
  lighting: 'good' | 'dark' | 'bright' | 'unknown';
  smilePct: number;
  /** 0–100: how still the head stayed (100 = very steady). */
  stillness: number;
}

const WASM_PATH = './mediapipe';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Head pose from MediaPipe's 4×4 column-major transformation matrix. */
export function poseFromMatrix(d: ArrayLike<number>): { yaw: number; pitch: number } {
  const deg = 180 / Math.PI;
  const yaw = Math.atan2(d[8], d[10]) * deg;
  const pitch = Math.asin(Math.max(-1, Math.min(1, -d[9]))) * deg;
  return { yaw, pitch };
}

const EYE_CONTACT_DEG = { yaw: 15, pitch: 14 };

export function summarizePresence(frames: FaceFrame[]): PresenceSummary {
  const seconds = frames.length ? (frames[frames.length - 1].t - frames[0].t) / 1000 : 0;
  const seen = frames.filter((f) => f.present);
  if (!frames.length || !seen.length)
    return { seconds, facePct: 0, eyeContactPct: 0, framing: 'unknown', lighting: frames.length ? lightOf(frames) : 'unknown', smilePct: 0, stillness: 0 };
  const pct = (n: number, of: number) => Math.round((n / Math.max(1, of)) * 100);
  const looking = seen.filter((f) => Math.abs(f.yaw) <= EYE_CONTACT_DEG.yaw && Math.abs(f.pitch) <= EYE_CONTACT_DEG.pitch);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const size = avg(seen.map((f) => f.size));
  const cx = avg(seen.map((f) => f.cx));
  const cy = avg(seen.map((f) => f.cy));
  const framing: PresenceSummary['framing'] = size < 0.22 ? 'far' : size > 0.7 ? 'close' : Math.abs(cx - 0.5) > 0.2 || cy < 0.2 || cy > 0.65 ? 'off-center' : 'good';
  // Stillness: average movement of the face center between frames, as a share of face size.
  let move = 0;
  for (let i = 1; i < seen.length; i++) move += Math.hypot(seen[i].cx - seen[i - 1].cx, seen[i].cy - seen[i - 1].cy) / Math.max(0.05, seen[i].size);
  const perFrame = seen.length > 1 ? move / (seen.length - 1) : 0;
  const stillness = Math.max(0, Math.min(100, Math.round(100 - perFrame * 900)));
  return {
    seconds,
    facePct: pct(seen.length, frames.length),
    eyeContactPct: pct(looking.length, seen.length),
    framing,
    lighting: lightOf(frames),
    smilePct: pct(seen.filter((f) => f.smile > 0.35).length, seen.length),
    stillness,
  };
}

function lightOf(frames: FaceFrame[]): PresenceSummary['lighting'] {
  const l = frames.reduce((a, f) => a + f.light, 0) / frames.length;
  return l < 70 ? 'dark' : l > 215 ? 'bright' : 'good';
}

/** Plain-language tips for what to fix, most important first. */
export function presenceTips(s: PresenceSummary): string[] {
  const out: string[] = [];
  if (s.facePct < 60) out.push('Keep your face in the frame the whole time.');
  if (s.eyeContactPct < 60 && s.facePct >= 60) out.push('Look at the lens, not the screen, especially for your first and last sentence.');
  if (s.framing === 'far') out.push('Move closer: your face should fill about a third of the frame.');
  if (s.framing === 'close') out.push('Move back a little so your shoulders show.');
  if (s.framing === 'off-center') out.push('Center yourself, with your eyes about a third from the top.');
  if (s.lighting === 'dark') out.push('Add light in front of you, like a window or lamp facing you.');
  if (s.lighting === 'bright') out.push('Too much light behind or on you. Turn away from the window.');
  if (s.stillness < 55) out.push('Keep your head steadier when you make a point.');
  if (s.smilePct < 10 && s.facePct >= 60) out.push('A small smile at the start and end makes you look warmer.');
  return out;
}

type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => {
    faceLandmarks: { x: number; y: number }[][];
    faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
    facialTransformationMatrixes?: { data: number[] }[];
  };
  close: () => void;
};

let loading: Promise<Landmarker> | null = null;

async function landmarker(): Promise<Landmarker> {
  loading ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks(WASM_PATH);
    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
    try {
      return (await FaceLandmarker.createFromOptions(files, opts('GPU'))) as unknown as Landmarker;
    } catch {
      return (await FaceLandmarker.createFromOptions(files, opts('CPU'))) as unknown as Landmarker;
    }
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

/** Starts the front camera into a video element and tracks presence until stopped. */
export class PresenceTracker {
  private stream: MediaStream | null = null;
  private frames: FaceFrame[] = [];
  private timer = 0;
  private canvas = document.createElement('canvas');
  onFrame?: (f: FaceFrame) => void;

  async open(video: HTMLVideoElement): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
  }

  /** Loads the face model (first time only) and begins measuring. */
  async start(video: HTMLVideoElement): Promise<void> {
    const lm = await landmarker();
    this.frames = [];
    this.canvas.width = 24;
    this.canvas.height = 18;
    const g = this.canvas.getContext('2d', { willReadFrequently: true });
    let last = -1;
    const step = () => {
      if (video.readyState >= 2 && video.currentTime !== last) {
        last = video.currentTime;
        const now = performance.now();
        let light = 128;
        if (g) {
          g.drawImage(video, 0, 0, 24, 18);
          const px = g.getImageData(0, 0, 24, 18).data;
          let sum = 0;
          for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          light = sum / (px.length / 4);
        }
        const r = lm.detectForVideo(video, now);
        const pts = r.faceLandmarks[0];
        let f: FaceFrame = { t: now, present: false, yaw: 0, pitch: 0, smile: 0, cx: 0.5, cy: 0.5, size: 0, light };
        if (pts?.length) {
          let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
          for (const p of pts) {
            if (p.x < x0) x0 = p.x;
            if (p.x > x1) x1 = p.x;
            if (p.y < y0) y0 = p.y;
            if (p.y > y1) y1 = p.y;
          }
          const m = r.facialTransformationMatrixes?.[0]?.data;
          const pose = m ? poseFromMatrix(m) : { yaw: 0, pitch: 0 };
          const bs = r.faceBlendshapes?.[0]?.categories ?? [];
          const sc = (n: string) => bs.find((c) => c.categoryName === n)?.score ?? 0;
          f = { t: now, present: true, ...pose, smile: (sc('mouthSmileLeft') + sc('mouthSmileRight')) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: y1 - y0, light };
        }
        this.frames.push(f);
        this.onFrame?.(f);
      }
      this.timer = window.setTimeout(step, 100);
    };
    step();
  }

  stop(): PresenceSummary {
    clearTimeout(this.timer);
    return summarizePresence(this.frames);
  }

  close(): void {
    clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
