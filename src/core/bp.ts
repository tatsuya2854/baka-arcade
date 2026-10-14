import { load, mutate, dayKey } from './storage';
import type { GameMeta, GameResult } from './types';
import { track } from './analytics';

export interface Unlockable { id: string; name: string; desc: string; cost: number; kind: 'skin' | 'title' | 'fx'; emoji: string }
// BPは「達成した累計」で解放。消費しない（連打・放置で水増ししても意味が薄い設計）。ゲーム内専用・換金不可。
export const UNLOCKABLES: Unlockable[] = [
  { id: 'skin_normal', name: 'ふつうのおじさん', desc: '最初から使える', cost: 0, kind: 'skin', emoji: '👨' },
  { id: 'skin_blond', name: '金髪おじさん', desc: '派手な髪色', cost: 100, kind: 'skin', emoji: '👱' },
  { id: 'skin_muscle', name: '筋肉おじさん', desc: 'ムキムキ。胸筋が踊る', cost: 300, kind: 'skin', emoji: '💪' },
  { id: 'skin_space', name: '宇宙服おじさん', desc: 'ヘルメット着用', cost: 500, kind: 'skin', emoji: '🧑‍🚀' },
  { id: 'skin_legend', name: '伝説の巨大おじさん', desc: '黄金のオーラをまとう', cost: 1000, kind: 'skin', emoji: '👑' },
  { id: 'title_rookie', name: '称号：バカ見習い', desc: '50BP到達', cost: 50, kind: 'title', emoji: '🥉' },
  { id: 'title_master', name: '称号：バカ師範', desc: '400BP到達', cost: 400, kind: 'title', emoji: '🥈' },
  { id: 'title_king', name: '称号：バカ王', desc: '1500BP到達', cost: 1500, kind: 'title', emoji: '🥇' },
];
export const DAILY_BP_CAP = 300;

/** 1プレイ分のBPを計算（純関数・テスト可能） */
export function calcBp(meta: GameMeta, r: GameResult): number {
  if (r.durationMs < 3000 || r.score <= 0) return 0; // 3秒未満・0点はBPなし
  const raw = meta.bp.base + r.score * meta.bp.perScore;
  return Math.max(0, Math.min(meta.bp.cap, Math.round(raw)));
}

export interface BpGain { gained: number; capped: boolean; newlyUnlocked: Unlockable[]; total: number }
export function award(meta: GameMeta, r: GameResult): BpGain {
  const want = calcBp(meta, r);
  const s = load();
  if (s.bpToday.day !== dayKey()) mutate(x => { x.bpToday = { day: dayKey(), amount: 0 }; });
  const room = Math.max(0, DAILY_BP_CAP - load().bpToday.amount);
  const gained = Math.min(want, room);
  const before = load().bp;
  const newly: Unlockable[] = [];
  mutate(x => {
    x.bp += gained; x.bpToday.amount += gained;
    for (const u of UNLOCKABLES) if (x.bp >= u.cost && !x.unlocked.includes(u.id)) { x.unlocked.push(u.id); newly.push(u); }
  });
  if (gained > 0) track('bp_earned', { game: meta.id, bp: gained });
  for (const u of newly) track('character_unlocked', { id: u.id });
  return { gained, capped: gained < want, newlyUnlocked: newly, total: before + gained };
}
