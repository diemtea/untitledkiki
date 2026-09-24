// DOM user interface: HUD, prompts, toasts, typewriter dialog, modal panels and touch controls.
import { itemCanvas, iconCanvas, petCanvas, npcCanvas, NPC_LOOKS, witchSheet, sootSheet } from '../gfx/sprites.js';
import { upscale, makeCanvas, ctx2d } from '../gfx/pixel.js';
import { ITEMS } from '../game/data.js';
import { fmtTime } from '../core/util.js';

const urlCache = new Map();
export function iconURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  let c;
  if (id.startsWith('icon:')) c = iconCanvas(id.slice(5));
  else if (id.startsWith('pet:')) c = petCanvas(id.slice(4));
  else c = itemCanvas(id);
  const url = upscale(c, 4).toDataURL();
  urlCache.set(id, url);
  return url;
}
export function img(id, cls = 'px') {
  return `<img class="${cls}" src="${iconURL(id)}" alt="" draggable="false">`;
}

export function portraitURL(who) {
  const key = 'portrait:' + (typeof who === 'string' ? who : JSON.stringify(who));
  if (urlCache.has(key)) return urlCache.get(key);
  let src;
  if (who === 'witch') src = witchSheet().down[0];
  else if (who === 'soot') src = sootSheet().sit;
  else if (typeof who === 'string' && who.startsWith('pet:')) src = petCanvas(who.slice(4));
  else if (typeof who === 'string') src = npcCanvas(NPC_LOOKS[who] || NPC_LOOKS.kid);
  else src = npcCanvas(who);
  // crop to head & shoulders
  const h = Math.min(src.height, who === 'soot' || String(who).startsWith('pet:') ? src.height : 19);
  const c = makeCanvas(src.width, h);
  ctx2d(c).drawImage(src, 0, 0);
  const url = upscale(c, 6).toDataURL();
  urlCache.set(key, url);
  return url;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.cache = {};
    this.dialogOpen = false;
    this.modal = null;
    this.buildHUD();
    this.buildDialog();
    this.buildModal();
    this.buildTouch();
  }
  el(tag, cls, html) { return el(tag, cls, html); }

  // ----------------------------------------------------------------- HUD
  buildHUD() {
    const r = this.root;
    this.hud = el('div', 'hud-layer');
    this.hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none';
    r.appendChild(this.hud);
    this.clockBox = el('div', 'hud', '');
    this.clockBox.id = 'hud-clock';
    this.clockPanel = el('div', 'panel clock', `<img class="px sunmoon"><div><div class="day"></div><div class="time"></div></div><img class="px weather">`);
    this.tasksPanel = el('div', 'panel', '<h4>Today</h4><ul></ul>');
    this.tasksPanel.id = 'hud-tasks';
    this.clockBox.append(this.clockPanel, this.tasksPanel);
    this.money = el('div', 'hud', `<div class="panel stat coins">${img('icon:coin')}<span>0</span></div><div class="panel stat rep">${img('icon:star')}<span>0</span></div>`);
    this.money.id = 'hud-money';
    this.promptEl = el('div', 'hud panel', '');
    this.promptEl.id = 'hud-prompt';
    this.bar = el('div', 'hud panel', '');
    this.bar.id = 'hud-bar';
    this.bar.style.pointerEvents = 'auto';
    this.bar.addEventListener('click', () => this.game.openBag());
    this.buttons = el('div', 'hud', '');
    this.buttons.id = 'hud-buttons';
    const mk = (label, key, fn) => {
      const b = el('button', 'btn', `<kbd>${key}</kbd><span>${label}</span>`);
      b.dataset.k = label.toLowerCase();
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      this.buttons.appendChild(b);
      return b;
    };
    mk('Bag', 'I', () => this.game.openBag());
    mk('Journal', 'J', () => this.game.openJournal());
    mk('Map', 'M', () => this.game.openMap());
    mk('Menu', 'Esc', () => this.game.openPause());
    this.party = el('div', 'hud panel', '');
    this.party.id = 'hud-party';
    this.compass = el('div', '', `<img class="px" src="${iconURL('icon:arrow')}">`);
    this.compass.id = 'hud-compass';
    this.toasts = el('div', '', '');
    this.toasts.id = 'toasts';
    this.hud.append(this.clockBox, this.money, this.promptEl, this.bar, this.buttons, this.party, this.compass);
    r.appendChild(this.toasts);
  }
  showHUD(v) { this.hud.style.display = v ? 'block' : 'none'; }

  set(key, val, fn) {
    if (this.cache[key] === val) return;
    this.cache[key] = val;
    fn(val);
  }

  updateHUD(g) {
    const s = g.state;
    this.set('talking', this.dialogOpen || !!this.modal, (v) => document.body.classList.toggle('talking', v));
    const hour = s.time / 60;
    const night = hour < 6 || hour >= 20;
    this.set('sun', night, (v) => (this.clockPanel.querySelector('.sunmoon').src = iconURL(v ? 'icon:moon' : 'icon:sun')));
    this.set('day', `Day ${s.day} · ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.day % 7]}`, (v) => (this.clockPanel.querySelector('.day').textContent = v));
    this.set('time', fmtTime(s.time), (v) => (this.clockPanel.querySelector('.time').textContent = v));
    const wIcon = s.weather.rain > 0 ? 'icon:rain' : s.weather.cloud > 0.3 ? 'icon:cloud' : night ? 'icon:moon' : 'icon:sun';
    this.set('weather', wIcon, (v) => (this.clockPanel.querySelector('.weather').src = iconURL(v)));
    this.set('coins', s.coins, (v) => {
      const e = this.money.querySelector('.coins');
      e.querySelector('span').textContent = v;
      e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump');
    });
    this.set('rep', Math.floor(s.rep), (v) => {
      const e = this.money.querySelector('.rep');
      e.querySelector('span').textContent = v;
      e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump');
    });
    const cap = g.satchelCap();
    const slots = s.satchel.map((x) => `${x.id}:${x.n}`).join(',') + '|' + cap;
    this.set('bar', slots, () => {
      let h = `<img class="px bag-icon" src="${iconURL('icon:bag')}">`;
      for (let i = 0; i < cap; i++) {
        const it = s.satchel[i];
        if (it) h += `<div class="slot ${it.id === 'parcel' ? 'parcel' : ''}" title="${ITEMS[it.id]?.name || it.id}">${img(it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}</div>`;
        else h += `<div class="slot empty"></div>`;
      }
      this.bar.innerHTML = h;
    });
    const tasks = g.todayTasks();
    this.set('tasks', JSON.stringify(tasks), () => {
      const ul = this.tasksPanel.querySelector('ul');
      ul.innerHTML = tasks.map((t) => `<li class="${t.done ? 'done' : ''}">${t.icon ? img(t.icon) : ''}<span>${t.text}</span></li>`).join('');
      this.tasksPanel.style.display = tasks.length ? '' : 'none';
    });
    const party = g.partyList();
    this.set('party', party.map((p) => p.species + p.name).join(','), () => {
      if (!party.length) { this.party.style.display = 'none'; return; }
      this.party.style.display = 'flex';
      this.party.innerHTML = `<span>With you:</span>` + party.map((p) => `${img('pet:' + p.species)}<span>${p.name}</span>`).join('');
    });
  }

  prompt(text) {
    this.set('prompt', text || '', (v) => {
      this.promptEl.style.display = v ? 'block' : 'none';
      this.promptEl.innerHTML = v;
    });
  }

  compassTo(screen) {
    // screen: null | {x, y, angle} in CSS px
    if (!screen) { this.compass.style.display = 'none'; return; }
    this.compass.style.display = 'block';
    this.compass.style.left = screen.x - 22 + 'px';
    this.compass.style.top = screen.y - 22 + 'px';
    this.compass.style.transform = `rotate(${screen.angle}rad)`;
  }

  toast(text, icon = null, opts = {}) {
    const t = el('div', 'panel toast' + (opts.gold ? ' gold' : ''), `${icon ? img(icon) : ''}<span>${text}</span>`);
    const life = opts.life || 2.6;
    t.style.setProperty('--life', life + 's');
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
    setTimeout(() => t.remove(), (life + 0.5) * 1000);
  }

  // ----------------------------------------------------------------- dialog
  buildDialog() {
    this.dialogEl = el('div', '', `<div class="panel box"><div class="portrait"><img class="px"></div><div style="flex:1;min-width:0"><div class="name"></div><div class="text"></div><div class="choices"></div></div><div class="more">▼</div></div>`);
    this.dialogEl.id = 'dialog';
    this.root.appendChild(this.dialogEl);
    this.dialogEl.addEventListener('click', () => this.advance());
  }
  // speaker: {name, role, portrait} ; returns promise
  say(speaker, text, choices = null) {
    return new Promise((resolve) => {
      this.dialogOpen = true;
      const d = this.dialogEl;
      d.style.display = 'block';
      const p = d.querySelector('.portrait');
      if (speaker && speaker.portrait) { p.style.display = ''; p.querySelector('img').src = portraitURL(speaker.portrait); }
      else p.style.display = 'none';
      d.querySelector('.name').innerHTML = speaker ? `${speaker.name}${speaker.role ? `<small>${speaker.role}</small>` : ''}` : '';
      const textEl = d.querySelector('.text');
      const choicesEl = d.querySelector('.choices');
      const more = d.querySelector('.more');
      choicesEl.innerHTML = '';
      more.style.display = 'none';
      textEl.textContent = '';
      let i = 0;
      const full = text;
      this.typing = true;
      this.choiceSel = 0;
      const showChoices = () => {
        if (!choices) { more.style.display = 'block'; return; }
        choices.forEach((c, k) => {
          const b = el('button', 'btn small' + (k === 0 ? ' sel' : ''), c);
          b.addEventListener('click', (e) => { e.stopPropagation(); finish(k); });
          choicesEl.appendChild(b);
        });
      };
      const finish = (val) => {
        clearInterval(this._typer);
        this.dialogOpen = false;
        this.typing = false;
        this._advance = null;
        this._choose = null;
        d.style.display = 'none';
        resolve(val);
      };
      this._typer = setInterval(() => {
        i += 2;
        textEl.textContent = full.slice(0, i);
        if (i % 6 === 0) this.game.audio?.blip(speaker?.voice || 0);
        if (i >= full.length) { clearInterval(this._typer); this.typing = false; showChoices(); }
      }, 28);
      this._advance = () => {
        if (this.typing) { clearInterval(this._typer); textEl.textContent = full; this.typing = false; showChoices(); return; }
        if (!choices) finish(0);
      };
      this._choose = (dir, confirm) => {
        if (!choices || this.typing) return;
        const btns = [...choicesEl.children];
        if (confirm) { finish(this.choiceSel); return; }
        this.choiceSel = (this.choiceSel + dir + btns.length) % btns.length;
        btns.forEach((b, k) => b.classList.toggle('sel', k === this.choiceSel));
      };
    });
  }
  advance() { if (this._advance) this._advance(); }

  // ----------------------------------------------------------------- modal
  buildModal() {
    this.modalBack = el('div', '', '');
    this.modalBack.id = 'modal-back';
    this.root.appendChild(this.modalBack);
    this.modalBack.addEventListener('pointerdown', (e) => { if (e.target === this.modalBack) this.closeModal(); });
  }
  openModal({ title, sub = '', body, onClose, width }) {
    this.closeModal(true);
    const m = el('div', 'panel modal', `<div class="head"><h2>${title}</h2><span class="sub">${sub}</span><button class="btn small x">✕ <kbd>Esc</kbd></button></div>`);
    if (width) m.style.width = `min(${width}px, calc(100% - 20px))`;
    const b = el('div', 'body');
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    m.appendChild(b);
    m.querySelector('.x').addEventListener('click', () => this.closeModal());
    this.modalBack.innerHTML = '';
    this.modalBack.appendChild(m);
    this.modalBack.classList.add('show');
    this.modal = { el: m, body: b, onClose };
    this.game.audio?.sfx('open');
    return this.modal;
  }
  closeModal(silent = false) {
    if (!this.modal) return;
    const m = this.modal;
    this.modal = null;
    this.modalBack.classList.remove('show');
    this.modalBack.innerHTML = '';
    if (!silent) this.game.audio?.sfx('close');
    m.onClose?.();
  }
  get busy() { return this.dialogOpen || !!this.modal || !!this.overlay; }

  handleKeys(input) {
    if (this.dialogOpen) {
      if (input.pressed('interact')) { input.consume('interact'); if (this._choose && !this.typing && this.dialogEl.querySelector('.choices').children.length) this._choose(0, true); else this.advance(); }
      if (input.pressed('left') || input.pressed('up')) this._choose?.(-1);
      if (input.pressed('right') || input.pressed('down')) this._choose?.(1);
      return true;
    }
    if (this.modal) {
      if (input.pressed('pause') || input.pressed('bag') && this.modal.kind === 'bag' || input.pressed('journal') && this.modal.kind === 'journal' || input.pressed('map') && this.modal.kind === 'map') {
        input.consume('pause'); input.consume('bag'); input.consume('journal'); input.consume('map');
        this.closeModal();
      }
      return true;
    }
    return !!this.overlay;
  }

  // ----------------------------------------------------------------- touch
  buildTouch() {
    const t = el('div', '', `<div id="joy"><i></i></div><div id="tbtns"><button class="btn navy" data-a="fly">Fly</button><button class="btn primary" data-a="interact">Act</button><button class="btn" data-a="bag">Bag</button><button class="btn" data-a="pause">Menu</button></div>`);
    t.id = 'touch';
    this.root.appendChild(t);
    this.touchEl = t;
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) t.classList.add('on');
    const joy = t.querySelector('#joy'), knob = joy.querySelector('i');
    let id = null, cx = 0, cy = 0;
    const input = this.game.input;
    joy.addEventListener('pointerdown', (e) => {
      id = e.pointerId; joy.setPointerCapture(id);
      const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = (e.clientX - cx) / 50, dy = (e.clientY - cy) / 50;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      input.touch = { x: Math.abs(dx) > 0.15 ? dx : 0, y: Math.abs(dy) > 0.15 ? dy : 0, active: true };
      knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
    };
    joy.addEventListener('pointermove', move);
    const end = (e) => { if (e.pointerId !== id) return; id = null; input.touch = { x: 0, y: 0, active: false }; knob.style.transform = ''; };
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
    t.querySelectorAll('[data-a]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const a = b.dataset.a;
        if (a === 'bag') this.game.openBag();
        else if (a === 'pause') this.game.openPause();
        else if (this.dialogOpen && a === 'interact') this.advance();
        else input.tapVirtual(a);
      });
    });
  }
  showTouch(v) { this.touchEl.style.visibility = v ? 'visible' : 'hidden'; }
}
