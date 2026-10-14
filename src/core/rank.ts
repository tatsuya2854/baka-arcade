// ランク S/A/B/C/D。しきい値は各ゲームのスコア単位。調整可能。
const T: Record<string, number[]> = { stack: [3, 8, 15, 25], fart: [30, 150, 400, 1000], hair: [5, 12, 20, 35], nose: [150, 400, 900, 1800], button: [8, 16, 25, 36], egg: [300, 600, 800, 950], toothpaste: [300, 600, 800, 950], usb: [300, 600, 800, 950], ketchup: [300, 600, 800, 950], tissue: [300, 600, 800, 950] };
export const RANKS = ['D', 'C', 'B', 'A', 'S'] as const;
export type Rank = typeof RANKS[number];
export function rankOf(game: string, score: number): Rank { const t = T[game] ?? [1, 2, 3, 4]; let i = 0; for (const v of t) if (score >= v) i++; return RANKS[i]; }
export const RANK_COLOR: Record<Rank, string> = { D: '#9a93c4', C: '#46c8ff', B: '#39ff88', A: '#ffd93d', S: '#ff3d81' };
