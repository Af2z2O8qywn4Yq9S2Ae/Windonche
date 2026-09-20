/** Navigation clavier d'un panneau de liens et boutons natifs (pas un menu ARIA). */
export function bindStartMenu(shadow, host) {
  const menu = shadow.querySelector('.menu');
  const start = shadow.querySelector('.start');

  function close(returnFocus = false) {
    menu.hidden = true;
    start.setAttribute('aria-expanded', 'false');
    if (returnFocus) start.focus();
  }

  start.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    start.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('a,button').focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.composedPath().includes(host)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) close(true);
  });
  menu.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...menu.querySelectorAll('a,button')];
    const current = items.indexOf(shadow.activeElement);
    let index;
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = items.length - 1;
    else index = (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    event.preventDefault();
    items[index].focus();
  });
  return { close, start };
}
