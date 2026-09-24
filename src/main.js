import './ui/ui.css';
import { Game } from './game/game.js';

const game = new Game(document.getElementById('game'), document.getElementById('ui'));
window.__game = game;
game.boot();
