// ティッシュ1枚だけ: 調整可能パラメータ（長さの単位 L = ティッシュ1枚の長さ）
export const CFG = {
  timeLimit: 10,          // 秒。この間に引かないと終了
  dt: 1 / 120,            // 固定ステップ（決定論）
  peek: 0.22,             // 最初に顔を出している長さ
  overlap: 0.65,          // 次の1枚の端が絡む位置（先頭から何L下か）
  winStart: 0.65,         // 連鎖判定ウィンドウ（先頭の高さ）
  winEnd: 1.0,
  followRate: 26,         // 紙が指に追従する速さ
  // 摩擦（ストライベック）: 遅いほど静止摩擦で引っかかる
  muK: 0.9, muS: 2.6, stribeckV: 0.35,
  angleFric: 2.2,         // 斜め引きで摩擦が増える係数
  snagAmp: 0.5, snagAt: 0.45, snagW: 0.08, // 取り出し口の引っかかり
  tearFric: 1.8,         // これを超える摩擦が続くと破れる
  tearStrain: 0.35, strainRecover: 0.6, slowV: 0.03,
  // 連鎖: 張力 T = tv*v^2 + ta*加速度 が把持力 G を超え続けると次の1枚が付いてくる
  tv: 0.35, ta: 0.02, angleTension: 1.0,
  gripBase: 1.5, gripStep: 0.1, gripVar: 0.2, hookNeed: 0.06,
  maxSheets: 30,
  // 離した後の飛翔
  decel: 3.0, airDrag: 0.3, flyMax: 2.2,
  minReturn: 1.0,         // これ未満で離すと箱に戻る（0枚）
  // スコア
  one: 800, oneAng: 100, oneSpeed: 100, idealV: 1.2, angMax: 0.6,
  multi: 640, multiPow: 0.55,
  sheetCm: 20,
};
