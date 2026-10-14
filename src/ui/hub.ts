import { ALL_META } from '../core/registry';
import { load, mutate } from '../core/storage';
import { UNLOCKABLES } from '../core/bp';
import { ACHS } from '../core/achievements';
import { fetchRanking, type Period } from '../core/ranking';
import { audio, go } from '../core/shared';
import { discovered } from '../core/codex';
import type { GameMeta } from '../core/types';
import { pic, hasImg, placeholder } from '../core/images';
import { ICON } from './icons';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const fmt = (m: GameMeta, v: number) => m.id === 'hair' ? `${v.toFixed(1)}${m.scoreUnit}` : `${Math.round(v)}${m.scoreUnit}`;

export function card(m: GameMeta, big = false, badge = ''): string {
  const s = load(), best = s.best[m.id];
  return `<a class="card ${big ? 'big' : ''}" style="--c:${m.color}" href="/games/${m.slug}" data-play="${m.id}" aria-label="${esc(m.title)}を遊ぶ">
    ${badge || m.isNew ? `<span class="badge">${badge || 'NEW'}</span>` : ''}
    <div class="poster">${hasImg(m.slug, 'key') ? pic(m.slug, 'key', 'pimg', m.title) : placeholder('key')}<span class="no">No.${String(m.no).padStart(2, '0')}</span></div>
    <div class="body"><div class="t">${esc(m.title)}</div><div class="d">${esc(m.command)}</div>
    ${best != null ? `<div class="bestline">BEST ${fmt(m, best)}</div>` : ''}
    <div class="pbtn">PLAY</div></div></a>`;
}

