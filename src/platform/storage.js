/** Les clés historiques sont conservées pour migrer sans perdre les préférences. */
export function read(key, fallback) {
  try {
    return typeof GM_getValue === 'function' ? GM_getValue(key, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    if (typeof GM_setValue === 'function') GM_setValue(key, value);
  } catch {
    // Le thème reste utilisable pour la session si le stockage est indisponible.
  }
}
