CANVAS.addEventListener('click', async () => {
  await CANVAS.requestPointerLock({
    unadjustedMovement: true,
  });
});

CANVAS.addEventListener('mousemove', evt => {
  if (pointerLocked) {}
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement == CANVAS) {
    pointerLocked = true;
  } else {
    pointerLocked = false;
  }
});
