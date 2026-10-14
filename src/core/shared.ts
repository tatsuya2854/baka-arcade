import { AudioEngine } from './audio';
export const audio = new AudioEngine();
import { gamePath } from './registry';
/** 画面遷移。/play/<id> は専用URL /games/<slug> へ。履歴APIを使い、ページ再読み込みなしで切り替える */
export function go(path: string) {
  const m = path.match(/^\/play\/(\w+)/), to = m ? gamePath(m[1]) : path;
  if (to.startsWith('/c/') || to.startsWith('#')) { location.hash = to.replace(/^#/, ''); return; }
  if (location.pathname + location.hash !== to) history.pushState(null, '', to);
  dispatchEvent(new Event('routechange'));
}
