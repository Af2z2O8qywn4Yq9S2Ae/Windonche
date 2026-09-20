/** Synchronise l’horloge de la barre des tâches. */
export function bindClock(shadow) {
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
