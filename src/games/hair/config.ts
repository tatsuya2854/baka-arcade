// ハゲを守れ！ 調整用パラメータ
export const CFG = {
  // --- 風 ---
  firstGustAt: 1.4,        // 最初の突風開始(秒) 弱め
  firstGustPeak: 0.4,
  gustWarn: 1.0,           // 突風の予兆(秒前)
  gapStart: 2.3,           // 突風間隔(序盤)
  gapEnd: 0.8,             // 突風間隔(終盤)
  durMin: 1.3, durMax: 2.3,
  peakStart: 0.3,          // 強度カーブ: peak = start + (end-start)*prog*rand
  peakEnd: 1.0,
  rampTau: 20,             // 難易度上昇の時定数(秒) prog=1-exp(-t/tau)
  weakChance: 0.2,         // 休める弱風の確率
  breeze: 0.07,
  // --- 抜けゲージ(毛根ストレス) ---
  windStress: 1.35,        // 風によるストレス上昇/秒 (|風|^windPow に比例)
  windPow: 1.5,
  calmRecover: 0.07,        // 弱風(<calmLevel)でのストレス回復/秒
  calmLevel: 0.2,
  holdRelief: 0.2,         // 押さえ中の追加回復/秒
  holdBlock: 0.82,         // 押さえで風ストレスを減らす最大割合
  releaseJerk: 0.035,      // 離した瞬間の引っ張り(風×)
  // --- 頭皮ダメージ ---
  dmgBase: 0.06,           // 押さえ中の上昇/秒
  dmgGrow: 0.05,           // 押さえ継続秒ごとの加算
  dmgSlap: 0.045,          // 押下ごとの即時ダメージ(連打対策)
  dmgRecover: 0.17,        // 離している間の回復/秒
  // --- 手の疲れ・クールダウン ---
  fatigueUp: 0.2,          // 押さえ中の疲労/秒
  fatigueDown: 0.12,       // 離し中の回復/秒
  fatigueEffect: 0.6,      // 疲労MAXでの押さえ効果低下率
  pressRamp: 0.18,         // 押さえ効果が最大になるまでの秒
  releaseCooldown: 0.3,    // 離した後に再び押さえられるまで
  // --- 髪の物理 ---
  hairNodes: 10,
  hairStiff: 0.05,         // 立ち上がろうとする力
  windForce: 2600,         // 風の加速度(px/s^2 基準)
  damping: 0.985,
  // --- 演出 ---
  slowmoScale: 0.2,
  overDuration: 2.4,       // ゲームオーバー演出の実時間(秒)
  bgmKind: 2, bgmTempo: 130,
};
