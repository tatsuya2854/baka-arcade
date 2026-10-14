// プライバシー配慮の軽量計測: 個人情報・IPは送らない。匿名セッションIDのみ。
// DNT有効時は送信しない。送信先は自前の /api/event（無ければ黙って捨てる）。
import { load, mutate } from './storage';
type Ev = 'game_start' | 'game_over' | 'retry' | 'game_switch' | 'share_click' | 'bp_earned' | 'character_unlocked' | 'visit' | 'third_play' | 'result_view' | 'image_save' | 'link_copy' | 'challenge_create' | 'challenge_visit' | 'challenge_play' | 'video_save';
const sid = Math.random().toString(36).slice(2, 10);
let plays = 0;
const queue: any[] = [];
// 実測できるのは「共有ボタン押下・画像保存・挑戦URL発行/訪問/プレイ」まで。SNSへの実際の投稿数は取得不能（推定のみ）。
let refTag = ''; export const setRef = (r: string) => { refTag = r; };
export function track(ev: Ev, props: Record<string, string | number | boolean> = {}) {
  if (refTag && ev !== 'visit' && !props.ref) props = { ...props, ref: refTag };
  if (navigator.doNotTrack === '1') return;
  queue.push({ ev, props, sid, t: Date.now() });
  if (ev === 'game_start') {
    plays++; mutate(s => { s.sessionPlays = plays; });
    if (plays === 3) track('third_play', {}); // 初回訪問で3プレイ以上 を測るための印
  }
  if (queue.length >= 8 || ev === 'game_over' || ev === 'share_click') flush();
}
export function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue.splice(0), first: load().firstVisitDay === new Date().toISOString().slice(0, 10) });
  try { navigator.sendBeacon?.('/api/event', new Blob([body], { type: 'application/json' })); } catch { /* ignore */ }
}
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
