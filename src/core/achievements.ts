import { load, mutate } from './storage';
import { track } from './analytics';
export interface Ach { id: string; name: string; desc: string; emoji: string }
export const ACHS: Ach[] = [
  { id: 'first', name: 'はじめの一歩', desc: '初めて遊んだ', emoji: '🐣' },
  { id: 'three', name: '3プレイの壁', desc: '累計3回遊んだ', emoji: '🔥' },
  { id: 'ten', name: 'もはや常連', desc: '累計10回遊んだ', emoji: '🎰' },
  { id: 'all5', name: '全ゲーム制覇', desc: '5ゲームすべて遊んだ', emoji: '🏆' },
  { id: 'stack10', name: 'おじさん10人', desc: 'おじさんを10人積んだ', emoji: '🧓' },
  { id: 'stack20', name: '巨大おじさんの洗礼', desc: 'おじさんを20人積んだ', emoji: '🗼' },
  { id: 'fart500', name: '成層圏おなら', desc: 'おならで500m到達', emoji: '🚀' },
  { id: 'hair30', name: '最後の砦', desc: '髪を30秒守った', emoji: '🌬️' },
  { id: 'nose1k', name: '鼻毛マイスター', desc: '鼻毛で1000点', emoji: '👃' },
  { id: 'bp100', name: 'バカポイント100', desc: '100BP到達', emoji: '💎' },
];
const rules: Record<string, () => boolean> = {
  first: () => total() >= 1, three: () => total() >= 3, ten: () => total() >= 10,
  all5: () => ['stack', 'fart', 'hair', 'nose', 'button'].every(g => (load().plays[g] ?? 0) > 0),
  stack10: () => (load().best.stack ?? 0) >= 10, stack20: () => (load().best.stack ?? 0) >= 20,
  fart500: () => (load().best.fart ?? 0) >= 500, hair30: () => (load().best.hair ?? 0) >= 30,
  nose1k: () => (load().best.nose ?? 0) >= 1000, bp100: () => load().bp >= 100,
};
const total = () => Object.values(load().plays).reduce((a, b) => a + b, 0);
export function checkAchievements(): Ach[] {
  const got: Ach[] = [];
  for (const a of ACHS) if (!load().achievements.includes(a.id) && rules[a.id]()) got.push(a);
  if (got.length) mutate(s => { for (const a of got) s.achievements.push(a.id); });
  return got;
}
void track;
