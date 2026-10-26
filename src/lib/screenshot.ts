// Captures what's on screen for a bug report. Anything typed into a field is blanked out first,
// and elements marked data-noshot (like the report button itself) are left out.

export async function captureScreen(): Promise<string | undefined> {
  const root = document.documentElement;
  root.classList.add('shot-mask');
  try {
    const { toJpeg } = await import('html-to-image');
    const target = (document.querySelector('.session') as HTMLElement | null) ?? document.body;
    const bg = getComputedStyle(document.body).backgroundColor || '#fff';
    return await toJpeg(target, {
      quality: 0.7,
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      backgroundColor: bg,
      width: window.innerWidth,
      height: window.innerHeight,
      style: { transform: `translateY(-${target === document.body ? window.scrollY : (target.scrollTop ?? 0)}px)` },
      filter: (n) => !(n instanceof HTMLElement && n.dataset.noshot !== undefined) && !(n instanceof HTMLVideoElement),
      // Fonts load from Google; skip embedding them if that fails rather than failing the shot.
      skipFonts: true,
    });
  } catch {
    return undefined;
  } finally {
    root.classList.remove('shot-mask');
  }
}

export function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Blob([out], { type });
}
