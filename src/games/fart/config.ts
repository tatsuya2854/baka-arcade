// おならエレベーター: 調整用パラメータ（単位: ワールドpx / 秒。論理幅は 390 基準）
export const CFG = {
  // --- 操作感 ---
  gravity: 1250,          // 重力(px/s^2)
  tapImpulse: 600,        // タップ1回の上向き推進力
  launchImpulse: 760,     // 最初の離陸の推進力
  maxUp: 640,             // 最大上昇速度
  maxFall: 820,           // 最大落下速度
  // --- ガス(連打の減衰) ---
  gasPerTap: 0.14,        // タップ毎に溜まるガス消耗(0-1)
  gasDecay: 0.3,          // 毎秒の回復量
  minEff: 0.35,           // ガス満タン時の推進力倍率
  easyTime: 10,           // この秒数まではガス影響を弱める(優しい序盤)
  easyGasScale: 0.35,     // 序盤のガス影響係数
  // --- 横移動 ---
  steerSpeed: 240,        // タップ位置へ寄る速度
  // --- スケール ---
  unitsPerMeter: 16,      // 1m = 16px
  playerH: 70,            // キャラ身長
  playerR: 12,            // 当たり判定(円)の半径（優しめ）
  hitShrink: 0.78,        // 障害物の当たり判定縮小率
  // --- 障害物 ---
  firstObstacleM: 55,     // 最初の障害物高度(m)
  gapStart: 560,          // 障害物の縦間隔(開始)
  gapMin: 240,            // 障害物の縦間隔(最小)
  gapRampM: 1800,         // 何mで最小間隔に到達するか
  speedRampM: 1800,       // 速度倍率が最大になる高度
  speedMulMax: 1.6,
  easySpeedMul: 0.7,      // 序盤の障害物速度倍率
  // --- 演出 ---
  milestones: [100, 250, 500, 1000, 1500, 2000, 3000, 5000],
  // 高度ゾーン(m): [高度, 上色, 下色]
  zones: [
    [0, '#5ec8ff', '#d8f2ff'],
    [120, '#3a8de0', '#9fd6ff'],
    [350, '#16327a', '#4c86d6'],
    [700, '#080a26', '#2a2f7a'],
    [1200, '#1a0638', '#6a1b7a'],
    [2000, '#12042a', '#a02a8a'],
  ] as [number, string, string][],
  deathFinishSec: 2.0,
};
