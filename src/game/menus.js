// All modal panels: bag, journal, map, shops, crafting, sorting, mail, ledger, care, settings.
import { ITEMS, BINS, RECIPES, CRAFTS, UPGRADES, RENOVATIONS, SPECIES, NPCS, SHOPS, GOALS, BUNDLE_LOOT } from './data.js';
import { img, iconURL, portraitURL } from '../ui/ui.js';
import { satchelCap, basketCap, storeCount, storeAdd, storeTake, addToSatchel, canFit, removeFromSatchel, countSatchel, hasSave } from './state.js';
import { actPet, actFeed, actToy, actDecorate, wishText, guestMood } from './guests.js';
import { freeRooms } from './jobs.js';
import { speaker } from './townfolk.js';
import { fmtTime, pick, shuffle } from '../core/util.js';
import { makeCanvas, ctx2d } from '../gfx/pixel.js';

const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const needsHTML = (needs, have) => Object.entries(needs).map(([id, n]) => `<span class="need ${have(id) < n ? 'miss' : ''}">${img(id)}${have(id)}/${n}</span>`).join('');
const bar = (v) => `<div class="bar ${v < 30 ? 'low' : v < 60 ? 'mid' : ''}"><i style="width:${Math.round(v)}%"></i></div>`;
const starStr = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export class Menus {
  constructor(game) {
    this.game = game;
  }
  get s() { return this.game.state; }
  get ui() { return this.game.ui; }

  // ------------------------------------------------------------------ bag & storage
  bag(tab = 'satchel') {
    const g = this.game;
    const body = h('div');
    const tabs = h('div', 'tabs');
    const grid = h('div', 'grid');
    const info = h('div', 'info');
    body.append(tabs, grid, info);
    const inHotel = g.stage === g.hotel;
    const TABS = [['satchel', 'Satchel'], ['pantry', 'Pantry'], ['workshop', 'Workshop'], ['curios', 'Curios']];
    const render = () => {
      tabs.innerHTML = '';
      for (const [k, label] of TABS) {
        const b = h('button', 'btn small' + (k === tab ? ' on' : ''), label);
        b.onclick = () => { tab = k; render(); };
        tabs.appendChild(b);
      }
      grid.innerHTML = '';
      info.innerHTML = `<span class="muted">${tab === 'satchel' ? `Your satchel holds ${satchelCap(this.s)} stacks. Sort it at the hotel’s sorting table.` : `Stored at the hotel. ${inHotel ? 'Click an item to take it with you.' : 'You can take items out while at the hotel.'}`}</span>`;
      let list;
      if (tab === 'satchel') list = this.s.satchel.map((x, i) => ({ id: x.id, n: x.n, i, x }));
      else list = Object.entries(this.s.storage[tab]).map(([id, n]) => ({ id, n }));
      if (!list.length) grid.innerHTML = `<div class="muted" style="grid-column:1/-1;padding:18px;text-align:center">Nothing here yet.</div>`;
      for (const it of list) {
        const c = h('div', 'cell', `${img(it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}`);
        c.onclick = () => {
          grid.querySelectorAll('.cell').forEach((e) => e.classList.remove('sel'));
          c.classList.add('sel');
          const I = ITEMS[it.id];
          let extra = '';
          if (it.x && it.x.jobId) { const j = this.s.jobs.find((jj) => jj.id === it.x.jobId); if (j) extra = `<br><span class="muted">Deliver to ${j.to.label}. Reward ${j.reward} coins.</span>`; }
          info.innerHTML = `${img(it.id)}<div><b>${I.name}</b> <span class="muted">(${I.cat})</span><br>${I.desc}${extra}</div>`;
          const acts = h('div', '', '');
          acts.style.cssText = 'margin-left:auto;display:flex;gap:6px;flex-direction:column';
          if (tab === 'satchel' && I.cat !== 'parcel' && I.cat !== 'special') {
            const d = h('button', 'btn small', 'Drop one');
            d.onclick = () => { removeFromSatchel(this.s, it.id, 1); g.audio.sfx('drop'); render(); };
            acts.appendChild(d);
          }
          if (tab !== 'satchel' && inHotel) {
            const t = h('button', 'btn small', 'Take one');
            t.onclick = () => {
              if (!canFit(this.s, it.id)) { g.ui.toast('Your satchel is full!', 'icon:bag'); g.audio.sfx('error'); return; }
              storeTake(this.s, it.id, 1); addToSatchel(this.s, it.id, 1); g.audio.sfx('click'); render();
            };
            acts.appendChild(t);
          }
          info.appendChild(acts);
        };
        grid.appendChild(c);
      }
    };
    render();
    const m = this.ui.openModal({ title: 'Bag', sub: `${this.s.coins} coins`, body });
    m.kind = 'bag';
  }

  // ------------------------------------------------------------------ journal
  journal(tab = 'guests') {
    const body = h('div');
    const tabs = h('div', 'tabs');
    const content = h('div');
    body.append(tabs, content);
    const TABS = [['guests', 'Guests'], ['jobs', 'Deliveries'], ['goals', 'Goals'], ['recipes', 'Recipes'], ['notes', 'Pet notes']];
    const render = () => {
      tabs.innerHTML = '';
      for (const [k, label] of TABS) {
        const b = h('button', 'btn small' + (k === tab ? ' on' : ''), label);
        b.onclick = () => { tab = k; render(); };
        tabs.appendChild(b);
      }
      content.innerHTML = '';
      if (tab === 'guests') content.appendChild(this.guestList());
      if (tab === 'jobs') {
        const jobs = this.s.jobs.filter((j) => j.status === 'carrying');
        content.innerHTML = jobs.length ? '' : `<p class="muted">No parcels right now. Visit Aldo at the Post Office or Mrs. Honeycutt at the bakery.</p>`;
        for (const j of jobs) content.appendChild(h('div', 'row', `${img('parcel', 'px ic')}<div class="grow"><div class="title">${j.kind === 'bread' ? 'Bread' : 'Parcel'} for ${j.to.name}</div><div class="desc">${j.to.label} · deliver by ${fmtTime(j.due)} for a bonus</div></div><div>${img('icon:coin', 'px')} ${j.reward}</div>`));
      }
      if (tab === 'goals') {
        for (const gl of GOALS) {
          const done = this.s.goals[gl.id];
          content.appendChild(h('div', 'row', `<span style="font-size:22px;width:28px;text-align:center">${done ? '✔' : '○'}</span><div class="grow"><div class="title" style="${done ? 'opacity:.55;text-decoration:line-through' : ''}">${gl.text}</div></div><div>${img('icon:coin', 'px')} ${gl.reward}</div>`));
        }
      }
      if (tab === 'recipes') {
        content.appendChild(h('p', 'muted', 'Brew treats at the cauldron in the kitchen. Townsfolk will teach you new recipes as you get to know them.'));
        for (const r of RECIPES) {
          const known = this.s.recipes.includes(r.id);
          const I = ITEMS[r.id];
          const fans = Object.entries(SPECIES).filter(([, sp]) => sp.treats.includes(r.id)).map(([k]) => img('pet:' + k)).join('');
          content.appendChild(h('div', 'row', `${img(r.id, 'px ic')}<div class="grow"><div class="title">${known ? I.name : '???'}</div><div class="desc">${known ? I.desc : `Ask ${NPCS[r.teacher]?.name || 'around town'}…`}</div><div class="needs">${known ? needsHTML(r.needs, (id) => storeCount(this.s, id)) : ''}</div></div><div class="needs">${known ? fans : ''}</div>`));
        }
      }
      if (tab === 'notes') {
        content.appendChild(h('p', 'muted', 'What your guests love. Hosting a species fills in its page.'));
        for (const [k, sp] of Object.entries(SPECIES)) {
          const met = this.s.flags['met_' + k];
          if (!met && sp.rep > this.s.rep) continue;
          const likes = met ? [...sp.foods, ...sp.treats, ...sp.toys, ...sp.decor].map((id) => img(id)).join('') : '<span class="muted">Host one to learn more.</span>';
          content.appendChild(h('div', 'row', `${img('pet:' + k, 'px ic')}<div class="grow"><div class="title">${sp.name}</div><div class="needs">${likes}</div></div><div class="desc">${sp.rate} coins/night</div>`));
        }
      }
    };
    render();
    const m = this.ui.openModal({ title: 'Journal', sub: `Day ${this.s.day}`, body });
    m.kind = 'journal';
  }

  guestList() {
    const wrap = h('div');
    const gs = this.s.guests.filter((g) => !['done', 'cancelled'].includes(g.status));
    if (!gs.length) wrap.innerHTML = '<p class="muted">No guests right now. Check the mailbox by the front door for booking letters.</p>';
    for (const g of gs) {
      const st = {
        booked: `Waiting with ${g.owner.name} at ${g.owner.label}. Pick up by ${fmtTime(g.pickupBy)}.`,
        party: g.goingHome ? `With you — take ${g.name} home to ${g.owner.label}.` : 'Out for a walk with you.',
        'in-room': `In room ${g.room + 1}. ${g.checkout <= this.s.day ? '<b style="color:#dd3b3f">Goes home today!</b>' : `Checks out on day ${g.checkout}.`}`,
      }[g.status] || g.status;
      const wish = g.wish ? `<span class="need">${img(g.wish.kind === 'walk' ? 'icon:paw' : g.wish.id)}${g.wishDone ? '✔ ' : ''}Wishes for ${wishText(g.wish)}</span>` : '';
      wrap.appendChild(h('div', 'row', `${img('pet:' + g.species, 'px ic')}<div class="grow"><div class="title">${g.name} <span class="desc">the ${SPECIES[g.species].name} · ${g.nights} night${g.nights > 1 ? 's' : ''} · ${g.rate}c/night</span></div><div class="desc">${st}</div><div class="needs">${wish}</div></div>
        <div><div class="meter">${img('icon:bowl')} ${bar(g.hunger)}</div><div class="meter">${img('icon:heart')} ${bar(g.joy)}</div></div>`));
    }
    return wrap;
  }

  // ------------------------------------------------------------------ map
  map() {
    const g = this.game;
    const I = g.world.I;
    const S = 6;
    const c = makeCanvas(I.W * S, I.H * S);
    const x = ctx2d(c);
    const cols = ['#2f78a8', '#ecd9a6', '#d8c08a', '#79ad45', '#8cc050', '#8bbb4e', '#4f7f34', '#b8ab94', '#d6cab2', '#c29a64', '#a8703f', '#8a5e3a', '#a39a8c', '#d97a8a'];
    for (let z = 0; z < I.H; z++) for (let xx = 0; xx < I.W; xx++) {
      const i = z * I.W + xx;
      x.fillStyle = cols[I.type[i]];
      x.fillRect(xx * S, z * S, S, S);
      const hh = I.height[i];
      if (hh > 0) { x.fillStyle = `rgba(255,255,255,${hh * 0.035})`; x.fillRect(xx * S, z * S, S, S); }
      if (I.type[i] === 0) { x.fillStyle = `rgba(20,40,90,${Math.min(0.35, I.coast[i] * 0)})`; }
    }
    // water depth shading
    for (const t of I.trees) { x.fillStyle = '#2f5a2a'; x.fillRect(t.x * S - 2, t.z * S - 2, 4, 4); }
    for (const b of I.buildings) {
      x.fillStyle = '#c9563f'; x.fillRect(b.x * S, b.z * S, b.w * S, b.d * S);
      x.fillStyle = '#8e3a2d'; x.fillRect(b.x * S, b.z * S + b.d * S - 2, b.w * S, 2);
    }
    const marks = g.mapMarkers();
    const body = h('div');
    const wrap = h('div', 'mapwrap');
    wrap.appendChild(c);
    body.appendChild(wrap);
    const drawIcon = (id, px, pz, size = 22) => {
      const im = new Image();
      im.src = iconURL(id);
      im.onload = () => x.drawImage(im, px * S - size / 2, pz * S - size / 2 - 4, size, size);
    };
    for (const m of marks) drawIcon(m.icon, m.x, m.z, m.size || 22);
    const legend = h('div', 'legend', `<span>${img('icon:pin')} You</span><span>${img('icon:paw')} Pet pickup / return</span><span>${img('parcel')} Delivery</span><span>${img('icon:exclaim')} Shops & townsfolk</span><span>${img('icon:star')} Falling star</span>`);
    body.appendChild(legend);
    const labels = [['Whispering Woods', 18, 22], ['Meadow & Farm', 75, 20], ['Maravik', 50, 52], ['Lighthouse', 89, 66], ['Cove', 9, 46], ['Broom & Board', 50, 16], ['Ridge', 50, 5]];
    x.font = 'bold 13px "Pixelify Sans", sans-serif';
    x.textAlign = 'center';
    for (const [t, lx, lz] of labels) { x.fillStyle = 'rgba(42,29,46,0.8)'; x.fillText(t, lx * S + 1, lz * S + 1); x.fillStyle = '#fff6e4'; x.fillText(t, lx * S, lz * S); }
    const m = this.ui.openModal({ title: 'Map of Maravik', sub: 'Press M to close', body, width: 820 });
    m.kind = 'map';
  }

  // ------------------------------------------------------------------ shops
  shop(npcId) {
    const g = this.game;
    const shop = SHOPS[npcId];
    const body = h('div');
    const render = () => {
      body.innerHTML = '';
      const cols = h('div', '', '');
      cols.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px';
      const buy = h('div', '', `<h3 style="margin:0 0 6px;color:#2e3a6b">Buy</h3>`);
      for (const id of shop.sells) {
        const price = Math.max(1, Math.round(ITEMS[id].value * shop.markup));
        const r = h('div', 'row', `${img(id, 'px ic')}<div class="grow"><div class="title">${ITEMS[id].name}</div><div class="desc">${ITEMS[id].desc}</div></div>`);
        const b = h('button', 'btn small', `${img('icon:coin')} ${price}`);
        b.style.whiteSpace = 'nowrap';
        b.disabled = this.s.coins < price;
        b.onclick = () => {
          if (!canFit(this.s, id)) { g.ui.toast('Your satchel is full!', 'icon:bag'); g.audio.sfx('error'); return; }
          this.s.coins -= price; addToSatchel(this.s, id, 1); g.audio.sfx('coin'); render();
        };
        r.appendChild(b);
        buy.appendChild(r);
      }
      const sell = h('div', '', `<h3 style="margin:0 0 6px;color:#2e3a6b">Sell</h3>`);
      const sellable = this.s.satchel.filter((x) => {
        const I = ITEMS[x.id];
        return shop.buys.includes(I.cat) || shop.buys.includes(x.id);
      });
      if (!sellable.length) sell.appendChild(h('p', 'muted', npcId === 'odette' ? 'Bring curios and materials in your satchel. (Take them from the hotel cabinets first.)' : 'Nothing in your satchel I can buy.'));
      const seen = new Set();
      for (const x of sellable) {
        if (seen.has(x.id)) continue;
        seen.add(x.id);
        const I = ITEMS[x.id];
        const price = Math.max(1, Math.round(I.value * (I.cat === 'curio' ? 1 : 0.6)));
        const n = countSatchel(this.s, x.id);
        const r = h('div', 'row', `${img(x.id, 'px ic')}<div class="grow"><div class="title">${I.name} ×${n}</div></div>`);
        const b = h('button', 'btn small primary', `Sell ${img('icon:coin')} ${price}`);
        b.style.whiteSpace = 'nowrap';
        b.onclick = () => { removeFromSatchel(this.s, x.id, 1); g.addCoins(price, null); g.audio.sfx('coin'); render(); };
        r.appendChild(b);
        sell.appendChild(r);
      }
      cols.append(buy, sell);
      body.appendChild(cols);
      g.ui.modal && (g.ui.modal.el.querySelector('.sub').textContent = `You have ${this.s.coins} coins`);
    };
    const sp = speaker(npcId);
    this.ui.openModal({ title: sp.name + '’s ' + (npcId === 'odette' ? 'Curios' : 'Goods'), sub: `You have ${this.s.coins} coins`, body });
    render();
  }

  jobBoard(npcId) {
    const g = this.game;
    const offers = g.jobOffers(npcId);
    const body = h('div');
    const render = () => {
      body.innerHTML = '';
      const list = offers.filter((j) => j.status === 'offered');
      if (!list.length) body.innerHTML = `<p class="muted">${npcId === 'aldo' ? 'All parcels are out for today. Come back tomorrow!' : 'That’s all the bread for today, dear.'}</p>`;
      for (const j of list) {
        const r = h('div', 'row', `${img(j.kind === 'bread' ? 'bread' : 'parcel', 'px ic')}<div class="grow"><div class="title">${j.kind === 'bread' ? 'Bread basket' : 'Parcel'} for ${j.to.name}</div><div class="desc">${j.to.label} · by ${fmtTime(j.due)}</div></div><div style="white-space:nowrap">${img('icon:coin')} ${j.reward}</div>`);
        const b = h('button', 'btn small primary', 'Take it');
        b.onclick = () => {
          if (!canFit(this.s, 'parcel')) { g.ui.toast('No room in your satchel!', 'icon:bag'); g.audio.sfx('error'); return; }
          j.status = 'carrying';
          this.s.jobs.push(j);
          addToSatchel(this.s, 'parcel', 1, { jobId: j.id });
          g.audio.sfx('paper');
          g.ui.toast(`Deliver to ${j.to.label}`, 'parcel');
          g.markDirty();
          render();
        };
        r.appendChild(b);
        body.appendChild(r);
      }
      body.appendChild(h('p', 'muted', 'Tip: while flying, hover over the house and press E to drop the parcel from the sky!'));
    };
    render();
    this.ui.openModal({ title: npcId === 'aldo' ? 'Post Office' : 'Bakery Deliveries', sub: 'Parcels take a satchel slot each', body });
  }

  upgrades() {
    const g = this.game;
    const body = h('div');
    const render = () => {
      body.innerHTML = '<p class="muted" style="margin-top:0">Fen uses materials from your satchel or the hotel workshop.</p>';
      for (const u of UPGRADES) {
        const lvl = this.s.upgrades[u.kind];
        const owned = lvl >= u.level;
        const locked = !owned && lvl < u.level - 1;
        const r = h('div', 'row', `${img(u.kind === 'satchel' ? 'gear_satchel' : u.kind === 'basket' ? 'gear_basket' : 'gear_bristles', 'px ic')}<div class="grow"><div class="title">${u.name}${owned ? ' ✔' : ''}</div><div class="desc">${u.desc}</div><div class="needs">${owned || locked ? '' : `<span class="need ${this.s.coins < u.coins ? 'miss' : ''}">${img('icon:coin')}${u.coins}</span>` + needsHTML(u.needs, (id) => g.haveAnywhere(id))}</div></div>`);
        if (!owned && !locked) {
          const b = h('button', 'btn small primary', 'Build');
          b.disabled = this.s.coins < u.coins || !g.hasAnywhere(u.needs);
          b.onclick = () => {
            if (!g.takeAnywhere(u.needs)) return;
            this.s.coins -= u.coins;
            this.s.upgrades[u.kind] = u.level;
            g.audio.sfx('craft');
            g.ui.toast(`${u.name} ready!`, 'icon:sparkle', { gold: true });
            g.completeGoal('upgrade');
            g.applyUpgrades();
            render();
          };
          r.appendChild(b);
        } else if (locked) r.appendChild(h('span', 'muted', 'Needs previous'));
        body.appendChild(r);
      }
    };
    render();
    this.ui.openModal({ title: 'Fen’s Flight Works', sub: `You have ${this.s.coins} coins`, body });
  }

  // ------------------------------------------------------------------ hotel stations
  brew() {
    const g = this.game;
    const body = h('div');
    const render = () => {
      body.innerHTML = '<p class="muted" style="margin-top:0">Ingredients come from your pantry. Sort your satchel first!</p>';
      for (const r of RECIPES) {
        const known = this.s.recipes.includes(r.id);
        if (!known) { body.appendChild(h('div', 'row', `${img('icon:sparkle', 'px ic')}<div class="grow"><div class="title">???</div><div class="desc">A recipe ${NPCS[r.teacher]?.name || 'someone'} knows…</div></div>`)); continue; }
        const I = ITEMS[r.id];
        const fans = Object.entries(SPECIES).filter(([, sp]) => sp.treats.includes(r.id)).map(([k]) => img('pet:' + k)).join('');
        const row = h('div', 'row', `${img(r.id, 'px ic')}<div class="grow"><div class="title">${I.name} <span class="desc">(have ${storeCount(this.s, r.id)})</span></div><div class="needs">${needsHTML(r.needs, (id) => storeCount(this.s, id))}</div></div><div class="needs" title="Loved by">${fans}</div>`);
        const b = h('button', 'btn small primary', 'Brew');
        const can = Object.entries(r.needs).every(([id, n]) => storeCount(this.s, id) >= n);
        b.disabled = !can;
        b.onclick = () => {
          for (const [id, n] of Object.entries(r.needs)) storeTake(this.s, id, n);
          storeAdd(this.s, r.id, 1);
          this.s.stats.brewed++;
          g.completeGoal('firstBrew');
          g.audio.sfx('brew');
          g.brewFx();
          g.ui.toast(`Brewed ${I.name}!`, r.id, { gold: true });
          render();
        };
        row.appendChild(b);
        body.appendChild(row);
      }
    };
    render();
    this.ui.openModal({ title: 'Bubbling Cauldron', sub: 'Brew treats your guests adore', body });
  }

  craft() {
    const g = this.game;
    const body = h('div');
    const render = () => {
      body.innerHTML = '<p class="muted" style="margin-top:0">Toys are given to a guest for their stay. Decor stays in a room forever. Uses your workshop materials.</p>';
      for (const c of CRAFTS) {
        const I = ITEMS[c.id];
        const fans = Object.entries(SPECIES).filter(([, sp]) => sp.toys.includes(c.id) || sp.decor.includes(c.id)).map(([k]) => img('pet:' + k)).join('');
        const row = h('div', 'row', `${img(c.id, 'px ic')}<div class="grow"><div class="title">${I.name} <span class="desc">${I.cat} · have ${storeCount(this.s, c.id)}</span></div><div class="desc">${I.desc}</div><div class="needs">${needsHTML(c.needs, (id) => storeCount(this.s, id))}</div></div><div class="needs">${fans}</div>`);
        const b = h('button', 'btn small primary', 'Craft');
        b.disabled = !Object.entries(c.needs).every(([id, n]) => storeCount(this.s, id) >= n);
        b.onclick = () => {
          for (const [id, n] of Object.entries(c.needs)) storeTake(this.s, id, n);
          storeAdd(this.s, c.id, 1);
          this.s.stats.crafted++;
          g.completeGoal('firstCraft');
          g.audio.sfx('craft');
          g.ui.toast(`Crafted ${I.name}!`, c.id, { gold: true });
          render();
        };
        row.appendChild(b);
        body.appendChild(row);
      }
    };
    render();
    this.ui.openModal({ title: 'Workbench', sub: 'Make toys and room decor', body });
  }

  storage(bin) {
    this.bag(bin);
  }

  // The loot-sorting minigame
  sort() {
    const g = this.game;
    const s = this.s;
    const items = [];
    // everything but parcels/special goes on the table
    for (let i = s.satchel.length - 1; i >= 0; i--) {
      const x = s.satchel[i];
      const I = ITEMS[x.id];
      if (I.cat === 'parcel' || I.cat === 'special') continue;
      items.push({ id: x.id, n: x.n });
      s.satchel.splice(i, 1);
    }
    if (!items.length) {
      g.ui.toast('Nothing to sort! Go out and gather things.', 'icon:bag');
      return;
    }
    const body = h('div', 'sorter');
    const top = h('div', 'table-top');
    const hint = h('div', 'muted', 'Drag each find into the right place — or click an item, then a bin. Bundles wiggle: click them to open!');
    hint.style.fontSize = '15px';
    const bins = h('div', 'bins');
    body.append(hint, top, bins);
    const counts = { pantry: 0, workshop: 0, curios: 0 };
    const binEls = {};
    for (const [k, b] of Object.entries(BINS)) {
      const e = h('div', 'bin', `${img(b.icon)}<div class="t">${b.name}</div><div class="d">${b.desc}</div><div class="cnt">+0</div>`);
      e.dataset.bin = k;
      e.onclick = () => { if (selected) drop(selected, k); };
      binEls[k] = e;
      bins.appendChild(e);
    }
    let selected = null;
    let streak = 0, mistakes = 0, sortedCount = 0;
    const W = () => top.clientWidth || 700, H = () => top.clientHeight || 220;
    let slot = 0;
    const place = (e, random = false) => {
      const sz = e.offsetWidth || 56;
      const cols = Math.max(1, Math.floor((W() - 20) / (sz + 18)));
      const rows = Math.max(1, Math.floor((H() - 16) / (sz + 14)));
      let cx, cy;
      if (random) { cx = Math.random() * cols; cy = Math.random() * rows; }
      else { const k = slot++ % (cols * rows); cx = (k * 7) % cols; cy = Math.floor(k / cols); }
      e.style.left = Math.round(10 + cx * ((W() - 20 - sz) / Math.max(1, cols - 1 || 1)) + (Math.random() - 0.5) * 10) + 'px';
      e.style.top = Math.round(8 + cy * ((H() - 16 - sz) / Math.max(1, rows - 1 || 1)) + (Math.random() - 0.5) * 10) + 'px';
    };
    const spawn = (it, pop = false) => {
      const I = ITEMS[it.id];
      const e = h('div', 'loot' + (I.cat === 'bundle' ? ' bundle' : '') + (pop ? ' pop' : ''), `${img(it.id)}${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}`);
      e.title = I.name;
      e.item = it;
      top.appendChild(e);
      place(e, pop);
      let dragging = false, ox = 0, oy = 0, moved = false;
      e.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        dragging = true; moved = false;
        e.setPointerCapture(ev.pointerId);
        const r = e.getBoundingClientRect();
        ox = ev.clientX - r.left; oy = ev.clientY - r.top;
        e.classList.add('drag');
        e._start = { x: ev.clientX, y: ev.clientY };
      });
      e.addEventListener('pointermove', (ev) => {
        if (!dragging) return;
        if (Math.hypot(ev.clientX - e._start.x, ev.clientY - e._start.y) > 5) moved = true;
        const tr = top.getBoundingClientRect();
        e.style.left = ev.clientX - tr.left - ox + 'px';
        e.style.top = ev.clientY - tr.top - oy + 'px';
        for (const b of Object.values(binEls)) {
          const r = b.getBoundingClientRect();
          b.classList.toggle('hot', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom);
        }
      });
      e.addEventListener('pointerup', (ev) => {
        if (!dragging) return;
        dragging = false;
        e.classList.remove('drag');
        let target = null;
        for (const [k, b] of Object.entries(binEls)) {
          const r = b.getBoundingClientRect();
          if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) target = k;
          b.classList.remove('hot');
        }
        if (!moved) {
          if (I.cat === 'bundle') { openBundle(e); return; }
          top.querySelectorAll('.loot').forEach((l) => l.classList.remove('sel'));
          selected = e; e.classList.add('sel');
          g.audio.sfx('click');
          return;
        }
        if (target) drop(e, target);
        else { e.style.left = Math.min(Math.max(0, parseFloat(e.style.left)), W() - 60) + 'px'; e.style.top = Math.min(Math.max(0, parseFloat(e.style.top)), H() - 60) + 'px'; }
      });
      return e;
    };
    const openBundle = (e) => {
      const it = e.item;
      g.audio.sfx('pop');
      e.remove();
      for (let k = 0; k < it.n; k++) {
        const loot = BUNDLE_LOOT[it.id];
        const got = {};
        const picks = shuffle([...loot]).slice(0, 3);
        for (const [id, n] of picks) {
          const amt = n >= 1 ? 1 + Math.floor(Math.random() * n) : Math.random() < n ? 1 : 0;
          if (amt) got[id] = (got[id] || 0) + amt;
        }
        if (!Object.keys(got).length) got.pebble = 1;
        for (const [id, n] of Object.entries(got)) {
          spawn({ id, n }, true);
          if (!s.discovered[id]) g.ui.toast(`New find: ${ITEMS[id].name}!`, id, { gold: true });
          s.discovered[id] = true;
          if (id === 'starshard') g.completeGoal('starshard');
        }
      }
    };
    const drop = (e, bin) => {
      const it = e.item;
      const I = ITEMS[it.id];
      selected = null;
      if (I.cat === 'bundle') { openBundle(e); return; }
      const be = binEls[bin];
      if (I.bin === bin) {
        storeAdd(s, it.id, it.n);
        counts[bin] += it.n;
        be.querySelector('.cnt').textContent = `+${counts[bin]}`;
        be.classList.remove('good'); void be.offsetWidth; be.classList.add('good');
        e.remove();
        streak++; sortedCount++;
        g.audio.sfx('good');
        if (!s.discovered[it.id]) { s.discovered[it.id] = true; }
      } else {
        mistakes++; streak = 0;
        be.classList.remove('bad'); void be.offsetWidth; be.classList.add('bad');
        g.audio.sfx('bad');
        place(e, true);
        const lines = { pantry: 'That’s not food, silly!', workshop: 'Hmm, that doesn’t go with the tools.', curios: 'Not exactly a treasure…' };
        hint.innerHTML = `<b style="color:#dd3b3f">Soot:</b> ${lines[bin]} <span class="muted">(${I.name} goes in the ${BINS[I.bin].name})</span>`;
      }
      if (!top.querySelector('.loot')) finish();
    };
    const finish = () => {
      if (sortedCount) {
        s.stats.sorted += sortedCount;
        g.completeGoal('firstSort');
        const bonus = mistakes === 0 && sortedCount >= 3 ? Math.min(6, 1 + Math.floor(sortedCount / 3)) : 0;
        hint.innerHTML = `<b style="color:#2e3a6b">All sorted!</b> ${bonus ? `Tidy work — Soot found ${bonus} coins under the table.` : ''}`;
        if (bonus) g.addCoins(bonus, null);
        g.audio.sfx('sparkle');
      }
    };
    this.ui.openModal({
      title: 'Sorting Table', sub: 'Put your finds away', body, width: 780,
      onClose: () => {
        // anything left on the table goes back into the satchel
        top.querySelectorAll('.loot').forEach((e) => { if (!addToSatchel(s, e.item.id, e.item.n)) storeAdd(s, e.item.id, e.item.n); });
        g.markDirty();
      },
    });
    for (const it of items) spawn(it);
  }

  mail() {
    const g = this.game;
    const body = h('div');
    const render = () => {
      body.innerHTML = '';
      const letters = this.s.letters;
      letters.forEach((l) => (l.read = true));
      if (!letters.length) body.innerHTML = '<p class="muted">The mailbox is empty. New letters arrive every morning.</p>';
      for (const l of letters) {
        const L = h('div', 'letter');
        if (l.type === 'booking') {
          const sp = SPECIES[l.species];
          const text = l.text || `Dear Broom & Board, could you look after my ${sp.name.toLowerCase()}, ${l.petName}, for ${l.nights} night${l.nights > 1 ? 's' : ''}? I can pay ${l.rate} coins a night. I’ll wait at ${l.owner.label} until ${fmtTime(l.pickupBy)}.`;
          L.innerHTML = `<img class="px stamp" src="${iconURL('pet:' + l.species)}"><div class="from">From ${l.owner.name} · Booking request</div><div>${text}</div><div class="needs" style="margin-top:4px"><span class="need">${img('pet:' + l.species)} ${l.petName} the ${sp.name}</span><span class="need">${img('icon:coin')} ${l.rate} × ${l.nights}</span></div>`;
          const acts = h('div', 'acts');
          const free = freeRooms(this.s);
          const a = h('button', 'btn small primary', free.length ? 'Accept' : 'No free room');
          a.disabled = !free.length;
          a.onclick = () => { g.acceptBooking(l); render(); };
          const d = h('button', 'btn small', 'Decline');
          d.onclick = () => { this.s.letters = this.s.letters.filter((x) => x !== l); g.audio.sfx('paper'); render(); };
          acts.append(a, d);
          L.appendChild(acts);
        } else {
          L.innerHTML = `<div class="from">From ${l.from}</div><div>${l.text}</div>`;
          const acts = h('div', 'acts');
          const d = h('button', 'btn small', 'File away');
          d.onclick = () => { this.s.letters = this.s.letters.filter((x) => x !== l); render(); };
          acts.appendChild(d);
          L.appendChild(acts);
        }
        body.appendChild(L);
      }
      g.markDirty();
    };
    render();
    g.audio.sfx('paper');
    this.ui.openModal({ title: 'Mailbox', sub: `Day ${this.s.day}`, body });
  }

  ledger(tab = 'guests') {
    const g = this.game;
    const body = h('div');
    const tabs = h('div', 'tabs');
    const content = h('div');
    body.append(tabs, content);
    const render = () => {
      tabs.innerHTML = '';
      for (const [k, label] of [['guests', 'Guests'], ['renovate', 'Renovations'], ['reviews', 'Reviews']]) {
        const b = h('button', 'btn small' + (k === tab ? ' on' : ''), label);
        b.onclick = () => { tab = k; render(); };
        tabs.appendChild(b);
      }
      content.innerHTML = '';
      if (tab === 'guests') content.appendChild(this.guestList());
      if (tab === 'renovate') {
        content.appendChild(h('p', 'muted', 'Bruno’s crew renovates overnight. Materials come from your workshop or satchel.'));
        if (this.s.renovating != null) content.appendChild(h('p', '', `<b>Room ${this.s.renovating + 1} is being renovated tonight!</b>`));
        for (const r of RENOVATIONS) {
          const open = this.s.rooms[r.room].unlocked;
          const row = h('div', 'row', `${img('decor_cushion', 'px ic')}<div class="grow"><div class="title">Guest Room ${r.room + 1}${open ? ' ✔' : ''}</div><div class="needs">${open ? '' : `<span class="need ${this.s.rep < r.rep ? 'miss' : ''}">${img('icon:star')}${r.rep} rep</span><span class="need ${this.s.coins < r.coins ? 'miss' : ''}">${img('icon:coin')}${r.coins}</span>` + needsHTML(r.needs, (id) => g.haveAnywhere(id))}</div></div>`);
          if (!open && this.s.renovating == null) {
            const b = h('button', 'btn small primary', 'Renovate');
            b.disabled = this.s.rep < r.rep || this.s.coins < r.coins || !g.hasAnywhere(r.needs) || r.room > 0 && !this.s.rooms[r.room - 1].unlocked;
            b.onclick = () => {
              if (!g.takeAnywhere(r.needs)) return;
              this.s.coins -= r.coins;
              this.s.renovating = r.room;
              g.audio.sfx('craft');
              g.ui.toast(`Room ${r.room + 1} will be ready tomorrow!`, 'icon:sparkle', { gold: true });
              render();
            };
            row.appendChild(b);
          }
          content.appendChild(row);
        }
      }
      if (tab === 'reviews') {
        if (!this.s.reviews.length) content.appendChild(h('p', 'muted', 'No reviews yet. Take great care of your guests!'));
        for (const r of this.s.reviews.slice(-12).reverse()) {
          content.appendChild(h('div', 'review', `<div class="stars">${starStr(r.stars)}</div><div>“${r.text}”</div><div class="muted">— ${r.owner}, about ${r.pet} (day ${r.day})</div>`));
        }
      }
    };
    render();
    this.ui.openModal({ title: 'Guest Ledger', sub: `${this.s.guests.filter((x) => x.status === 'in-room').length} guests staying`, body });
  }

  // ------------------------------------------------------------------ guest care
  care(guest) {
    const g = this.game;
    const s = this.s;
    const body = h('div');
    const S = SPECIES[guest.species];
    s.flags['met_' + guest.species] = true;
    const render = (msg = '') => {
      const due = guest.checkout <= s.day;
      body.innerHTML = `<div style="display:flex;gap:14px;align-items:center">
        <div style="width:110px;height:110px;background:#f4e6c8;border:3px solid #e8d4ae;border-radius:8px;display:flex;align-items:center;justify-content:center"><img class="px" style="width:96px" src="${portraitURL('pet:' + guest.species)}"></div>
        <div class="grow" style="flex:1">
          <div class="title" style="font-size:22px;color:#2e3a6b">${guest.name} <span class="desc">the ${S.name} · Room ${guest.room + 1}</span></div>
          <div class="meter" style="font-size:15px">${img('icon:bowl')} Fed ${bar(guest.hunger)} ${img('icon:heart')} Happy ${bar(guest.joy)}</div>
          <div class="needs" style="margin-top:4px">${guest.wish ? `<span class="need">${img(guest.wish.kind === 'walk' ? 'icon:paw' : guest.wish.id)}${guest.wishDone ? '✔ Wish granted!' : 'Wishes for ' + wishText(guest.wish)}</span>` : ''}${guest.toy ? `<span class="need">${img(guest.toy)} playing with ${ITEMS[guest.toy].name}</span>` : ''}</div>
          <div class="desc" style="margin-top:4px">${due ? '<b style="color:#dd3b3f">Going home today — take them back to ' + guest.owner.name + '.</b>' : `Staying until day ${guest.checkout}.`}</div>
        </div></div><div class="info" style="min-height:28px">${msg}</div>`;
      const acts = h('div', '', '');
      acts.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px';
      const btn = (label, fn, dis = false, cls = '') => { const b = h('button', 'btn ' + cls, label); b.disabled = dis; b.onclick = fn; acts.appendChild(b); };
      btn(`${img('icon:heart')} Pet`, () => { const r = actPet(s, guest); g.audio.petVoice(guest.species); g.heartsAt(guest); render(r.msg); });
      btn(`${img('icon:bowl')} Feed`, () => this.pickItem('Feed ' + guest.name, (id) => ITEMS[id].bin === 'pantry', (id) => {
        const r = actFeed(s, guest, id);
        if (!r) return;
        g.audio.sfx('munch');
        if (r.liked) { g.audio.petVoice(guest.species); g.heartsAt(guest); }
        if (r.wish) g.wishGranted(guest);
        this.care(guest);
        this.ui.modal && (this.ui.modal.body.querySelector('.info').innerHTML = r.liked ? `${guest.name} gobbles it up — a favourite!` : `${guest.name} eats it politely.`);
      }, [...S.foods, ...S.treats]));
      btn(`${img('toy_yarn')} Give toy`, () => this.pickItem('Give ' + guest.name + ' a toy', (id) => ITEMS[id].cat === 'toy', (id) => {
        const r = actToy(s, guest, id);
        if (!r) return;
        g.audio.petVoice(guest.species); g.heartsAt(guest);
        if (r.wish) g.wishGranted(guest);
        this.care(guest);
      }, S.toys), !!guest.toy);
      if (!due) btn(`${img('icon:paw')} Go for a walk`, () => { g.takeGuest(guest, false); this.ui.closeModal(); }, g.party().length >= 3);
      if (due) btn(`${img('icon:paw')} Take home`, () => { g.takeGuest(guest, true); this.ui.closeModal(); }, g.party().length >= 3, 'primary');
      body.appendChild(acts);
    };
    render();
    this.ui.openModal({ title: 'Guest Care', sub: `${guest.owner.name}’s pet`, body, width: 640 });
  }

  pickItem(title, filter, onPick, favs = []) {
    const s = this.s;
    const body = h('div');
    const list = ['pantry', 'workshop', 'curios'].flatMap((b) => Object.entries(s.storage[b])).filter(([id, n]) => n > 0 && filter(id));
    if (!list.length) body.innerHTML = '<p class="muted">You don’t have anything suitable stored. Gather, sort, brew or craft some first!</p>';
    const grid = h('div', 'grid');
    list.sort((a, b) => (favs.includes(b[0]) ? 1 : 0) - (favs.includes(a[0]) ? 1 : 0));
    for (const [id, n] of list) {
      const c = h('div', 'cell', `${img(id)}<span class="n">${n}</span>${favs.includes(id) ? `<img class="px" style="position:absolute;left:2px;top:2px;width:18px;height:18px" src="${iconURL('icon:heart')}">` : ''}`);
      c.title = ITEMS[id].name + (favs.includes(id) ? ' (favourite!)' : '');
      c.onclick = () => onPick(id);
      grid.appendChild(c);
    }
    body.appendChild(grid);
    body.appendChild(h('p', 'muted', 'Hearts mark this guest’s favourites.'));
    this.ui.openModal({ title, body, width: 560 });
  }

  decorate(roomIdx) {
    const g = this.game;
    const room = this.s.rooms[roomIdx];
    if ((room.decor || []).length >= 3) { g.ui.toast('This room is fully decorated!', 'icon:sparkle'); return; }
    const guest = this.s.guests.find((x) => x.room === roomIdx && x.status === 'in-room');
    const favs = guest ? SPECIES[guest.species].decor : [];
    this.pickItem(`Decorate Room ${roomIdx + 1} (${(room.decor || []).length}/3)`, (id) => ITEMS[id].cat === 'decor', (id) => {
      const r = actDecorate(this.s, roomIdx, id);
      if (!r) return;
      g.audio.sfx('craft');
      g.ui.toast(`Placed ${ITEMS[id].name}`, id);
      if (r.g && r.liked) { g.audio.petVoice(r.g.species); g.heartsAt(r.g); }
      if (r.wish) g.wishGranted(r.g);
      g.markDirty();
      this.ui.closeModal();
    }, favs);
  }

  // ------------------------------------------------------------------ system
  pause() {
    const g = this.game;
    const s = this.s;
    const body = h('div');
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <h3 style="margin:0 0 6px;color:#2e3a6b">Settings</h3>
          <label style="display:block;margin:6px 0">Music <input type="range" min="0" max="1" step="0.05" value="${s.settings.music}" data-k="music" style="width:100%"></label>
          <label style="display:block;margin:6px 0">Sound <input type="range" min="0" max="1" step="0.05" value="${s.settings.sfx}" data-k="sfx" style="width:100%"></label>
          <div style="margin:8px 0">Graphics:
            <button class="btn small ${s.settings.quality === 'high' ? 'on' : ''}" data-q="high">Pretty</button>
            <button class="btn small ${s.settings.quality === 'low' ? 'on' : ''}" data-q="low">Fast</button></div>
          <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
            <button class="btn primary" data-a="resume">Resume</button>
            <button class="btn" data-a="save">Save game</button>
            <button class="btn" data-a="title">Quit to title</button>
          </div>
        </div>
        <div>
          <h3 style="margin:0 0 6px;color:#2e3a6b">Controls</h3>
          <div style="line-height:1.9;font-size:15px">
            <kbd>W A S D</kbd> / arrows — walk or fly<br>
            <kbd>Shift</kbd> — run / boost<br>
            <kbd>E</kbd> / <kbd>Space</kbd> — interact, talk, drop parcels<br>
            <kbd>F</kbd> — hop on / off your broom<br>
            <kbd>I</kbd> bag · <kbd>J</kbd> journal · <kbd>M</kbd> map<br>
            <kbd>Esc</kbd> — menu / close
          </div>
          <p class="muted" style="font-size:14px">The game saves automatically every morning.</p>
        </div>
      </div>`;
    body.querySelectorAll('input[type=range]').forEach((r) => r.addEventListener('input', () => {
      s.settings[r.dataset.k] = +r.value;
      g.audio.setVolumes(s.settings.music, s.settings.sfx);
    }));
    body.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      s.settings.quality = b.dataset.q;
      g.renderer.setQuality(b.dataset.q);
      body.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    body.querySelector('[data-a=resume]').onclick = () => this.ui.closeModal();
    body.querySelector('[data-a=save]').onclick = () => { g.save(); g.ui.toast('Game saved.', 'icon:sparkle'); };
    body.querySelector('[data-a=title]').onclick = () => { g.save(); this.ui.closeModal(true); g.toTitle(); };
    this.ui.openModal({ title: 'Paused', sub: `${s.name}’s Broom & Board`, body, width: 720 });
  }

  summary(rep, onDone) {
    const s = this.s;
    const body = h('div', 'summary');
    body.innerHTML = `<h2>Day ${rep.day} is done</h2>
      <div class="line"><span>Coins earned</span><span>${img('icon:coin')} ${rep.earned}</span></div>
      <div class="line"><span>Deliveries</span><span>${rep.deliveries}</span></div>
      <div class="line"><span>Things found</span><span>${rep.found}</span></div>
      <div class="line"><span>Reputation</span><span>${img('icon:star')} ${Math.floor(s.rep)}</span></div>
      ${rep.reviews.map((r) => `<div class="review"><div class="stars">${starStr(r.stars)}</div>“${r.text}”<div class="muted">— ${r.owner}</div></div>`).join('')}
      ${rep.notes.map((n) => `<p>${n}</p>`).join('')}
      <button class="btn primary" style="margin-top:10px;font-size:20px">Good morning! ☀</button>`;
    body.querySelector('button').onclick = () => this.ui.closeModal();
    this.ui.openModal({ title: 'Sweet dreams…', sub: '', body, width: 520, onClose: onDone });
  }
}
