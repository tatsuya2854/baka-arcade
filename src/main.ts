import './ui/styles.css';
import { audio, go } from './core/shared';
import { GAME_LOADERS as _g } from './core/registry'; void _g;
import { renderHub } from './ui/hub';
import { renderPlay } from './ui/play';
import { track, setRef } from './core/analytics';
import { parse as parseChallenge } from './core/challenge';
import { load, mutate, dayKey } from './core/storage';

const app = document.getElementById('app')!;
const GAME_IDS = ['stack', 'fart', 'hair', 'nose', 'button'];
let cleanup: (() => void) | null = null;

let routeSeq = 0;
async function route() {
  cleanup?.(); cleanup = null; app.innerHTML = ''; const seq = ++routeSeq;
  if (location.hash.startsWith('#/c/')) {
    const ch = await parseChallenge(location.hash); if (seq !== routeSeq) return;
    if (!ch || !GAME_IDS.includes(ch.game)) { go('/'); return; }
    track('challenge_visit', { game: ch.game, verified: ch.verified }); setRef('challenge');
    cleanup = renderPlay(app, ch.game, ch); return;
  }
  const m = location.hash.match(/^#\/play\/(\w+)/);
  if (m) { cleanup = renderPlay(app, m[1]); window.scrollTo(0, 0); }
  else { renderHub(app); }
}
addEventListener('hashchange', route);
addEventListener('pointerdown', () => audio.unlock(), { capture: true });
// iOS Safari: ダブルタップ拡大・ピンチを抑止
document.addEventListener('gesture' + 'start', e => e.preventDefault());
let lastTouch = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 300 && (e.target as HTMLElement).closest('.play')) e.preventDefault(); lastTouch = n; }, { passive: false });
mutate(s => { if (!s.firstVisitDay) s.firstVisitDay = dayKey(); s.sessionPlays = 0; });
const q = new URLSearchParams(location.search), ref = q.get('r') === 's' ? 'share' : q.get('r') === 'c' ? 'challenge' : '';
if (ref) { setRef(ref); history.replaceState(null, '', location.pathname + location.hash); }
track('visit', { returning: load().history.length > 0, ref });
route();
