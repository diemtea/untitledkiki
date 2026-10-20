// The encounter overlay: a storybook vignette in the style of a classic RPG battle screen, minus the
// battling. A pixel stage (192x108, scaled up) shows the scene and its characters; below it a text box
// types out the story and offers the ACT menu. Minigames run inside the same stage.
import { img } from './ui.js';
import { makeCanvas, ctx2d, seasonCanvas } from '../gfx/pixel.js';
import { treeCanvas, tuftCanvas } from '../gfx/sprites.js';
import { clamp } from '../core/util.js';

export const SW = 192, SH = 108;

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const starsHTML = (n, of = 3) => `<span class="stars3">${'★'.repeat(n)}<i>${'★'.repeat(of - n)}</i></span>`;

// ------------------------------------------------------------------ scene painting
const GRASS = [['#6ac25a', '#4fae48', '#9ce070'], ['#a8c84a', '#7aa83a', '#d8e070'], ['#e8a040', '#c87a2a', '#f8c860'], ['#f4f8ff', '#cfd8f0', '#ffffff']];
const LEAVES = ['green', 'gold', 'gold', 'teal'];
function skyColors(hour, rain) {
  if (hour >= 20.5 || hour < 5) return ['#1e1a66', '#4a44a0'];
  if (hour < 7) return ['#7a78e0', '#ffb4b8'];
  if (hour >= 18) return ['#6a78e0', '#ffc884'];
  return rain ? ['#8a9ac8', '#d8e0ee'] : ['#4ab2f8', '#c8f2ff'];
}
function vgrad(g, y0, y1, a, b) {
  const n = y1 - y0;
  const A = hex(a), B = hex(b);
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    // ordered dithering between bands keeps it pixel-crisp
    const k = Math.round(t * 6) / 6;
    g.fillStyle = `rgb(${A[0] + (B[0] - A[0]) * k | 0},${A[1] + (B[1] - A[1]) * k | 0},${A[2] + (B[2] - A[2]) * k | 0})`;
    g.fillRect(0, y0 + i, SW, 1);
  }
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hills(g, y, amp, freq, ph, col) {
  g.fillStyle = col;
  for (let x = 0; x < SW; x++) {
    const hh = Math.round(y - amp * (0.5 + 0.5 * Math.sin(x * freq + ph)) - amp * 0.4 * Math.sin(x * freq * 2.3 + ph * 2));
    g.fillRect(x, hh, 1, SH - hh);
  }
}
function stars(g, t, n = 40) {
  for (let i = 0; i < n; i++) {
    const x = (i * 73) % SW, y = (i * 37) % 50;
    if ((Math.sin(t * 2 + i) + 1) > 0.6) { g.fillStyle = i % 5 ? '#fff6e4' : '#ffe48a'; g.fillRect(x, y, 1, 1); }
  }
}

