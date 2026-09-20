/** Retourne l'identifiant d'un topic Onche, ou null pour une autre page. */
export function topicId(url, base = 'https://onche.org') {
  try {
    const target = new URL(url, base);
    if (!/^(?:www\.)?onche\.org$/i.test(target.hostname)) return null;
    return target.pathname.match(/^\/topic\/(\d+)(?:\/|$)/)?.[1] || null;
  } catch {
    return null;
  }
}
