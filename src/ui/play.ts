import { GAME_LOADERS, ALL_META } from '../core/registry';
import type { GameInstance, GameMeta, GameResult } from '../core/types';
import { audio, go } from '../core/shared';
import { load, mutate } from '../core/storage';
import { award, UNLOCKABLES } from '../core/bp';
import { track } from '../core/analytics';
import { checkAchievements } from '../core/achievements';
import { beginSession, submitScore } from '../core/ranking';
import { drawPoster, posterBlob, recordReplay, FMT, type Fmt } from '../core/art';
import { openX, openLine, webShare, saveImage } from '../core/share';
import { register } from '../core/codex';
import { selfUrl, verifiedUrl, type Challenge } from '../core/challenge';
import { card } from './hub';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function toast(msg: string) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }
const TAGS: Record<string, string> = { stack: '#おじさんを積め', fart: '#おならエレベーター', hair: '#ハゲを守れ', nose: '#鼻毛を抜け', button: '#絶対に押すなボタン' };

export function renderPlay(app: HTMLElement, id: string, challenge?: Challenge): () => void {
  const meta = ALL_META.find(m => m.id === id);
  if (!meta) { go('/'); return () => {}; }
  app.innerHTML = `<div class="play"><div class="groot" id="groot"></div>
    <div class="pbar"><button id="back" aria-label="ホームへ">⌂</button><button id="mute" aria-label="ミュート">${audio.muted ? '🔇' : '🔊'}</button></div>
    <div id="layer"></div></div>`;
  const root = app.querySelector<HTMLElement>('#groot')!, layer = app.querySelector<HTMLElement>('#layer')!;
  let inst: GameInstance | null = null, alive = true, runToken = 0, startedAt = 0, hasStarted = false, raf = 0;
  app.querySelector('#back')!.addEventListener('click', () => go('/'));
  app.querySelector('#mute')!.addEventListener('click', e => { audio.setMuted(!audio.muted); (e.currentTarget as HTMLElement).textContent = audio.muted ? '🔇' : '🔊'; });
  const teardown = () => { runToken++; cancelAnimationFrame(raf); try { inst?.destroy(); } catch (e) { console.warn(e); } inst = null; audio.stopBgm(); root.innerHTML = ''; };
  const fmtScore = (v: number) => meta.id === 'hair' ? v.toFixed(1) : String(Math.round(v));

  async function launch(isRetry: boolean) {
    teardown(); layer.innerHTML = ''; hasStarted = false;
    const token = runToken, mod = await GAME_LOADERS[meta!.id]();
    if (!alive || token !== runToken) return;
    const s = load(); beginSession(meta!.id);
    inst = mod.start({
      root, audio, unlockedSkins: s.unlocked.filter(u => u.startsWith('skin_')), best: s.best[meta!.id] ?? 0,
      started: () => { if (!hasStarted) { hasStarted = true; startedAt = Date.now(); track('game_start', { game: meta!.id, retry: isRetry }); if (challenge) track('challenge_play', { game: meta!.id, verified: challenge.verified }); } },
      finish: r => { if (token === runToken && alive) onFinish(r); },
      exit: () => go('/'),
    });
  }

  function intro() {
    layer.innerHTML = `<div class="ov" style="--c:${meta!.color}"><div style="font-size:72px">${meta!.emoji}</div><h3 style="color:${meta!.color}">${esc(meta!.title)}</h3>
      ${challenge ? `<div class="chip bp" style="font-size:16px">⚔️ ${esc(challenge.nick)}さんからの挑戦状：${fmtScore(challenge.score)}${meta!.scoreUnit} を超えろ！<br><span class="muted">${challenge.verified ? '✅ サーバー検証済みの記録' : '⚠️ 自己申告の記録（未検証）'}</span></div>` : ''}
      <div class="how">${esc(meta!.howto)}</div><div class="muted">${esc(meta!.desc)}</div>
      <button class="cta" id="start">▶ START</button><div class="muted">${audio.muted ? '🔇 ミュート中' : '🔊 音が出ます'}</div></div>`;
    layer.querySelector('#start')!.addEventListener('click', () => { audio.unlock(); audio.sfx('ok'); launch(false); });
  }

  function onFinish(r0: GameResult) {
    const m = meta as GameMeta;
    const prevBest = load().best[m.id] ?? -Infinity, isBest = r0.score > prevBest;
    const dur = Math.max(r0.durationMs, startedAt ? Date.now() - startedAt : 0);
    const r = { ...r0, durationMs: Math.min(r0.durationMs || dur, dur) };
    const gain = award(m, r);
    mutate(s => { if (isBest) s.best[m.id] = r.score; s.plays[m.id] = (s.plays[m.id] ?? 0) + 1; s.history.push({ game: m.id, score: r.score, at: Date.now(), bp: gain.gained }); if (s.history.length > 50) s.history.shift(); });
    track('game_over', { game: m.id, score: r.score, dur: Math.round(r.durationMs / 1000), best: isBest });
    audio.stopBgm();
    const rare = register(m, r.art?.rare);
    if (rare.isNew) { audio.sfx('unlock'); toast(`✨ レア発見！ ${rare.name}（図鑑に登録）`); }
    track('result_view', { game: m.id, rare: !!r.art?.rare });
    showResult(m, r, isBest, gain, checkAchievements().map(a => `${a.emoji} 実績「${a.name}」`), rare);
  }

  function showResult(m: GameMeta, r: GameResult, isBest: boolean, gain: ReturnType<typeof award>, notes: string[], rare: { isNew: boolean; name?: string }) {
    const s = load(), art = r.art;
    const nextU = UNLOCKABLES.filter(u => !s.unlocked.includes(u.id) && u.kind === 'skin')[0];
    const prevCost = [...UNLOCKABLES].reverse().find(u => s.unlocked.includes(u.id) && u.kind === 'skin')?.cost ?? 0;
    const pct = nextU ? Math.min(100, ((s.bp - prevCost) / (nextU.cost - prevCost)) * 100) : 100;
    const recs = [...ALL_META].filter(x => x.id !== m.id).sort((a, b) => (s.plays[a.id] ?? 0) - (s.plays[b.id] ?? 0)).slice(0, 2);
    const beat = challenge ? r.score > challenge.score : null;
    let cid = '', variant = 0, fmt: Fmt = 'ig';
    const shareUrl = () => `${location.origin}/?r=s`;
    const variants = art?.postVariants?.length ? art.postVariants : [r.shareText];
    const textFor = () => `${variants[variant % variants.length]}\n${TAGS[m.id] ?? ''} #BAKAARCADE`;
    const chUrl = () => cid ? verifiedUrl(cid) : selfUrl(m.id, r.score, load().nickname);
    layer.innerHTML = `<div class="ov res" style="--c:${m.color}">
      <canvas id="art" class="artcv"></canvas>
      ${rare.name ? `<div class="chip bp">✨ レア結果：${esc(rare.name)}${rare.isNew ? '（NEW！図鑑登録）' : ''}</div>` : ''}
      <div class="atitle">${esc(art?.title ?? r.scoreText)}</div>
      <div class="score">${esc(r.scoreText)}</div>
      ${isBest ? '<div class="new">🎉 自己ベスト更新！</div>' : ''}
      <div class="comment">${esc(art?.comment ?? '')}</div>
      ${beat != null ? `<div class="chip ${beat ? 'bp' : ''}">${beat ? '🏆 挑戦状に勝利！' : `あと ${fmtScore(challenge!.score - r.score)}${m.scoreUnit}…惜しい！`}</div>` : ''}
      <button class="retry" id="retry" disabled>もう一回！</button>
      <textarea id="ptext" class="ptext" rows="4" maxlength="200">${esc(textFor())}</textarea>
      <div class="shr"><button id="sx">𝕏で共有</button><button id="sl">LINE</button><button id="ss">📤 画像つき共有</button><button id="sv">🔁 文案</button></div>
      <div class="tabs" id="fmts">${(Object.keys(FMT) as Fmt[]).map(k => `<button class="tab ${k === fmt ? 'on' : ''}" data-f="${k}">${FMT[k].label}</button>`).join('')}</div>
      <div class="shr"><button id="si">💾 画像を保存</button><button id="sc">🔗 挑戦状リンク</button><button id="sk">📋 文をコピー</button></div>
      ${art?.replay ? `<div class="shr"><button id="rp">▶ 崩壊リプレイ(スロー)</button><button id="rv">🎬 縦型動画を保存</button></div>` : ''}
      <div class="muted" id="smsg">※Xへの画像の自動添付はできません。「画像を保存」してから投稿に添付してください（自動投稿はしません）</div>
      <div style="width:100%;text-align:left"><b style="color:var(--gold)">${gain.gained > 0 ? `+${gain.gained} BP` : 'BPなし'}</b> <span class="muted">${gain.capped ? '（本日の上限）' : gain.gained === 0 ? '（3秒以上・得点が必要）' : ''} 合計 ${s.bp}BP</span>
        <div class="bpbar"><i style="width:${pct}%"></i></div><div class="muted">${nextU ? `次: ${esc(nextU.name)}（${nextU.cost}BP）` : '全キャラ解放済み'}　自己ベスト ${esc(String(s.best[m.id] ?? '-'))}${m.scoreUnit}</div></div>
      ${[...gain.newlyUnlocked.map(u => `${u.emoji} 解放: ${u.name}`), ...notes].map(t => `<div class="chip bp">${esc(t)}</div>`).join('')}
      <div id="nickbox" style="width:100%"></div>
      <div class="muted" style="width:100%;text-align:left">他のゲームに挑戦</div>
      <div class="next">${recs.map(x => card(x)).join('')}</div>
      <button class="link" id="home">ホームへ戻る</button></div>`;
    // 結果アートを大きく表示（何も操作しなくても動く）
    const cv = layer.querySelector<HTMLCanvasElement>('#art')!, dpr = Math.min(2, devicePixelRatio || 1), cw = Math.min(innerWidth - 40, 420), ch = Math.round(Math.min(cw * 1.0, innerHeight * 0.42));
    cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    const g = cv.getContext('2d')!; let rpStart = 0, replaying = false; const t0 = performance.now();
    const loop = () => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
      const t = (performance.now() - t0) / 1000;
      if (replaying && art?.replay) { const rt = (performance.now() - rpStart) / 1000 * 0.4; if (rt > art.replay.durationSec) replaying = false; else { art.replay.draw(g, cw, ch, rt); raf = requestAnimationFrame(loop); return; } }
      try { art ? art.draw(g, cw, ch, t) : 0; } catch { /* */ }
      raf = requestAnimationFrame(loop);
    };
    loop();
    layer.querySelector('#rp')?.addEventListener('click', () => { replaying = true; rpStart = performance.now(); });
    setTimeout(() => layer.querySelector<HTMLButtonElement>('#retry')?.removeAttribute('disabled'), 700);
    for (const u of gain.newlyUnlocked) { audio.sfx('unlock'); toast(`${u.emoji} ${u.name} を解放！`); }
    const $ = <T extends HTMLElement>(q: string) => layer.querySelector<T>(q)!;
    const msg = (t: string) => { $('#smsg').textContent = t; };
    const ptext = () => $<HTMLTextAreaElement>('#ptext').value;
    const popts = () => ({ fmt, isBest, bp: gain.gained, rareName: rare.name, url: location.origin, challenge: `⚔️ 挑戦状：これを超えられる？ → ${chUrl().replace(/^https?:\/\//, '')}`.slice(0, 80) });
    $('#retry').addEventListener('click', () => { track('retry', { game: m.id }); audio.sfx('ok'); launch(true); });
    $('#home').addEventListener('click', () => go('/'));
    layer.querySelectorAll<HTMLElement>('[data-play]').forEach(b => b.addEventListener('click', () => { track('game_switch', { from: m.id, to: b.dataset.play! }); go('/play/' + b.dataset.play); }));
    $('#sv').addEventListener('click', () => { variant++; $<HTMLTextAreaElement>('#ptext').value = textFor(); });
    $('#fmts').addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-f]'); if (!t) return; fmt = t.dataset.f as Fmt; layer.querySelectorAll('#fmts .tab').forEach(x => x.classList.toggle('on', x === t)); });
    // ※「押下」は共有“開始”の計測であり、実際の投稿完了ではない
    $('#sx').addEventListener('click', () => { track('share_click', { via: 'x', game: m.id }); openX(ptext(), shareUrl()); msg('Xの投稿画面を開きました。画像は「画像を保存」して手動で添付してください。'); });
    $('#sl').addEventListener('click', () => { track('share_click', { via: 'line', game: m.id }); openLine(ptext(), shareUrl()); });
    $('#ss').addEventListener('click', async () => {
      track('share_click', { via: 'web', game: m.id });
      const blob = await posterBlob(m, r, popts()), ok = await webShare(ptext(), blob, shareUrl());
      if (!ok) { saveImage(blob, `baka-${m.id}.png`); track('image_save', { game: m.id }); msg('この環境では画像つき共有ができないため、画像を保存しました。投稿文は「文をコピー」から。'); }
    });
    $('#si').addEventListener('click', async () => { track('image_save', { game: m.id, fmt }); try { saveImage(await posterBlob(m, r, popts()), `baka-${m.id}-${fmt}.png`); msg(`${FMT[fmt].label} の画像を保存しました`); } catch (e) { console.error('poster', e); msg('画像の生成に失敗しました: ' + String((e as Error)?.message ?? e)); } });
    $('#sk').addEventListener('click', async () => { track('link_copy', { game: m.id, what: 'text' }); try { await navigator.clipboard.writeText(ptext() + '\n' + shareUrl()); msg('投稿文をコピーしました'); } catch { msg('コピーに失敗しました。文を長押しでコピーしてください'); } });
    $('#sc').addEventListener('click', async () => {
      track('challenge_create', { game: m.id, verified: !!cid }); const u = chUrl();
      const text = `俺の記録 ${r.scoreText}（${art?.title ?? ''}）を超えられる？\n${u}\n#BAKAARCADE`;
      try { await navigator.clipboard.writeText(text); msg(cid ? '✅ 検証済みの挑戦状リンクをコピーしました' : '⚠️ 自己申告の挑戦状リンクをコピーしました（ニックネーム登録＋オンライン接続で検証済みになります）'); } catch { msg(u); }
    });
    layer.querySelector('#rv')?.addEventListener('click', async () => {
      msg('動画を生成中…（スロー再生分の時間がかかります）');
      const v = await recordReplay(m, r, popts());
      if (!v) { msg('この端末は動画出力に非対応です。画像保存をご利用ください。'); return; }
      track('video_save', { game: m.id, ext: v.ext }); saveImage(v.blob, `baka-${m.id}.${v.ext}`); msg(`動画(${v.ext})を保存しました`);
    });
    const box = $('#nickbox');
    const submit = async () => {
      const res = await submitScore(m.id, r.score, r.durationMs);
      if (res.ok && res.cid) cid = res.cid;
      box.innerHTML = res.ok ? `<div class="chip">🌍 ランキング登録！ 本日 ${res.rank ?? '-'}位（挑戦状は検証済みになりました）</div>` : `<div class="muted">${res.reason === 'offline' ? 'オンライン未接続：記録は端末内のみ・挑戦状は自己申告扱い' : 'ランキング未登録（' + esc(String(res.reason ?? '')) + '）'}</div>`;
    };
    if (load().nickname) submit();
    else {
      box.innerHTML = `<div class="nick"><input id="ni" maxlength="12" placeholder="ニックネームでランキング参加" autocomplete="off"><button id="nb">登録</button></div>`;
      $('#nb').addEventListener('click', () => { const v = ($<HTMLInputElement>('#ni')).value.trim().slice(0, 12); if (!v) return; mutate(x => { x.nickname = v; }); submit(); });
    }
    void drawPoster;
  }

  intro();
  return () => { alive = false; teardown(); };
}
