// Keyboard + mouse input. Held keys steer and drive; one-shot presses are
// queued as edge flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.
export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouseX = 0;
  let mouseDown = false;

  const CODE = {
    fwd: new Set(['KeyW', 'ArrowUp']),
    back: new Set(['KeyS', 'ArrowDown']),
    left: new Set(['KeyA', 'ArrowLeft']),
    right: new Set(['KeyD', 'ArrowRight']),
    handbrake: new Set(['Space']),
    sprint: new Set(['ShiftLeft', 'ShiftRight']),
  };
  const EDGE = {
    enter: new Set(['KeyE']),
    shoot: new Set([]), // mouse click
    weaponWheel: new Set(['KeyQ']),
    radio: new Set(['KeyR']),
    garage: new Set(['KeyG']),
    business: new Set(['KeyB']),
    jobs: new Set(['KeyJ']),
    gps: new Set(['KeyL']),
    save: new Set(['KeyK']),
    map: new Set(['KeyM']),
    pause: new Set(['KeyP', 'Escape']),
    confirm: new Set(['Enter']),
  };

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    for (const [name, set] of Object.entries(EDGE)) {
      if (set.has(event.code)) pressed.add(name);
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseX = event.clientX;
    pressed.add('shoot');
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('pointermove', (event) => { mouseX = event.clientX; });

  function has(set) {
    for (const c of set) if (held.has(c)) return true;
    return false;
  }

  return {
    read() {
      const out = {
        fwd: has(CODE.fwd), back: has(CODE.back), left: has(CODE.left),
        right: has(CODE.right), handbrake: has(CODE.handbrake), sprint: has(CODE.sprint),
        enter: false, shoot: false, weaponWheel: false, radio: false,
        garage: false, business: false, jobs: false, gps: false,
        save: false, map: false, pause: false, confirm: false,
        mouseDown, mouseX,
      };
      for (const name of pressed) out[name] = true;
      pressed.clear();
      return out;
    },
  };
}
