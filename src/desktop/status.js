/** Synchronise le titre du document et l'horloge du bureau. */
export function bindStatus(shadow) {
  function updateTitle() {
    const title = document.title || 'Onche';
    shadow.querySelector('.caption').textContent = `${title} — Internet Explorer`;
    shadow.querySelector('.task-label').textContent = title;
  }
  updateTitle();
  const titleNode = document.querySelector('title');
  if (titleNode) {
    new MutationObserver(updateTitle).observe(titleNode, {
      childList: true, characterData: true, subtree: true,
    });
  }

  function tick() {
    const now = new Date();
    const clock = shadow.querySelector('time');
    clock.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    clock.dateTime = now.toISOString();
    clock.title = now.toLocaleDateString('fr-FR', { dateStyle: 'full' });
  }
  tick();
  setInterval(tick, 30000);
}
