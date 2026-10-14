// 「絶対に押すな」調整用パラメータ
export const CONFIG = {
  roundSec: 60,            // 1ラウンドの長さ(秒)
  recentExclude: 5,        // 直近N回の演出は抽選から除外
  eventCooldownMs: 420,    // 演出が連続発火する最小間隔
  maxFx: 6,                // 同時に走る演出の上限
  maxParticles: 260,
  newBonus: 1,             // 新規発見1種あたりの加点
  undiscoveredWeight: 2.5, // 未発見演出の抽選重み倍率
  endingTotal: 1000,       // 累計押下数でエンディング
  milestones: [100, 500],  // 特別演出の累計押下数
  saveEvery: 5,            // 何回押すごとに保存するか
  bgmKind: 4,
  bgmTempo: 160,
  btnRadiusRatio: 0.26,    // 画面短辺に対するボタン半径
  endingHoldMs: 900,       // 終了表示(TIME UP)の長さ
};
