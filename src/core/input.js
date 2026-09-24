// Keyboard + touch input with per-frame "pressed" edges.
const KEYMAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE', 'Space', 'Enter'],
  fly: ['KeyF'],
  bag: ['KeyI', 'Tab'],
  journal: ['KeyJ'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  cancel: ['Escape', 'Backspace'],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressedSet = new Set();
    this.enabled = true;
    this.touch = { x: 0, y: 0, active: false };
    this.virtual = new Set(); // touch buttons held
    this.virtualPressed = new Set();
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressedSet.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }
  held(action) {
    if (this.virtual.has(action)) return true;
    return KEYMAP[action].some((k) => this.down.has(k));
  }
  pressed(action) {
    if (this.virtualPressed.has(action)) return true;
    return KEYMAP[action].some((k) => this.pressedSet.has(k));
  }
  consume(action) {
    KEYMAP[action].forEach((k) => this.pressedSet.delete(k));
    this.virtualPressed.delete(action);
  }
  axis() {
    let x = 0, y = 0;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;
    if (this.held('up')) y -= 1;
    if (this.held('down')) y += 1;
    if (this.touch.active) { x = this.touch.x; y = this.touch.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  tapVirtual(action) { this.virtualPressed.add(action); }
  endFrame() {
    this.pressedSet.clear();
    this.virtualPressed.clear();
  }
}
