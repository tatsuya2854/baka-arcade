// 鼻毛を抜け！ 調整用パラメータ。すべての難易度・得点はここ。
export interface StageCfg {
  /** ゲージ進行速度（押下1秒あたりの進行量 u） */
  speed: number;
  /** 加速指数。gauge = u^accel（1=等速, >1 徐々に加速） */
  accel: number;
  /** ゾーン中心(0..1) */
  zoneC: number;
  /** ゾーン半幅(0..0.5) */
  zoneW: number;
  /** ゾーンが左右に動く振幅 / 周波数(rad/秒、押下時間基準) */
  moveAmp: number;
  moveFreq: number;
  /** ゲージが往復する(pingpong)。往復1周は u=2。maxHold秒で切れる */
  pingpong: boolean;
  maxHold: number;
  /** ゲージがこの値を超えるとゾーンが消える(null=消えない) */
  hideAt: number | null;
  /** 特殊ステージ（鼻毛が異常に長い） */
  special: boolean;
  /** 表示上の鼻毛のうねり量 */
  waves: number;
}

const base: StageCfg = { speed: 0.5, accel: 1.4, zoneC: 0.6, zoneW: 0.17, moveAmp: 0, moveFreq: 0, pingpong: false, maxHold: 3, hideAt: null, special: false, waves: 1.2 };

/** ステージ表（1始まり）。表より先は stageCfg() が式で外挿する */
export const STAGES: Partial<StageCfg>[] = [
  { speed: 0.5, zoneC: 0.62, zoneW: 0.18 },                              // 1: 広め・ゆっくり
  { speed: 0.55, zoneC: 0.5, zoneW: 0.15 },                              // 2
  { speed: 0.6, zoneC: 0.72, zoneW: 0.13, accel: 1.6 },                  // 3
  { speed: 0.62, zoneC: 0.55, zoneW: 0.12, moveAmp: 0.1, moveFreq: 2.2 },// 4: ゾーンが動く
  { speed: 0.4, zoneC: 0.65, zoneW: 0.1, special: true, waves: 3.5, accel: 1.3 }, // 5: 特殊(超長い鼻毛)
  { speed: 0.7, zoneC: 0.6, zoneW: 0.11, hideAt: 0.35 },                 // 6: ゾーンが隠れる
  { speed: 0.5, accel: 1, zoneC: 0.55, zoneW: 0.11, pingpong: true, maxHold: 4.5 }, // 7: 往復
  { speed: 0.8, zoneC: 0.68, zoneW: 0.09, moveAmp: 0.14, moveFreq: 3 },  // 8
  { speed: 0.5, zoneC: 0.6, zoneW: 0.08, hideAt: 0.3, moveAmp: 0.08, moveFreq: 2.5 }, // 9
  { speed: 0.35, zoneC: 0.6, zoneW: 0.07, special: true, waves: 5, pingpong: true, accel: 1, maxHold: 5.5, hideAt: 0.5 }, // 10: 特殊
];

export function stageCfg(n: number): StageCfg {
  const i = n - 1;
  if (i < STAGES.length) return { ...base, ...STAGES[i] };
  // 以降: 表の最終形を基に徐々に難化。5ステージごとに特殊
  const k = n - STAGES.length;
  const sp = n % 5 === 0;
  const zoneW = Math.max(0.045, 0.09 - k * 0.004);
  const pingpong = n % 2 === 1;
  return {
    ...base,
    speed: Math.min(1.1, 0.6 + k * 0.03) * (sp ? 0.65 : 1),
    accel: pingpong ? 1 : 1.5,
    zoneC: 0.45 + ((n * 37) % 100) / 100 * 0.35, // 決定論的な位置
    zoneW,
    moveAmp: Math.min(0.2, 0.08 + k * 0.008),
    moveFreq: 2.5 + (n % 3) * 0.6,
    pingpong, maxHold: 5,
    hideAt: n % 3 === 0 ? 0.3 : null,
    special: sp, waves: sp ? 5 : 1.5,
  };
}

/** 精度閾値: 距離 / 半幅 の比がこれ以下なら（MISS は1超） */
export const JUDGE = { perfect: 0.25, great: 0.6, ok: 1.0 };
/** 精度ごとの基本点 */
export const POINTS = { PERFECT: 100, GREAT: 60, OK: 30, MISS: 0 } as const;
/** コンボ補正: 倍率 = 1 + min(combo-1, comboCap) * comboStep */
export const COMBO = { step: 0.15, cap: 8 };
/** ステージ番号ボーナス（1成功あたり +stage*stageBonus） */
export const STAGE_BONUS = 5;
/** 特殊ステージ成功の倍率 */
export const SPECIAL_MULT = 1.5;
export const LIVES = 3;
/** これ未満のゲージで離すと「すっぽ抜け」ミス */
export const MIN_PULL = 0.08;
/** 演出時間(ms) */
export const REACT_MS = 1100;
export const BGM = { kind: 3, tempo: 120 };
