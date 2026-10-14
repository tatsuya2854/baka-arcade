// ケチャップ黄金比: 調整可能パラメータ
export const CFG = {
  // 高さマップ(粘性流体)
  N: 128,              // グリッド一辺
  plateR: 56,          // 皿の縁の半径(セル)。外側は床に落ちる=消える
  yieldSlope: 0.22,    // 降伏応力: これ以下の勾配では流れない(とろみ・盛り上がり)
  spreadK: 0.14,       // 1反復で動かす余剰の割合(粘度の逆数)
  surface: 0.005,      // 表面張力ぽい丸め
  yieldFloor: 0.45,    // 厚い所の降伏勾配の下限(倍率)
  yieldFall: 1.0,      // 厚いほど降伏勾配が小さくなる度合い(ドーム化)
  substeps: 3,         // 1/60秒あたりの反復回数
  // 目標
  targetVol: 1650,     // 目標の体積(outlineR の輪郭に落ち着く量。sim の較正値)
  outlineR: 22.2,      // 画面に描く目標輪郭の半径(セル。落ち着いた塊の見た目の半径)
  targetG: 18,        // 目標量(g)
  // 傾き(θ)と流量
  thetaRise: 0.55,     // 長押し中にθが増える速さ(/秒)
  thetaFall: 1.9,      // 離したときにθが減る速さ(/秒)
  theta0: 0.3,         // これ以下は空気だけ
  airAt: 0.2,          // 「ブッ」が出るθ
  qMax: 1000,          // θ=1 の流量(体積単位/秒)
  qExp: 2.2,           // 非線形の指数
  burstQ: 880,         // これ以上で飛沫
  dripQ: 70,           // これ以下は粒(ぽた)
  dripVol: 14,
  // 進行
  minPourFrac: 0.04,   // この割合以上出していれば自動確定の対象
  idleEndSec: 1.7,     // 止めてからこの秒数で確定
  limitSec: 14,        // 最初の長押しからの制限時間
  // スコア
  scoreWidth: 0.18,
  scoreExp: 1.2,
  goldenErr: 0.02,
  recEvery: 3,         // replay: 何フレームごとに記録
  recMax: 72,
};
export const targetVolume = () => CFG.targetVol;
export const gPerUnit = () => CFG.targetG / targetVolume();
export const scoreFromErr = (err: number) => Math.max(0, Math.min(1000, Math.round(1000 * Math.exp(-Math.pow(Math.abs(err) / CFG.scoreWidth, CFG.scoreExp)))));
export const flowQ = (theta: number) => {
  if (theta <= CFG.theta0) return 0;
  const x = (theta - CFG.theta0) / (1 - CFG.theta0);
  return CFG.qMax * Math.pow(Math.min(1, x), CFG.qExp);
};
