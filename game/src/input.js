// Keyboard + mouse input for Vesper City.
// Rev2 note: shot mode is frozen, so input never moves a staged scene —
// the chase shots are framed by applyShot(), not by driving.
// Round 10: touch input added for phone play — one finger steers like
// the mouse, touch-and-hold is the accelerator.
export function createInput() {
  const keys = {};
  const input = {
    up: false, down: false, left: false, right: false,
    handbrake: false, sprint: false,
    mouseX: 0, mouseY: 0, mouseDown: false,
    pressed: new Set(),
  };
  const map = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    Space: 'handbrake', ShiftLeft: 'sprint', ShiftRight: 'sprint',
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    keys[e.code] = true;
    if (map[e.code]) input[map[e.code]] = true;
    input.pressed.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (map[e.code]) input[map[e.code]] = false;
  });
  window.addEventListener('mousemove', (e) => {
    input.mouseX = e.clientX; input.mouseY = e.clientY;
  });
  window.addEventListener('mousedown', (e) => { input.mouseDown = true; });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  // Round 10 — touch controls for phone play (the user plays on a phone):
  // one finger steers like the mouse, touch-and-hold is the accelerator.
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    input.mouseX = t.clientX; input.mouseY = t.clientY;
    input.mouseDown = true; input.up = true;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (!t) return;
    input.mouseX = t.clientX; input.mouseY = t.clientY;
  }, { passive: true });
  window.addEventListener('touchend', () => { input.mouseDown = false; input.up = false; });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(map)) input[map[k]] = false;
  });
  input.consume = (code) => {
    const had = input.pressed.has(code);
    input.pressed.delete(code);
    return had;
  };
  input.isDown = (code) => !!keys[code];
  return input;
}
