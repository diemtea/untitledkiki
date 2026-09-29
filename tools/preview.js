import { witchSheet, sootSheet, petCanvas, PET_SPECIES, npcCanvas, NPC_LOOKS, itemCanvas, ITEM_ART_IDS, iconCanvas, treeCanvas, randomOwnerLook } from '../src/gfx/sprites.js';
const S = 4;
const c = document.getElementById('c');
c.width = 1400; c.height = 1500;
const g = c.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#7fa860'; g.fillRect(0, 0, c.width, c.height);
let x = 10, y = 10, rowH = 0;
function put(cv, label, scale = S) {
  const w = cv.width * scale, h = cv.height * scale;
  if (x + w > c.width - 10) { x = 10; y += rowH + 18; rowH = 0; }
  g.drawImage(cv, x, y, w, h);
  if (label) { g.fillStyle = '#fff'; g.font = '10px monospace'; g.fillText(label, x, y + h + 11); }
  x += w + 10; rowH = Math.max(rowH, h);
}
function br() { x = 10; y += rowH + 22; rowH = 0; }
const w = witchSheet();
w.down.forEach((f, i) => put(f, 'down' + i));
w.up.forEach((f, i) => put(f, 'up' + i));
w.side.forEach((f, i) => put(f, 'side' + i));
put(w.cheer, 'cheer');
br();
w.fly.forEach((f, i) => put(f, 'fly' + i));
const s = sootSheet();
s.walk.forEach((f, i) => put(f, 'soot' + i));
put(s.sit, 'sit'); put(s.sleep, 'sleep');
br();
PET_SPECIES.forEach((p) => put(petCanvas(p), p));
br();
Object.entries(NPC_LOOKS).forEach(([k, l]) => put(npcCanvas(l), k));
for (let i = 0; i < 6; i++) put(npcCanvas(randomOwnerLook(i + 1)), 'own' + i);
br();
ITEM_ART_IDS.forEach((id) => put(itemCanvas(id), id.slice(0, 9), 3));
br();
['heart','coin','star','bowl','zzz','sad','exclaim','paw','sparkle','mess','pin','arrow','sun','moon','cloud','rain','bag'].forEach((id) => put(iconCanvas(id), id, 3));
br();
['oak','apple','blossom','goldtree','pine','cypress','bush','berrybush','flowerbush','sunflower','fern','glowshroom','toadstool','reeds'].forEach((k, i) => put(treeCanvas(k, i + 3), k, 3));
br();
['ancient','spirittree'].forEach((k, i) => put(treeCanvas(k, i + 9), k, 3));
document.title = 'ready';