export function paintScene(g, scene, t, env) {
  const si = env.season || 0;
  const [gr, grD, grL] = GRASS[si];
  const [top, hor] = skyColors(env.hour, env.rain);
  const night = env.hour >= 20.5 || env.hour < 5;
  if (scene === 'storm') {
    vgrad(g, 0, SH, night ? '#141238' : '#4a4a78', night ? '#2a2a60' : '#8a8ab8');
    for (let i = 0; i < 8; i++) {
      const x = ((i * 57 - t * (20 + i * 4)) % (SW + 70) + SW + 70) % (SW + 70) - 50, y = 6 + (i * 23) % 70;
      g.fillStyle = '#3a3a62'; g.fillRect(x, y, 44, 8); g.fillRect(x + 8, y - 5, 26, 5);
      g.fillStyle = '#5a5a88'; g.fillRect(x + 10, y - 5, 18, 2);
    }
    g.fillStyle = 'rgba(220,230,255,0.45)';
    for (let i = 0; i < 40; i++) { const x = ((i * 37 - t * 140) % SW + SW) % SW, y = ((i * 53 + t * 220) % SH); g.fillRect(x | 0, y | 0, 1, 4); }
    if ((t * 0.7) % 4 < 0.08) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, SW, SH); }
    return;
  }
  if (scene === 'sky') {
    vgrad(g, 0, SH, top, hor);
    if (night) stars(g, t, 60);
    // drifting clouds
    for (let i = 0; i < 7; i++) {
      const x = ((i * 61 - t * (8 + i * 3)) % (SW + 60) + SW + 60) % (SW + 60) - 40, y = 12 + (i * 29) % 80;
      g.fillStyle = night ? '#4a4890' : '#ffffff';
      g.fillRect(x, y, 34, 6); g.fillRect(x + 6, y - 4, 20, 4); g.fillRect(x + 4, y + 6, 26, 2);
      g.fillStyle = night ? '#3a3878' : '#dcd6f4';
      g.fillRect(x + 2, y + 6, 30, 2);
    }
    return;
  }
  vgrad(g, 0, 70, top, hor);
  if (night) stars(g, t);
  if (scene === 'beach' || scene === 'dock' || scene === 'lighthouse') {
    // the sea
    g.fillStyle = night ? '#1e3a7a' : '#2f8ad0'; g.fillRect(0, 52, SW, 30);
    g.fillStyle = night ? '#2a4a8a' : '#44b8e0'; g.fillRect(0, 52, SW, 3);
    for (let i = 0; i < 14; i++) { const x = (i * 41 + Math.floor(t * 6) * (i % 2 ? 1 : -1)) % SW; g.fillStyle = '#e8fbff'; g.fillRect((x + SW) % SW, 58 + (i * 7) % 20, 5, 1); }
    if (scene === 'lighthouse') {
      g.fillStyle = '#9a90b0'; g.fillRect(118, 40, 46, 30);
      g.fillStyle = '#fffdf6'; g.fillRect(134, 6, 14, 40);
      g.fillStyle = '#ff3b52'; for (let y = 10; y < 44; y += 10) g.fillRect(134, y, 14, 4);
      g.fillStyle = '#ffe48a'; g.fillRect(132, 0, 18, 7);
      g.fillStyle = '#4a3548'; g.fillRect(131, 6, 20, 2);
    }
    if (scene === 'dock') {
      g.fillStyle = '#9a6a48'; g.fillRect(0, 72, SW, 36);
      g.fillStyle = '#b8845a'; for (let x = 0; x < SW; x += 12) g.fillRect(x, 72, 11, 36);
      g.fillStyle = '#6a4436'; for (let x = 11; x < SW; x += 12) g.fillRect(x, 72, 1, 36);
      // lanterns on a string
      for (let x = 8; x < SW; x += 30) { g.fillStyle = '#4a3548'; g.fillRect(x, 20 + Math.sin(x) * 2, 30, 1); g.fillStyle = night ? '#ffe48a' : '#ff8a6a'; g.fillRect(x + 14, 22, 3, 4); }
    } else {
      g.fillStyle = '#fbe2ae'; g.fillRect(0, 76, SW, 32);
      g.fillStyle = '#f0c890'; g.fillRect(0, 76, SW, 2);
      g.fillStyle = '#9ce4c8'; g.fillRect(0, 74, SW, 2);
    }
    return;
  }
  if (scene === 'ridge') {
    hills(g, 46, 26, 0.04, 1, '#b8c0e8');
    hills(g, 56, 16, 0.06, 3, '#dfe4f8');
    g.fillStyle = '#f4f8ff'; g.fillRect(0, 70, SW, 38);
    g.fillStyle = '#e0e8f8'; for (let i = 0; i < 30; i++) g.fillRect((i * 53) % SW, 72 + (i * 11) % 34, 6, 1);
    return;
  }
  if (scene === 'woods') {
    vgrad(g, 0, 70, night ? '#0e1a3a' : '#2e6a5a', night ? '#1e3a4a' : '#7ac8a0');
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1f5a5a' : '#215e4e'; const x = i * 26 - 6; g.fillRect(x, 0, 12, 76); g.fillStyle = '#163e4a'; g.fillRect(x + 9, 0, 3, 76); }
    // light shafts
    if (!night) for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,244,200,0.14)'; for (let y = 0; y < 72; y++) g.fillRect(30 + i * 60 + y * 0.4, y, 10, 1); }
    g.fillStyle = si === 3 ? '#e8eef8' : si === 2 ? '#a86a3a' : '#2f8a5a'; g.fillRect(0, 74, SW, 34);
    g.fillStyle = si === 3 ? '#ffffff' : si === 2 ? '#c88a4a' : '#56a856'; for (let i = 0; i < 40; i++) g.fillRect((i * 37) % SW, 76 + (i * 13) % 30, 3, 1);
    if (night) for (let i = 0; i < 10; i++) { g.fillStyle = '#d8ff7a'; g.fillRect((i * 47 + Math.sin(t + i) * 6 + SW) % SW, 30 + (i * 23) % 40 + Math.sin(t * 2 + i) * 3, 1, 1); }
    return;
  }
  // meadow-like scenes: meadow, road, tree, pond, farm
  hills(g, 60, 10, 0.05, 2, si === 3 ? '#dfe4f8' : si === 2 ? '#d8905a' : '#7cc0a0');
  g.fillStyle = gr; g.fillRect(0, 66, SW, 42);
  g.fillStyle = grD; for (let i = 0; i < 60; i++) g.fillRect((i * 29) % SW, 68 + (i * 7) % 40, 2, 1);
  g.fillStyle = grL; for (let i = 0; i < 30; i++) g.fillRect((i * 43 + 7) % SW, 70 + (i * 11) % 36, 1, 1);
  if (si < 3) for (let i = 0; i < 16; i++) { g.fillStyle = ['#ff8ab8', '#ffe48a', '#fffdf6', '#b8a8f0'][i % 4]; g.fillRect((i * 67 + 11) % SW, 72 + (i * 19) % 34, 1, 1); }
  if (scene === 'road') {
    // a little humped stone bridge over a brook
    g.fillStyle = '#5ac8e8'; g.fillRect(0, 84, SW, 8);
    g.fillStyle = '#9ce4ff'; for (let i = 0; i < 8; i++) g.fillRect((i * 29 + Math.floor(t * 10)) % SW, 86 + (i % 3), 4, 1);
    g.fillStyle = '#b8aac8'; g.fillRect(48, 70, 96, 14);
    g.fillStyle = '#d6cae0'; g.fillRect(48, 68, 96, 3);
    g.fillStyle = '#4a3a6a'; g.fillRect(80, 76, 32, 8); g.fillRect(84, 74, 24, 2);
    g.fillStyle = '#8a7aa8'; for (let x = 50; x < 144; x += 8) g.fillRect(x, 72, 1, 10);
  }
  if (scene === 'pond') {
    g.fillStyle = si === 3 ? '#cfe8ff' : '#4ab8d8'; g.fillRect(30, 78, 132, 20); g.fillRect(40, 76, 112, 24);
    g.fillStyle = si === 3 ? '#ffffff' : '#9ce4ff'; for (let i = 0; i < 6; i++) g.fillRect(44 + i * 20, 84 + (i % 2) * 6, 6, 1);
    if (si < 3) for (const [x, y] of [[50, 86], [96, 90], [140, 85]]) { g.fillStyle = '#4fae48'; g.fillRect(x, y, 12, 4); g.fillRect(x + 2, y - 1, 8, 1); g.fillStyle = '#ff8ab8'; g.fillRect(x + 8, y - 2, 2, 2); }
  }
  if (scene === 'road' || scene === 'pond') {
    g.drawImage(seasonCanvas(treeCanvas(si === 0 ? 'blossom' : 'oak', 4), si), 2, 74 - 60);
    g.drawImage(seasonCanvas(treeCanvas('oak', 1), si), 150, 72 - 60);
  }
  if (scene === 'tree' || scene === 'meadow' || scene === 'farm') {
    const kind = scene === 'tree' ? 'oak' : 'apple';
    const tc = seasonCanvas(treeCanvas(si === 0 && scene !== 'tree' ? 'blossom' : kind, 2), si);
    if (scene === 'tree') {
      // one big tree, scaled up, filling the left of the stage
      const k = 2;
      g.imageSmoothingEnabled = false;
      g.drawImage(tc, 64 - (tc.width * k) / 2, 82 - tc.height * k, tc.width * k, tc.height * k);
    } else {
      g.drawImage(tc, 12, 70 - tc.height);
      g.drawImage(seasonCanvas(treeCanvas('oak', 3), si), 150, 72 - tc.height);
    }
  }
  for (let i = 0; i < 6; i++) { const tc = seasonCanvas(tuftCanvas('meadow', i), si); g.drawImage(tc, (i * 37 + 9) % SW, 96 + (i % 3) * 4 - tc.height); }
  if (env.season === 3) { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 30; i++) { const x = (i * 31 + t * 9 * (1 + (i % 3))) % SW, y = (i * 17 + t * 14 * (1 + (i % 2))) % SH; g.fillRect(x | 0, y | 0, 1, 1); } }
}

