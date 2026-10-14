// 「おじさんを積め！」調整用パラメータ。単位はワールド座標(1おじさん=baseH)。
import type { UncleType } from '../../core/characters';

export const CFG = {
  // --- 見た目サイズ ---
  baseH: 64,            // 通常おじさんの身長
  giantScale: 1.5,      // 巨大おじさん倍率
  bodyHRatio: 0.9,      // 当たり判定高さ/身長
  bodyWRatio: 1.1,     // 当たり判定幅/見た目の胴体幅
  typeHScale: { normal: 1, fat: 0.95, thin: 1.1, muscle: 1.02, giant: 1, special: 1 } as Record<UncleType, number>,

  // --- 物理 ---
  gravityY: 1.5,
  friction: 1.0,
  frictionStatic: 2.0,
  restitution: 0.03,
  specialRestitution: 0.12,   // special は少し弾む
  frictionAir: 0.012,
  density: 0.0016,
  inertiaScale: 5,         // 回転しにくさ（大きいほど倒れにくい）
  slop: 0.05,
  positionIterations: 14,
  velocityIterations: 10,
  constraintIterations: 4,
  sleepThreshold: 45,
  maxFallSpeed: 6.5,         // 1ステップあたり最大落下(着地の衝撃を抑える・トンネリング防止)
  zoomMax: 1.2,
  giantMassScale: 0.65,      // 巨大の質量補正(TYPE_DIM.massに掛ける)
  spinMax: 0.006,             // 投下時のランダム回転(最大, 難易度で増加)

  // --- 土台 ---
  platformW: 290,
  platformThick: 40,

  // --- ルール ---
  lives: 2,                  // これだけ落ちたらゲームオーバー
  loseY: 50,                 // 重心がこのY(土台上面=0)より下に落ちたら「落ちた」
  minInterval: 0.7,          // 次の1人が出るまでの最短秒
  maxWait: 2.4,              // 着地しなくても次が出る最大秒
  autoDropSec: 6.5,          // 放置時の自動落下(最初のタップ後)
  scream: 0.4,               // 落下開始時に叫ぶ確率

  // --- 速度カーブ(往復の角速度 rad/s) ---
  omegaStart: 1.45,
  omegaEnd: 3.3,
  omegaRampCount: 40,        // この人数で omegaEnd
  rangeStart: 85,            // 往復の振幅(序盤は土台の内側)
  rangeEnd: 150,
  rangeRampCount: 12,

  // --- 体型の出現重み(人数で early→late に補間) ---
  firstNormal: 2,            // 最初のN人は普通
  typeRampCount: 30,
  weightsEarly: { normal: 6, fat: 3, thin: 1, muscle: 2, special: 0, giant: 0 } as Record<UncleType, number>,
  weightsLate: { normal: 2, fat: 2, thin: 4, muscle: 2, special: 3, giant: 0 } as Record<UncleType, number>,
  nonNormalSkinChance: 0.45, // 解放スキンを混ぜる確率

  // --- 巨大おじさんイベント ---
  giantAt: [20, 45, 75],     // この人数に達したら登場
  giantSpeedScale: 0.6,      // 往復速度の倍率
  giantWarnSec: 2.2,
  giantJudgeSec: 3.2,        // 着地後この秒数耐えたら成功
  giantBonus: 5,
  giantDamp: 0.9,            // 成功しやすいよう着地後に塔へ掛ける追加減衰(1=なし)

  // --- 節目演出 ---
  milestones: [10, 20, 30, 40, 50, 75, 100],

  // --- ゲームオーバー ---
  overSlowSec: 0.9,
  overSlowScale: 0.3,
  finishDelayMs: 1500,
  explodeImpulse: 9,
};

export function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
