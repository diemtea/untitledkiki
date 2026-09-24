// Title screen over a live flyover of Maravik at golden hour.
import { hasSave, wipeSave } from '../game/state.js';
import { img } from './ui.js';

export class Title {
  constructor(game) {
    this.game = game;
    const el = document.createElement('div');
    el.id = 'title';
    el.style.display = 'none';
    game.uiRoot.appendChild(el);
    this.el = el;
  }
  show() {
    const g = this.game;
    const saved = hasSave();
    this.el.style.display = 'flex';
    this.el.innerHTML = `
      <div class="logo"><h1>Broom <span>&amp;</span> Board</h1><p>a little witch's pet hotel by the sea</p></div>
      <div class="menu panel">
        ${saved ? '<button class="btn primary" data-a="continue">Continue</button>' : ''}
        <button class="btn ${saved ? '' : 'primary'}" data-a="new">New game</button>
        <button class="btn" data-a="how">How to play</button>
      </div>
      <div class="foot">${this.game.isTouch ? 'Stick to move · Act to interact · Fly to take off' : 'WASD / arrows to move · E to interact · F to fly'} · Best with sound on ♪</div>`;
    const start = (fn) => { g.audio.init(); g.audio.setVolumes(0.5, 0.7); fn(); };
    this.el.querySelector('[data-a=new]').onclick = () => start(() => this.newGame(saved));
    this.el.querySelector('[data-a=how]').onclick = () => start(() => this.how());
    const c = this.el.querySelector('[data-a=continue]');
    if (c) c.onclick = () => start(() => g.continueGame());
    // any click starts the music
    this.el.addEventListener('pointerdown', () => g.audio.init(), { once: true });
  }
  newGame(saved) {
    const g = this.game;
    const menu = this.el.querySelector('.menu');
    menu.innerHTML = `
      <div style="font-size:18px;color:#2e3a6b">What's your name, little witch?</div>
      <input type="text" maxlength="14" value="Wren" spellcheck="false">
      ${saved ? '<div style="font-size:14px;color:#dd3b3f">This will replace your saved game.</div>' : ''}
      <button class="btn primary" data-a="go">Open the hotel ✦</button>
      <button class="btn small" data-a="back">Back</button>`;
    const inp = menu.querySelector('input');
    inp.focus();
    inp.select();
    const go = () => { wipeSave(); g.startNew(inp.value.trim() || 'Wren'); };
    menu.querySelector('[data-a=go]').onclick = go;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); e.stopPropagation(); });
    menu.querySelector('[data-a=back]').onclick = () => this.show();
  }
  how() {
    const menu = this.el.querySelector('.menu');
    menu.style.maxWidth = '560px';
    const foot = this.el.querySelector('.foot');
    if (foot) foot.style.display = 'none';
    const fly = this.game.isTouch ? 'tap <b>Fly</b>' : 'press <kbd>F</kbd>';
    menu.innerHTML = `
      <div style="font-size:16px;line-height:1.45">
        <b style="color:#dd3b3f">Your year of witch training begins!</b> You've inherited <b>Broom &amp; Board</b>, a hotel for pets on the hill above Maravik.<br><br>
        ${img('letter', 'px hi')} <b>Morning:</b> read booking letters in the mailbox.<br>
        ${img('gear_bristles', 'px hi')} <b>Out and about:</b> ${fly} to fly. Pick up pets from their owners, deliver parcels for the post office and bakery, gather berries, shells, wool and treasures, and catch things in the sky.<br>
        ${img('icon:bag', 'px hi')} <b>Back home:</b> sort your loot at the sorting table, brew treats in the cauldron, craft toys and decor, and care for your guests. Feed them, pet them, grant their wishes and tidy their rooms.<br>
        ${img('icon:star', 'px hi')} <b>Checkout:</b> fly each pet home on their last day. Happy guests leave tips and great reviews, which bring more bookings and let you renovate new rooms.<br><br>
        Sleep before 2am. Falling stars sometimes land at night…
      </div>
      <button class="btn primary" data-a="back">Got it!</button>`;
    menu.querySelector('[data-a=back]').onclick = () => { menu.style.maxWidth = ''; this.show(); };
  }
  hide() { this.el.style.display = 'none'; }
}
