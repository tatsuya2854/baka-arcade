import { GAME_LOADERS, ALL_META } from '../core/registry';
import type { GameInstance, GameMeta, GameResult } from '../core/types';
import { audio, go } from '../core/shared';
import { load, mutate } from '../core/storage';
import { award, UNLOCKABLES } from '../core/bp';
import { track } from '../core/analytics';
import { checkAchievements } from '../core/achievements';
import { beginSession, submitScore } from '../core/ranking';
import { makeImage, shareText, openX, openLine, webShare, saveImage } from '../core/share';
import { card } from './hub';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function toast(msg: string) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }

export function renderPlay(app: HTMLElement, id: string): () => void {
  const meta = ALL_META.find(m => m.id === id);
  if (!meta) { go('/'); return () => {}; }
  app.innerHTML = `<div class="play"><div class="groot" id="groot"></div>
    <div class="pbar"><button id="back" aria-label="ホームへ">⌂</button><button id="mute" aria-label="ミュート">${audio.muted ? '🔇' : '🔊'}</button></div>
    <div id="layer"></div></div>`;
  const root = app.querySelector<HTMLElement>('#groot')!, layer = app.querySelector<HTMLElement>('#layer')!;
  let inst: GameInstance | null = null, alive = true, runToken = 0, startedAt = 0, hasStarted = false;
  app.querySelector('#back')!.addEventListener('click', () => go('/'));
  app.querySelector('#mute')!.addEventListener('click', e => { audio.setMuted(!audio.muted); (e.currentTarget as HTMLElement).textContent = audio.muted ? '🔇' : '🔊'; });

  const teardown = () => { runToken++; try { inst?.destroy(); } catch (e) { console.warn(e); } inst = null; audio.stopBgm(); root.innerHTML = ''; };

  async function launch(isRetry: boolean) {
    teardown(); layer.innerHTML = ''; hasStarted = false;
    const token = runToken;
    const mod = await GAME_LOADERS[meta!.id]();
    if (!alive || token !== runToken) return;
    const s = load();
    beginSession(meta!.id);
    inst = mod.start({
      root, audio, unlockedSkins: s.unlocked.filter(u => u.startsWith('skin_')), best: s.best[meta!.id] ?? 0,
      started: () => { if (!hasStarted) { hasStarted = true; startedAt = Date.now(); track('game_start', { game: meta!.id, retry: isRetry }); } },
      finish: r => { if (token === runToken && alive) onFinish(r); },
      exit: () => go('/'),
    });
  }

  function intro() {
    layer.innerHTML = `<div class="ov" style="--c:${meta!.color}"><div style="font-size:72px">${meta!.emoji}</div><h3 style="color:${meta!.color}">${esc(meta!.title)}</h3>
      <div class="how">${esc(meta!.howto)}</div><div class="muted">${esc(meta!.desc)}</div>
      <button class="cta" id="start">▶ START</button><div class="muted">${audio.muted ? '🔇 ミュート中' : '🔊 音が出ます'}</div></div>`;
    layer.querySelector('#start')!.addEventListener('click', () => { audio.unlock(); audio.sfx('ok'); launch(false); });
  }

  function onFinish(r: GameResult) {
    const m = meta as GameMeta;
    const prevBest = load().best[m.id] ?? (m.higherIsBetter === false ? Infinity : -Infinity);
    const isBest = m.higherIsBetter === false ? r.score < prevBest : r.score > prevBest;
    const dur = Math.max(r.durationMs, startedAt ? Date.now() - startedAt : 0);
    const res = { ...r, durationMs: Math.min(r.durationMs || dur, dur) };
    const gain = award(m, res);
    mutate(s => {
      if (isBest) s.best[m.id] = r.score;
      s.plays[m.id] = (s.plays[m.id] ?? 0) + 1;
      s.history.push({ game: m.id, score: r.score, at: Date.now(), bp: gain.gained }); if (s.history.length > 50) s.history.shift();
    });
    track('game_over', { game: m.id, score: r.score, dur: Math.round(res.durationMs / 1000), best: isBest });
    audio.stopBgm();
    const achs = checkAchievements();
    showResult(m, res, isBest, gain, achs.map(a => `${a.emoji} 実績「${a.name}」`));
  }

  function showResult(m: GameMeta, r: GameResult, isBest: boolean, gain: ReturnType<typeof award>, notes: string[]) {
    const s = load();
    const nextU = UNLOCKABLES.filter(u => !s.unlocked.includes(u.id) && u.kind === 'skin')[0];
    const prevCost = [...UNLOCKABLES].reverse().find(u => s.unlocked.includes(u.id) && u.kind === 'skin')?.cost ?? 0;
    const pct = nextU ? Math.min(100, ((s.bp - prevCost) / (nextU.cost - prevCost)) * 100) : 100;
    const recs = [...ALL_META].filter(x => x.id !== m.id).sort((a, b) => (s.plays[a.id] ?? 0) - (s.plays[b.id] ?? 0)).slice(0, 2);
    layer.innerHTML = `<div class="ov res" style="--c:${m.color}">
      <div class="muted">${m.emoji} ${esc(m.title)}</div>
      <div class="score">${esc(r.scoreText)}</div>
      ${isBest ? '<div class="new">🎉 自己ベスト更新！</div>' : `<div class="muted">自己ベスト ${esc(String(s.best[m.id] ?? '-'))}${m.scoreUnit}</div>`}
      <button class="retry" id="retry" disabled>もう一回！</button>
      <div style="width:100%;text-align:left"><b style="color:var(--gold)">${gain.gained > 0 ? `+${gain.gained} BP` : 'BPなし'}</b> <span class="muted">${gain.capped ? '（本日の上限に到達）' : gain.gained === 0 ? '（3秒以上・得点が必要）' : ''}合計 ${s.bp}BP</span>
        <div class="bpbar"><i style="width:${pct}%"></i></div><div class="muted">${nextU ? `次: ${esc(nextU.name)}（${nextU.cost}BP）` : '全キャラ解放済み'}</div></div>
      ${[...gain.newlyUnlocked.map(u => `${u.emoji} 解放: ${u.name}`), ...notes].map(t => `<div class="chip bp">${esc(t)}</div>`).join('')}
      <div id="nickbox" style="width:100%"></div>
      <div class="shr"><button id="sx">𝕏</button><button id="sl">LINE</button><button id="ss">共有</button><button id="si">画像保存</button></div>
      <div class="muted" style="width:100%;text-align:left">他のゲームに挑戦</div>
      <div class="next">${recs.map(x => card(x)).join('')}</div>
      <button class="link" id="home">ホームへ戻る</button></div>`;
    setTimeout(() => layer.querySelector<HTMLButtonElement>('#retry')?.removeAttribute('disabled'), 700); // 誤タップ防止
    for (const u of gain.newlyUnlocked) { audio.sfx('unlock'); toast(`${u.emoji} ${u.name} を解放！`); track('character_unlocked', { id: u.id }); }
    layer.querySelector('#retry')!.addEventListener('click', () => { track('retry', { game: m.id }); audio.sfx('ok'); launch(true); });
    layer.querySelector('#home')!.addEventListener('click', () => go('/'));
    layer.querySelectorAll<HTMLElement>('[data-play]').forEach(b => b.addEventListener('click', () => { track('game_switch', { from: m.id, to: b.dataset.play! }); go('/play/' + b.dataset.play); }));
    const text = shareText(m, r, isBest);
    let img: Blob | undefined;
    const getImg = async () => (img ??= await makeImage(m, r, isBest, gain.gained));
    layer.querySelector('#sx')!.addEventListener('click', () => { track('share_click', { via: 'x', game: m.id }); openX(text); });
    layer.querySelector('#sl')!.addEventListener('click', () => { track('share_click', { via: 'line', game: m.id }); openLine(text); });
    layer.querySelector('#ss')!.addEventListener('click', async () => { track('share_click', { via: 'web', game: m.id }); const ok = await webShare(text, await getImg()); if (!ok) { try { await navigator.clipboard.writeText(text + ' ' + location.origin); toast('共有文をコピーしました'); } catch { openX(text); } } });
    layer.querySelector('#si')!.addEventListener('click', async () => { track('share_click', { via: 'image', game: m.id }); saveImage(await getImg(), `baka-${m.id}.png`); });
    // ランキング
    const box = layer.querySelector<HTMLElement>('#nickbox')!;
    const submit = async () => {
      const res = await submitScore(m.id, r.score, r.durationMs);
      box.innerHTML = res.ok ? `<div class="chip">🌍 ランキング登録！ 本日 ${res.rank ?? '-'}位</div>` : `<div class="muted">${res.reason === 'offline' ? 'オンラインに接続できないため記録は端末内のみ' : 'ランキング未登録（' + esc(String(res.reason ?? '')) + '）'}</div>`;
    };
    if (load().nickname) submit();
    else {
      box.innerHTML = `<div class="nick"><input id="ni" maxlength="12" placeholder="ニックネームでランキング参加" autocomplete="off"><button id="nb">登録</button></div>`;
      box.querySelector('#nb')!.addEventListener('click', () => { const v = (box.querySelector('#ni') as HTMLInputElement).value.trim().slice(0, 12); if (!v) return; mutate(x => { x.nickname = v; }); submit(); });
    }
  }

  intro();
  return () => { alive = false; teardown(); };
}
