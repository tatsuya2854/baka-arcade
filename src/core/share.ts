// 結果画像(9:16, 1080x1920)をCanvasで生成。TikTok/IG/Stories にそのまま使える縦型。
import type { GameMeta, GameResult } from './types';
import { drawUncle } from './characters';
export const SITE_URL = () => location.origin;

export function shareText(meta: GameMeta, r: GameResult, isBest: boolean) {
  return `${r.shareText}${isBest ? '\n世界一くだらない挑戦で自己ベスト更新！' : ''}\n#BAKAARCADE #バカゲー`;
}
export function openX(text: string, url = SITE_URL()) { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener"); }
export function openLine(text: string, url = SITE_URL()) { window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener"); }
/** 画像ファイル添付ができる環境のみ true を返す（できない時は false → 呼び出し側が画像保存に切り替える） */
export async function webShare(text: string, img: Blob, url = SITE_URL()): Promise<boolean> {
  try {
    const f = new File([img], "baka-arcade.png", { type: "image/png" });
    if (!(navigator as any).canShare?.({ files: [f] })) return false;
    await navigator.share({ text, url, files: [f] }); return true;
  } catch { return false; }
}
export function saveImage(img: Blob, name = "baka-arcade.png") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(img); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
