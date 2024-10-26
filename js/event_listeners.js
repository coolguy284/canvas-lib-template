CANVAS.addEventListener('click', async () => {
  await CANVAS.requestPointerLock({
    unadjustedMovement: true,
  });
});

CANVAS.addEventListener('mousemove', evt => {
  if (pointerLocked) {}
});

CANVAS.addEventListener()

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement == CANVAS) {
    pointerLocked = true;
  } else {
    pointerLocked = false;
  }
});
