// Serves the face model runtime from our own site, so the camera check doesn't depend on a CDN.
import { copyFileSync, mkdirSync } from 'node:fs';

const from = 'node_modules/@mediapipe/tasks-vision/wasm';
mkdirSync('dist/mediapipe', { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) copyFileSync(`${from}/${f}`, `dist/mediapipe/${f}`);
console.log('mediapipe: copied runtime to dist/mediapipe');
