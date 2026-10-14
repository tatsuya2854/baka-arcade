import './ui/styles.css';
import { audio, go } from './core/shared';
import { bySlug, ALL_META } from './core/registry';
import { renderHub } from './ui/hub';
import { renderPlay } from './ui/play';
import { track, setRef, setUtm } from './core/analytics';
import { parse as parseChallenge } from './core/challenge';
import { load, mutate, dayKey } from './core/storage';

const app = document.getElementById('app')!;
const GAME_IDS = ALL_META.map(m => m.id);
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
  // 旧URL(#/play/<id>)も受け付ける。専用URLは /games/<slug|id>
  const legacy = location.hash.match(/^#\/play\/(\w+)/)?.[1], slug = location.pathname.match(/^\/games\/([\w-]+)\/?$/)?.[1];
  const gm = bySlug(legacy ?? slug ?? '');
  if (gm && GAME_IDS.includes(gm.id)) { cleanup = renderPlay(app, gm.id); window.scrollTo(0, 0); }
  else { renderHub(app); }
}
addEventListener('hashchange', route); addEventListener('popstate', route); addEventListener('routechange', route);
addEventListener('pointerdown', () => audio.unlock(), { capture: true });
// iOS Safari: ダブルタップ拡大・ピンチを抑止
document.addEventListener('gesture' + 'start', e => e.preventDefault());
let lastTouch = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 300 && (e.target as HTMLElement).closest('.play')) e.preventDefault(); lastTouch = n; }, { passive: false });
mutate(s => { if (!s.firstVisitDay) s.firstVisitDay = dayKey(); s.sessionPlays = 0; });
const q = new URLSearchParams(location.search), ref = q.get('r') === 's' ? 'share' : q.get('r') === 'c' ? 'challenge' : '';
// SNS Marketing OS 用 UTM: utm_source(x|note|instagram|tiktok)・utm_campaign(制作物=ゲームid)・utm_content(投稿id)
const utm = { src: q.get('utm_source') ?? '', cp: q.get('utm_campaign') ?? '', ct: q.get('utm_content') ?? '' };
if (utm.src) setUtm(utm);
if (ref || utm.src) { if (ref) setRef(ref); history.replaceState(null, '', location.pathname + location.hash); }
track('visit', { returning: load().history.length > 0, ref, game: bySlug(location.pathname.match(/^\/games\/([\w-]+)/)?.[1] ?? '')?.id ?? '' });
route();
