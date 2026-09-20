// Copies PNG versionnées dans ce dépôt et servies directement par GitHub.
// Un chemin absolu est nécessaire : le userscript s'exécute depuis onche.org.
const ICON_BASE = 'https://raw.githubusercontent.com/Af2z2O8qywn4Yq9S2Ae/Windonche/main/assets/icons/';

export function iconURL(name) {
  return `${ICON_BASE}${name}.png`;
}

/** Réservé aux noms d'icônes constants du projet, jamais à du contenu utilisateur. */
export function icon(name, size = 16) {
  return `<img class="sys-icon" src="${iconURL(name)}" width="${size}" height="${size}" alt="" aria-hidden="true" referrerpolicy="no-referrer" draggable="false">`;
}
