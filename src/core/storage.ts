// ローカル保存。将来のアカウント連携に備え、全体を1つのスキーマ(version付き)にまとめる。
export interface PlayRecord { game: string; score: number; at: number; bp: number }
export interface SaveData {
  v: 1;
  uid: string;                 // 匿名ID（個人情報ではない）
  nickname: string;
  best: Record<string, number>;
  plays: Record<string, number>;
  history: PlayRecord[];       // 直近50件
  bp: number;                  // 現在のBP（累計）
  bpToday: { day: string; amount: number };
  unlocked: string[];          // 解放アイテムID（スキン・称号）
  selectedSkin: string;
  achievements: string[];
  firstVisitDay: string;
  sessionPlays: number;
  extra: Record<string, unknown>; // ゲーム固有データ（例: ボタン押下数）
}
const KEY = 'baka.save.v1';
const today = () => new Date().toISOString().slice(0, 10);
const def = (): SaveData => ({
  v: 1, uid: crypto.randomUUID?.() ?? String(Math.random()).slice(2), nickname: '', best: {}, plays: {}, history: [],
  bp: 0, bpToday: { day: today(), amount: 0 }, unlocked: ['skin_normal'], selectedSkin: 'skin_normal', achievements: [],
  firstVisitDay: today(), sessionPlays: 0, extra: {},
});
let cache: SaveData | null = null;
export function load(): SaveData {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY); cache = raw ? { ...def(), ...JSON.parse(raw) } : def(); } catch { cache = def(); }
  return cache!;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(cache ?? load())); } catch { /* private mode */ } }
export function mutate(fn: (s: SaveData) => void) { fn(load()); save(); }
export const dayKey = today;
