export function setupRemoteControl(onAction) {
  const keyMap = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    13: 'enter',
    8: 'back',
    27: 'back',
    32: 'pause',
    70: 'fullscreen',
    107: 'volup',
    109: 'voldown'
  };

  document.addEventListener('keydown', (event) => {
    const keyCode = event.keyCode || event.which;
    const action = keyMap[keyCode];

    if (action) {
      event.preventDefault();
      onAction(action);
    }
  });
}