export function renderHub(app: HTMLElement) {
  const s = load();
  const played = ALL_META.filter(m => (s.plays[m.id] ?? 0) > 0);
  const popular = ALL_META.find(m => m.flagship)!;
  const others = ALL_META.filter(m => m !== popular);
  const today = ALL_META[Math.floor(Date.now() / 864e5) % ALL_META.length];
  const reco = [...ALL_META].sort((a, b) => (s.plays[a.id] ?? 0) - (s.plays[b.id] ?? 0))[0];
  const nextUnlock = UNLOCKABLES.filter(u => u.kind === 'skin' && !s.unlocked.includes(u.id))[0];
  app.innerHTML = `<div class="hub">
  <div class="top"><div class="logo">BAKA ARCADE</div><div style="display:flex;gap:6px"><span class="chip bp">${ICON.gem} ${s.bp} BP</span><button class="chip" id="mute" aria-label="ミュート">${audio.muted ? ICON.mute : ICON.sound}</button></div></div>
  <section class="hero"><div class="eyebrow">10 GAMES / 10〜30秒 / 無料・ログイン不要</div>
    <h1>BAKA<br>ARCADE</h1><p>見た目は超リアル。<br>やることは超くだらない。</p>
    <button class="cta" data-play="${popular.id}">いますぐ遊ぶ</button></section>

  <h2>今日のゲーム</h2><div class="grid">${card(today, true, 'TODAY')}</div>
  <h2>人気</h2><div class="row-scroll">${[popular, ...others.filter(m => m !== today)].map(m => card(m)).join('')}</div>
  <h2>新着</h2><div class="row-scroll">${ALL_META.filter(m => m.isNew).map(m => card(m)).join('') || card(others[others.length - 1])}</div>
  <h2>すべてのゲーム</h2><div class="grid">${ALL_META.map(m => card(m)).join('')}</div>

  <h2>ランキング</h2>
  <div class="tabs" id="rg">${ALL_META.map((m, i) => `<button class="tab ${i === 0 ? 'on' : ''}" data-g="${m.id}">${esc(m.title.slice(0, 7))}</button>`).join('')}</div>
  <div class="tabs" id="rp"><button class="tab on" data-p="today">本日</button><button class="tab" data-p="week">週間</button><button class="tab" data-p="all">歴代</button></div>
  <div class="list" id="rank"><div class="muted" style="padding:10px">読み込み中…</div></div>
  <div class="muted" style="margin:6px 2px">ニックネーム: <b>${esc(s.nickname || '未設定')}</b> <button class="link" id="nick">変更</button>（ゲーム終了画面でも登録できます）</div>

  <h2>プレイ履歴</h2>
  <div class="list">${s.history.length ? s.history.slice(-6).reverse().map(h => { const m = ALL_META.find(x => x.id === h.game)!; return `<div class="row"><span>${esc(m.title)}</span><span><b>${fmt(m, h.score)}</b> <span class="muted">+${h.bp}BP</span></span></div>`; }).join('') : '<div class="muted" style="padding:10px">まだ履歴がありません。まずは1プレイ！</div>'}</div>

  <h2>バカポイントとキャラ解放</h2>
  <div class="muted" style="margin:0 2px 8px">${nextUnlock ? `次の解放「${esc(nextUnlock.name)}」まであと ${Math.max(0, nextUnlock.cost - s.bp)}BP` : '全キャラ解放済み！'}（BPはゲーム内専用・換金不可。1日の獲得上限あり）</div>
  <div class="skins">${UNLOCKABLES.filter(u => u.kind === 'skin').map(u => { const has = s.unlocked.includes(u.id); return `<button class="skin ${has ? '' : 'lock'} ${s.selectedSkin === u.id ? 'on' : ''}" data-skin="${u.id}"><div class="e">${has ? String(UNLOCKABLES.filter(x => x.kind === 'skin').indexOf(u) + 1).padStart(2, '0') : ICON.lock}</div><b>${esc(u.name)}</b><div class="muted">${has ? u.desc : u.cost + 'BP'}</div></button>`; }).join('')}</div>

  <h2>レア結果図鑑 <span class="muted">(${Object.keys(discovered()).length}/${ALL_META.reduce((a, m) => a + m.rares.length, 0)})</span></h2>
  <div class="ach">${ALL_META.flatMap(m => m.rares.map(r => { const n = discovered()[m.id + ":" + r.id]; return `<div class="achi ${n ? "got" : ""}"><b>${n ? esc(r.name) : "？？？"}</b>${n ? esc(m.title) + " ×" + n : "ヒント：" + esc(r.hint)}</div>`; })).join("")}</div>

  <h2>実績・称号</h2>
  <div class="muted" style="margin:0 2px 8px">称号: ${UNLOCKABLES.filter(u => u.kind === 'title' && s.unlocked.includes(u.id)).map(u => esc(u.name.replace('称号：', ''))).join(' / ') || 'まだなし'}</div>
  <div class="ach">${ACHS.map(a => `<div class="achi ${s.achievements.includes(a.id) ? 'got' : ''}"><b>${esc(a.name)}</b>${esc(a.desc)}</div>`).join('')}</div>
  <div class="foot">BAKA ARCADE — 計測は匿名・軽量（個人情報は取得しません）。<br>広告は現在表示していません。スコアはサーバー側で検証されます。</div></div>`;

  app.querySelectorAll<HTMLElement>('[data-play]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); audio.unlock(); audio.sfx('tap'); go('/play/' + b.dataset.play); }));
  app.querySelector('#mute')!.addEventListener('click', e => { audio.setMuted(!audio.muted); (e.currentTarget as HTMLElement).innerHTML = audio.muted ? ICON.mute : ICON.sound; });
  app.querySelectorAll<HTMLElement>('[data-skin]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.skin!; if (!load().unlocked.includes(id)) return; mutate(x => { x.selectedSkin = id; }); renderHub(app);
  }));
  app.querySelector('#nick')!.addEventListener('click', () => {
    const v = prompt('ニックネーム（12文字まで）', load().nickname); if (v != null) { mutate(x => { x.nickname = v.trim().slice(0, 12); }); renderHub(app); }
  });
  let g = ALL_META[0].id, p: Period = 'today';
  const rankEl = app.querySelector('#rank')!;
  const loadRank = async () => {
    rankEl.innerHTML = '<div class="muted" style="padding:10px">読み込み中…</div>';
    const m = ALL_META.find(x => x.id === g)!, rows = await fetchRanking(g, p), mine = load().best[g];
    const me = `<div class="row"><span class="muted">自己ベスト（この端末）</span><b>${mine != null ? fmt(m, mine) : '—'}</b></div>`;
    if (!rows) { rankEl.innerHTML = me + '<div class="muted" style="padding:8px 0">オンラインランキングに接続できません。（ローカル記録のみ表示）</div>'; return; }
    rankEl.innerHTML = me + (rows.length ? rows.map((r, i) => `<div class="row"><span><span class="n">${i + 1}</span>${esc(r.nickname)}</span><b>${fmt(m, r.score)}</b></div>`).join('') : '<div class="muted" style="padding:8px 0">まだ記録がありません。最初の1位になろう！</div>');
  };
  app.querySelector('#rg')!.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-g]'); if (!t) return; g = t.dataset.g!; app.querySelectorAll('#rg .tab').forEach(x => x.classList.toggle('on', x === t)); loadRank(); });
  app.querySelector('#rp')!.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-p]'); if (!t) return; p = t.dataset.p as Period; app.querySelectorAll('#rp .tab').forEach(x => x.classList.toggle('on', x === t)); loadRank(); });
  loadRank();
}
