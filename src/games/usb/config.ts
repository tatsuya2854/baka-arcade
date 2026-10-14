// 調整用パラメータ（単位: mm はポート基準の仮想寸法）
export const CFG = {
  limitSec: 20,
  portW: 14, portH: 6.2,
  plugW: 12, plugH: 4.6,
  tolX: 1.0, tolY: 0.8,      // 許容ずれ(mm)
  tolAng: 5,                 // 許容角度(度)
  tremorBase: 1.4, tremorMove: 6.5, // 手ブレ(度): 静止時 / 動かしている時の追加分
  hover: 8, persp: 0.015,    // 手前の高さ(mm)、遠近係数
  flySec: 0.2, bounceSec: 0.5, seatSec: 1.1,
  forceAfterFails: 3,        // この回数ミス後、向き違いでも位置が合っていれば無理やり入る
  lightR: 7.5, dark: 0.88,   // 照明半径(mm)、暗さ(0..1)
  scorePerFail: 140, scorePerMm: 110, forcePenalty: 450, timeoutScore: 12,
  perfectMm: 0.35, perfectDeg: 2,
};
