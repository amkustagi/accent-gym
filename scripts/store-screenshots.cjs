// Store screenshots (1290 x 2796) from the single-file preview. Run: npm run build:single && node scripts/store-screenshots.cjs
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(__dirname, '..', 'dist-single/index.html');
  const out = path.resolve(__dirname, '..', 'docs/store/screenshots');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await p.goto(file); await p.waitForTimeout(1500);
  for (const t of ['Get started', 'Mid', 'Continue', 'Speak up in meetings', 'I talk too fast when nervous', 'Continue', 'Continue', 'Skip for now']) { await p.click(`text=${t}`); await p.waitForTimeout(500); }
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${n}.png` }); };
  await shot('1-today');
  await p.click('.tabbar >> text=Simulator'); await shot('2-simulator');
  await p.click('.tabbar >> text=Practice'); await shot('3-courses');
  await p.click('text=Drills'); await shot('4-drills');
  await b.close(); console.log('screenshots in', out);
})();
