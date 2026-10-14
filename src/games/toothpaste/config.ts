// 歯磨き粉10.0cm: 調整可能パラメータ（長さは mm、時間は秒）
export interface Stage {
  /** 目標長さ mm */
  target: number;
  /** 最大流量 mm/s */
  qmax: number;
  /** この内圧まで何も出ない（溜め） 0..1 */
  thresh: number;
  /** 圧→流量の非線形指数 */
  expo: number;
  /** 握力の立ち上がり時定数 s */
  gripTau: number;
  /** 指を離したときの握力の抜け速度 */
  gripRel: number;
  /** 内圧が握力に追従する速さ（上がる/下がる）。下がる側が遅い＝止まるのが遅れる */
  pUp: number;
  pDown: number;
  /** 内圧がこの値を超えた瞬間に空気でブシュッと出る量 */
  burstAt: number;
  burstMm: number;
  burstRate: number;
  /** 流量の脈動 */
  ripple: number;
  /** 離した後の垂れ（mm/s 相当） */
  sag: number;
}

export const STAGES: Stage[] = [
  { target: 100, qmax: 70, thresh: 0.2, expo: 1.5, gripTau: 0.75, gripRel: 14, pUp: 6, pDown: 5, burstAt: 0.6, burstMm: 6, burstRate: 45, ripple: 0.15, sag: 3.2 },
  { target: 73, qmax: 86, thresh: 0.28, expo: 1.4, gripTau: 0.6, gripRel: 14, pUp: 7, pDown: 4, burstAt: 0.55, burstMm: 9, burstRate: 50, ripple: 0.2, sag: 3.6 },
  { target: 128, qmax: 100, thresh: 0.34, expo: 1.35, gripTau: 0.9, gripRel: 12, pUp: 5, pDown: 3.5, burstAt: 0.7, burstMm: 12, burstRate: 55, ripple: 0.22, sag: 4.2 },
];

export const ROUNDS = STAGES.length;
export const MAX_MM = 230;          // チューブの限界（これ以上は出ない）
export const AUTO_RELEASE_SEC = 7;  // 握りっぱなし上限
export const SETTLE_SEC = 0.8;      // 離してから測定まで
export const REVEAL_SEC = 1.9;      // 結果表示
export const TRANS_SEC = 0.5;       // ラウンド切替
export const MOUNTAIN_MM = 180;     // 「歯磨き粉の山」判定の長さ
export const ZERO_MM = 5;           // 「出なかった男」判定の長さ
export const EXACT_MM = 0.5;        // 10.0cmジャスト判定の誤差
export const NEAR_MM = 1.5;         // 惜しすぎる1mm判定の誤差

/** 1ラウンドの点数（誤差 mm → 0..1000、決定論的） */
export const roundScore = (errMm: number): number => Math.round(1000 * Math.exp(-Math.pow(Math.abs(Math.round(errMm * 10) / 10) / 14, 0.8)));

export const fmtCm = (mm: number) => (mm / 10).toFixed(1) + 'cm';
export const fmtErr = (e: number) => (e >= 0 ? '+' : '-') + Math.abs(e).toFixed(1) + 'mm';
export const verdictOf = (e: number): string => {
  const a = Math.abs(e);
  if (a <= EXACT_MM) return 'ジャスト!!';
  if (a <= NEAR_MM) return '惜しすぎる…';
  if (a >= 60) return e > 0 ? '出しすぎにも程がある' : 'ほぼ出ていない';
  if (a <= 4) return e > 0 ? 'ちょっと出しすぎ' : 'ちょっと足りない';
  return e > 0 ? '出しすぎ' : '足りない';
};