// ------------------------------------------------------------------ tiny particle system
class Sparks {
  constructor() { this.list = []; }
  burst(x, y, { n = 12, color = '#ffe48a', speed = 40, life = 0.7, gravity = 60, colors = null } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life, max: life, color: colors ? colors[i % colors.length] : color, gravity });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(g) {
    for (const p of this.list) { g.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1); g.fillStyle = p.color; g.fillRect(p.x | 0, p.y | 0, p.life > p.max * 0.5 ? 2 : 1, p.life > p.max * 0.5 ? 2 : 1); }
    g.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ the overlay
export class EncounterUI {
  constructor(game) {
    this.game = game;
    const el = h('div', '', `
      <div class="enc-frame">
        <div class="enc-stage"><canvas width="${SW}" height="${SH}"></canvas><div class="enc-banner"></div><div class="enc-hud"></div></div>
        <div class="panel enc-box"><div class="enc-who"></div><div class="enc-text"></div><div class="enc-opts"></div><div class="enc-hint"></div></div>
      </div>`);
    el.id = 'enc';
    game.uiRoot.appendChild(el);
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.g = ctx2d(this.canvas);
    this.banner = el.querySelector('.enc-banner');
    this.hudEl = el.querySelector('.enc-hud');
    this.who = el.querySelector('.enc-who');
    this.text = el.querySelector('.enc-text');
    this.opts = el.querySelector('.enc-opts');
    this.hint = el.querySelector('.enc-hint');
    this.fx = new Sparks();
    this.actors = [];
    this.t = 0;
    this.shakeT = 0;
    // pointer input on the stage (stage pixel coordinates)
    this.tap = null;
    this.pointer = { x: SW / 2, y: SH / 2, down: false };
    const toStage = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * SW, y: ((e.clientY - r.top) / r.height) * SH };
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const p = toStage(e);
      this.tap = p;
      Object.assign(this.pointer, p, { down: true });
      if (!this.game_) this._advanceReq = true;
    });
    this.canvas.addEventListener('pointermove', (e) => { const p = toStage(e); this.pointer.x = p.x; this.pointer.y = p.y; });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
    el.querySelector('.enc-box').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; this._advanceReq = true; });
  }

  get open() { return this.el.classList.contains('show'); }

  show(env) {
    this.env = env;
    this.el.classList.add('show');
    this.game.ui.overlay = this;
    this.actors = [];
    this.fx.list = [];
    this.game_ = null;
    this.hudEl.innerHTML = '';
    this.opts.innerHTML = '';
    this.text.textContent = '';
    this.hint.textContent = '';
  }
  hide() {
    this.el.classList.remove('show');
    if (this.game.ui.overlay === this) this.game.ui.overlay = null;
    this.game_ = null;
  }

  setBanner(html, ms = 2200) {
    this.banner.innerHTML = html;
    this.banner.classList.add('on');
    clearTimeout(this._bt);
    if (ms) this._bt = setTimeout(() => this.banner.classList.remove('on'), ms);
  }
  hud(html) { this.hudEl.innerHTML = html || ''; }
  shake(s = 0.3) { this.shakeT = s; }

  // stage actors: {c (canvas), x, y (bottom-centre), bob, flip, alpha, id}
  setActors(list) { this.actors = list; }
  actor(id) { return this.actors.find((a) => a.id === id); }

  // ---------------------------------------------------------------- text + menu
  setWho(who) { this.who.innerHTML = who ? `${who.name}${who.role ? `<small>${who.role}</small>` : ''}` : ''; this.voice = who?.voice ?? 0; }
  say(text, who = undefined) {
    if (who !== undefined) this.setWho(who);
    this.opts.innerHTML = '';
    this.hint.innerHTML = this.game.isTouch ? 'tap to continue' : '<kbd>E</kbd> continue';
    return new Promise((resolve) => {
      let i = 0;
      this.typing = true;
      this.text.textContent = '';
      clearInterval(this._typer);
      this._typer = setInterval(() => {
        i += 2;
        this.text.textContent = text.slice(0, i);
        if (i % 6 === 0) this.game.audio?.blip(this.voice);
        if (i >= text.length) { clearInterval(this._typer); this.typing = false; }
      }, 24);
      this._onAdvance = () => {
        if (this.typing) { clearInterval(this._typer); this.text.textContent = text; this.typing = false; return; }
        this._onAdvance = null;
        resolve();
      };
    });
  }
  // options: [{label, icon, sub, disabled, cls}] -> index
  choose(options, prompt = null) {
    if (prompt != null) this.text.textContent = prompt;
    this.hint.innerHTML = this.game.isTouch ? 'tap an option' : '<kbd>←↑↓→</kbd> choose · <kbd>E</kbd> select';
    this.opts.innerHTML = '';
    return new Promise((resolve) => {
      const btns = options.map((o, k) => {
        const b = h('button', 'btn enc-opt ' + (o.cls || ''), `${o.icon ? img(o.icon) : ''}<span><b>${o.label}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span>`);
        b.disabled = !!o.disabled;
        b.addEventListener('click', (e) => { e.stopPropagation(); if (!b.disabled) done(k); });
        this.opts.appendChild(b);
        return b;
      });
      let sel = btns.findIndex((b) => !b.disabled);
      const mark = () => btns.forEach((b, k) => b.classList.toggle('sel', k === sel));
      mark();
      const done = (k) => { this._onNav = null; this.opts.innerHTML = ''; this.game.audio.sfx('click'); resolve(k); };
      this._onNav = (dx, dy, confirm) => {
        if (confirm) { if (sel >= 0) done(sel); return; }
        const cols = window.innerWidth < 640 ? 1 : 2;
        let n = sel;
        for (let tries = 0; tries < btns.length; tries++) {
          n = (n + (dy * cols + dx) + btns.length) % btns.length;
          if (!btns[n].disabled) break;
        }
        sel = n; mark();
        this.game.audio.sfx('click');
      };
    });
  }

  // ---------------------------------------------------------------- minigames
  // module: { create(host, params) -> { update(dt) -> grade|null, draw(g) } }
  play(module, params) {
    // async minigames (talking ones) drive the text box themselves while the stage keeps animating
    if (module.run) return module.run(this.host(), params);
    return new Promise((resolve) => {
      this.opts.innerHTML = '';
      this.text.textContent = params.howto || '';
      this.hint.innerHTML = params.keys || '';
      const host = this.host();
      this.game_ = { inst: module.create(host, params), resolve };
    });
  }
  host() {
    const self = this, game = this.game, input = game.input;
    return {
      W: SW, H: SH, get t() { return self.t; },
      env: this.env,
      fx: this.fx,
      audio: game.audio,
      sfx: (n) => game.audio.sfx(n),
      tone: (...a) => game.audio.tone(...a),
      shake: (s) => self.shake(s),
      hud: (html) => self.hud(html),
      say: (txt) => { self.text.textContent = txt; },
      banner: (html, ms) => self.setBanner(html, ms),
      paint: (scene) => paintScene(self.g, scene, self.t, self.env),
      pressed: (a) => input.pressed(a),
      held: (a) => input.held(a),
      axis: () => input.axis(),
      get tap() { return self.tap; },
      get pointer() { return self.pointer; },
      spr: (c, x, y, o = {}) => drawSprite(self.g, c, x, y, o),
      sayWait: (txt, who) => self.say(txt, who),
      choose: (opts, prompt) => self.choose(opts, prompt),
      actor: (id) => self.actor(id),
      isTouch: game.isTouch,
    };
  }

  // ---------------------------------------------------------------- per-frame (called from Game.update)
  update(dt, input) {
    this.t += dt;
    const g = this.g;
    // input routing
    const confirm = input.pressed('interact');
    if (this._onNav) {
      if (input.pressed('left')) this._onNav(-1, 0);
      else if (input.pressed('right')) this._onNav(1, 0);
      else if (input.pressed('up')) this._onNav(0, -1);
      else if (input.pressed('down')) this._onNav(0, 1);
      else if (confirm) this._onNav(0, 0, true);
    } else if (!this.game_ && this._onAdvance && (confirm || this._advanceReq)) this._onAdvance();
    this._advanceReq = false;
    // draw
    g.save();
    if (this.shakeT > 0) { this.shakeT -= dt; g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3)); }
    if (this.game_) {
      const res = this.game_.inst.update(dt);
      this.game_.inst.draw(g);
      if (res != null) { const r = this.game_.resolve; this.game_ = null; this.hud(''); r(res); }
    } else {
      paintScene(g, this.env.scene, this.t, this.env);
      for (const a of this.actors) {
        const bob = a.bob ? Math.round(Math.sin(this.t * (a.bobSpeed || 2.4) + (a.ph || 0)) * a.bob) : 0;
        let x = a.x;
        if (a.shakeT > 0) { a.shakeT -= dt; x += Math.round(Math.sin(this.t * 60) * 2); }
        if (a.hopT > 0) { a.hopT -= dt; }
        const hop = a.hopT > 0 ? -Math.round(Math.sin((1 - a.hopT / 0.4) * Math.PI) * 6) : 0;
        drawSprite(g, typeof a.c === 'function' ? a.c(this.t) : a.c, x, a.y + bob + hop, a);
      }
    }
    this.fx.update(dt);
    this.fx.draw(g);
    g.restore();
    this.tap = null;
  }
}

export function drawSprite(g, c, x, y, o = {}) {
  if (!c) return;
  const k = o.scale || 1;
  const w = c.width * k, hh = c.height * k;
  g.save();
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.imageSmoothingEnabled = false;
  const dx = Math.round(x - w / 2), dy = Math.round(y - hh);
  if (o.flip) { g.translate(dx + w, dy); g.scale(-1, 1); g.drawImage(c, 0, 0, w, hh); }
  else g.drawImage(c, dx, dy, w, hh);
  g.restore();
}

// small helper canvas cache for minigames
export function solid(w, hh, col) { const c = makeCanvas(w, hh); const g = ctx2d(c); g.fillStyle = col; g.fillRect(0, 0, w, hh); return c; }
