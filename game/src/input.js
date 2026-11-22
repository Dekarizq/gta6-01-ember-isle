// Keyboard and mouse input for Vesper City: Ember Isle.
// One place for every key: the world loop reads this state once per
// frame and never touches the DOM events itself. Keys are tracked by
// code (KeyW, Space, KeyE...), the mouse position and buttons are
// tracked for aiming, and "pressed" edges (a key that went down this
// frame) are cleared by the loop after it reads them.

export function createInput() {
  return {
    keys: {}, // code -> true while held
    pressed: {}, // code -> true only on the frame it went down
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    mousePressed: false,
    wheel: 0,
    anyKey: false,
  };
}

// Attach the DOM listeners. Call once, from main.js, after the page loads.
export function attachInput(input, element) {
  const target = element || window;
  window.addEventListener('keydown', (e) => {
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
    input.anyKey = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    input.keys[e.code] = false;
  });
  target.addEventListener('mousemove', (e) => {
    input.mouseX = e.clientX;
    input.mouseY = e.clientY;
  });
  target.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouseDown = true;
      input.mousePressed = true;
      input.anyKey = true;
    }
  });
  target.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  target.addEventListener('wheel', (e) => {
    input.wheel += e.deltaY;
  }, { passive: true });
  window.addEventListener('blur', () => {
    input.keys = {};
    input.mouseDown = false;
  });
}

// Clear the per-frame edges. The world loop calls this at the end of
// every frame, after it has read the pressed keys.
export function clearPressed(input) {
  input.pressed = {};
  input.mousePressed = false;
  input.wheel = 0;
}

export function keyDown(input, code) {
  return !!input.keys[code];
}

export function keyPressed(input, code) {
  return !!input.pressed[code];
}

// The driving input for this frame: throttle, brake, steer, handbrake,
// nitro — from WASD/arrows, Space and Shift. Works on foot too (the
// world loop maps it to walking).
export function driveInput(input) {
  const up = keyDown(input, 'KeyW') || keyDown(input, 'ArrowUp');
  const down = keyDown(input, 'KeyS') || keyDown(input, 'ArrowDown');
  const left = keyDown(input, 'KeyA') || keyDown(input, 'ArrowLeft');
  const right = keyDown(input, 'KeyD') || keyDown(input, 'ArrowRight');
  return {
    throttle: up ? 1 : 0,
    brake: down ? 1 : 0,
    steer: (left ? -1 : 0) + (right ? 1 : 0),
    handbrake: keyDown(input, 'Space'),
    nitro: keyDown(input, 'ShiftLeft') || keyDown(input, 'ShiftRight'),
    sprint: keyDown(input, 'ShiftLeft') || keyDown(input, 'ShiftRight'),
  };
}

// The walking input for this frame, relative to the camera angle.
export function walkInput(input, cameraAngle) {
  const d = driveInput(input);
  // Forward is the camera direction; strafe is perpendicular.
  const fwdX = Math.sin(cameraAngle);
  const fwdZ = Math.cos(cameraAngle);
  const rightX = Math.cos(cameraAngle);
  const rightZ = -Math.sin(cameraAngle);
  const mx = fwdX * (d.throttle - d.brake) + rightX * d.steer;
  const mz = fwdZ * (d.throttle - d.brake) + rightZ * d.steer;
  const len = Math.sqrt(mx * mx + mz * mz) || 1;
  return {
    x: mx / len,
    z: mz / len,
    moving: d.throttle || d.brake || d.steer,
    sprint: d.sprint,
  };
}
