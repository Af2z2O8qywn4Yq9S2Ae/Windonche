// Images distantes du projet 98.js ; aucun code distant n'est exécuté.
const ICON_BASE = 'https://98.js.org/images/icons/';

export function iconURL(name) {
  return `${ICON_BASE}${name}.png`;
}

/** Réservé aux noms d'icônes constants du projet, jamais à du contenu utilisateur. */
export function icon(name, size = 16) {
  return `<img class="sys-icon" src="${iconURL(name)}" width="${size}" height="${size}" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">`;
}
