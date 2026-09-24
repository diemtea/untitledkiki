import './ui/ui.css';
import { Game } from './game/game.js';

// Boot. When hosted somewhere that hot-swaps new versions of the page, save first so the
// player can pick up exactly where they left off with "Continue".
let game = null;
const start = () => {
  if (game) return;
  game = new Game(document.getElementById('game'), document.getElementById('ui'));
  window.__game = game;
  game.boot();
};
const hot = window.claude && window.claude.hot;
try {
  if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => { try { game && game.save(); } catch (e) { /* ignore */ } return {}; });
} catch (e) { /* optional host feature */ }
if (hot && typeof hot.ready === 'function') hot.ready(start);
else start();
