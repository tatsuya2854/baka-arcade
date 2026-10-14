import type { AudioEngine } from './audio';

export interface GameResult {
  /** 数値スコア（ランキング対象）。大きいほど良い */
  score: number;
  /** 画面表示用スコア文字列 例 "17人" "23.4秒" */
  scoreText: string;
  /** 共有文に使う一言 例 "おじさんを17人積みました！" */
  shareText: string;
  /** プレイ時間(ms)。ゲーム側で計測して渡す。BP・サーバー検証に使う */
  durationMs: number;
  /** ゲーム固有の補足（任意） */
  detail?: string;
}

export interface GameContext {
  /** ゲームが自由に描画してよいルート要素（position:relative, 全画面） */
  root: HTMLElement;
  audio: AudioEngine;
  /** ゲーム終了を通知（1プレイ1回）。結果画面が表示される */
  finish(result: GameResult): void;
  /** プレイ開始を通知（最初の入力など実際に遊び始めた時。計測用） */
  started(): void;
  /** 解放済みキャラスキンID */
  unlockedSkins: string[];
  /** 自己ベスト */
  best: number;
  /** 画面外へ戻る（ホームへ） */
  exit(): void;
}

export interface GameInstance {
  destroy(): void;
}

export interface GameMeta {
  id: string;
  no: number;
  title: string;
  tagline: string;
  desc: string;
  howto: string;       // 3秒ルール説明
  emoji: string;
  color: string;       // ネオン色
  scoreUnit: string;   // 例 "人" "m" "秒"
  /** スコアが小さいほど良い場合 false 以外は大きいほど良い */
  higherIsBetter?: boolean;
  /** BP換算: score->BP のベース倍率と1プレイ上限 */
  bp: { perScore: number; cap: number; base: number };
  /** サーバー検証: 1秒あたりの最大スコア増加と絶対上限 */
  limits: { maxPerSec: number; maxScore: number };
  flagship?: boolean;
  isNew?: boolean;
}

export interface GameModule {
  meta: GameMeta;
  start(ctx: GameContext): GameInstance;
}
