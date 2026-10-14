// 調整用パラメータ（長さは mm、時間は秒）
export const C = {
  PAN_R: 125,        // フライパン底の半径
  RIM_BAND: 30,      // 中心がこの内側まで寄るとフチ接触(減点)
  MISS_MARGIN: 10,   // PAN_R+これ を超えると外し
  EGG_A: 21, EGG_B: 27, // 卵の半幅/半高
  YOLK_R: 15,
  G: 4200,           // 見やすいスローな重力 mm/s^2
  BASE_Z: 210,       // 卵の底の基準高さ
  BURST_Z: 262,      // これより高い位置から落とすと黄身が割れる
  ROUNDS: [
    { period: 3.0, ampX: 125, ampY: 0, bobA: 0, ramp: 0.05 },
    { period: 2.3, ampX: 135, ampY: 35, bobA: 45, ramp: 0.07 },
    { period: 1.9, ampX: 145, ampY: 55, bobA: 65, ramp: 0.09 },
  ],
  READY_LOCK: 0.35,  // ラウンド開始直後の誤タップ無効(秒)
  SETTLE: 1.7,       // 着地から次へ進むまで(秒)
  PERFECT_MM: 1,     // この誤差以内は満点
  BURST_MUL: 0.55, RIM_MUL: 0.7,
};
export const FONT = '"Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif';
