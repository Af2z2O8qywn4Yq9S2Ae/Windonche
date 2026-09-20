/** Rapport de luminance relative pour deux couleurs sRGB #RRGGBB. */
export function contrast(foreground, background) {
  function luminance(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      throw new TypeError(`Couleur attendue au format #RRGGBB : ${hex}`);
    }
    const [red, green, blue] = hex.slice(1).match(/../g)
      .map(value => parseInt(value, 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return red * 0.2126 + green * 0.7152 + blue * 0.0722;
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function validateContrast(theme) {
  const pairs = [
    ['ink', 'face'], ['muted', 'face'], ['link', 'surface'],
    ['visited', 'surface'], ['selectedText', 'selected'],
    ['selectedText', 'titleStart'], ['selectedText', 'titleEnd'],
  ];
  for (const [foreground, background] of pairs) {
    if (contrast(theme[foreground], theme[background]) < 4.5) {
      throw new Error(`Contraste insuffisant : ${foreground}/${background}`);
    }
  }
}
