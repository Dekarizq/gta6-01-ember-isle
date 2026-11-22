// Keyboard + mouse input for Vesper City.
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
