// レア結果の出現率。実測(サーバー集計)が十分溜まるまでは「設計上の目安」と明示して表示する。実測と推定は混ぜない。
export interface RareStat { plays: number; rares: Record<string, number> }
const EST: Record<string, number> = { // 設計時の見積り(%)。実プレイでは異なる可能性あり
  'stack:gold': 3, 'stack:inverted': 1.2, 'stack:giant_ok': 4, 'stack:lean': 6, 'fart:space': 2, 'fart:tiny': 5, 'fart:bird': 6, 'fart:planet': 0.8,
  'hair:miracle': 4, 'hair:regrow': 1.5, 'hair:windmaster': 2, 'hair:flyaway': 8, 'nose:rainbow': 3, 'nose:spiral': 6, 'nose:earth': 0.9, 'nose:rope': 2,
  'button:legend': 0.6, 'button:hundred': 2, 'button:inverted': 5, 'button:ending': 0.5,
};
const cache = new Map<string, Promise<RareStat | null>>();
export function fetchRareStat(game: string): Promise<RareStat | null> {
  if (!cache.has(game)) cache.set(game, fetch('/api/rare?game=' + game).then(r => (r.ok ? (r.json() as Promise<RareStat>) : null)).catch(() => null));
  return cache.get(game)!;
}
/** 表示用テキスト。実測が30プレイ以上ならそれを、なければ目安を明示 */
export function rarityText(game: string, rareId: string, st: RareStat | null): string {
  const n = st?.plays ?? 0, c = st?.rares[rareId] ?? 0;
  if (st && n >= 30) return `出現率 ${Math.max(0.1, (c / n) * 100).toFixed(1)}%（実測 ${c}/${n}プレイ）`;
  const e = EST[`${game}:${rareId}`]; return e ? `出現率 約${e}%（設計上の目安・実測収集中）` : 'レア結果';
}
