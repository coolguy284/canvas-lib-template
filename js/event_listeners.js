CANVAS.addEventListener('click', async () => {
  await CANVAS.requestPointerLock({
    unadjustedMovement: true,
  });
});

CANVAS.addEventListener('mousemove', evt => {
  if (pointerLocked) {
    console.log(evt.clientX, evt.movementX);
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement == CANVAS) {
    pointerLocked = true;
  } else {
    pointerLocked = false;
  }
});
