import { Renderer } from '../src/gfx/renderer.js';
import { Overworld } from '../src/world/overworld.js';
import { Input } from '../src/core/input.js';
const params = new URLSearchParams(location.search);
const renderer = new Renderer(document.getElementById('game'));
const input = new Input();
const game = { renderer };
const ow = new Overworld(game);
ow.resize(window.innerWidth / window.innerHeight);
const x = +(params.get('x') || 50.5), z = +(params.get('z') || 28.5);
const hour = +(params.get('h') || 10);
ow.witch.place(x, z);
if (params.get('fly')) { ow.witch.startTakeoff(); ow.witch.pos.y = 10; ow.witch.mode = 'fly'; }
ow.setFollowers([{ key: 'a', species: 'dog' }, { key: 'b', species: 'bunny' }]);
ow.snapCamera();
const weather = { cloud: +(params.get('cloud') || 0), rain: +(params.get('rain') || 0), wind: 0.3 };
let t = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  ow.update(dt, t, hour, weather);
  ow.witch.update(dt, input, t);
  renderer.render(ow.scene, ow.camera, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__ow = ow;
document.title = 'ready';
