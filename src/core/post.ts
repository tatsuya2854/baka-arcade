// 投稿文の自動生成: 結果(スコア/称号/ランク/レア/挑戦)によって文面を変える。同じ結果でも複数案。
import type { GameMeta, GameResult } from './types';
import type { Rank } from './rank';
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
export function genVariants(meta: GameMeta, r: GameResult, o: { rank: Rank; rareName?: string; isBest: boolean; beat?: boolean | null; rateText?: string }): string[] {
  const t = r.art?.title ?? '', sc = r.scoreText, nm = meta.title.replace(/[！!]/g, ''), out: string[] = [];
  const high = o.rank === 'S' || o.rank === 'A', low = o.rank === 'D' || o.rank === 'C';
  if (o.rareName) out.push(`${nm}でレア引いたwww「${o.rareName}」${o.rateText ? `（${o.rateText.split('（')[0]}）` : ''}\n${sc}／称号：${t}\nこれ出せる人いる？`);
  if (o.beat) out.push(`挑戦状に勝ったwww ${sc}！称号：${t}\n次はお前の番`);
  if (high) out.push(`${nm} ${sc}でランク${o.rank}いったwww\n称号：${t}\nこれ超えられる？`, `ガチったら${sc}（ランク${o.rank}）。称号は「${t}」\n誰か止めて`);
  else if (low) out.push(`${nm}、${sc}で「${t}」って言われたwww\n下手すぎて逆に見てほしい`, `ランク${o.rank}の${sc}…称号「${t}」\nこれより下手な人いる？`);
  else out.push(`${nm} ${sc}（ランク${o.rank}）\n称号：${t}\n微妙に悔しいからもう1回やる`);
  if (o.isBest) out.push(`自己ベスト更新！${nm} ${sc}\n称号：${t}`);
  const base = (r.art?.postVariants ?? []).slice(0, 3);
  const uniq = [...new Set([...out, ...base])];
  const k = hash(`${sc}${t}`) % Math.max(1, uniq.length); // 結果ごとに先頭案が変わる
  return [...uniq.slice(k), ...uniq.slice(0, k)];
}
