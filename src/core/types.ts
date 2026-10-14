import type { AudioEngine } from './audio';

/** 結果＝投稿コンテンツ。各ゲームが「その人だけの結果」を描画関数とデータで渡す */
export interface ResultArt {
  /** 面白い称号 例「おじさんの違法建築」（結果の形状・内容で判定） */
  title: string;
  /** 一言コメント */
  comment: string;
  /** 数値の事実 例 [{label:"タワーの高さ",value:"12.3m"},{label:"崩壊原因",value:"巨大おじさん直撃"}] */
  facts: { label: string; value: string }[];
  /** 発見したレア結果ID（meta.rares のid）。条件はゲーム側の実プレイ内容で判定すること */
  rare?: string;
  /** 結果ビジュアルを (0,0)-(w,h) に描く。アスペクト比は任意(おおむね 4:5〜1:1〜16:9 で破綻しないよう w,h から計算)。t は秒(アニメ用、静止画時は 0) */
  draw(g: CanvasRenderingContext2D, w: number, h: number, t: number): void;
  /** 任意: 最後の数秒のリプレイ。t=0..durationSec を (w,h) に描く。動画出力にも使う */
  replay?: { durationSec: number; draw(g: CanvasRenderingContext2D, w: number, h: number, t: number): void };
  /** 投稿文の候補(2〜4個)。{score}等は展開済みで渡す。ハッシュタグ・URLは共通側が付ける */
  postVariants: string[];
}

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
  /** 結果アート（必須。これが結果画面・投稿画像・挑戦状の中身になる） */
  art?: ResultArt;
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
  /** レア結果の図鑑定義（hint は未発見時にも表示する） */
  rares: { id: string; name: string; hint: string }[];
  flagship?: boolean;
  isNew?: boolean;
}

export interface GameModule {
  meta: GameMeta;
  start(ctx: GameContext): GameInstance;
}
