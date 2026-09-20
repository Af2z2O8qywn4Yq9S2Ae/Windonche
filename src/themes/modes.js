export const MODES = Object.freeze({
  light: Object.freeze({ name: 'Clair', colors: Object.freeze({}) }),
  dark: Object.freeze({
    name: 'Sombre',
    colors: Object.freeze({
      desktop:'#1b1b1b', face:'#2b2b2b', surface:'#1e1e1e', ink:'#f2f2f2',
      muted:'#bdbdbd', link:'#8ab4ff', visited:'#d8a5ff', selected:'#005a9e',
      selectedText:'#ffffff', titleStart:'#003c74', titleEnd:'#004f87',
      light:'#555555', edge:'#3a3a3a', shadow:'#111111', dark:'#050505',
      stripe:'#252525', quote:'#303030', tip:'#3b370d', desktopText:'#f5f5f5',
    }),
  }),
  black: Object.freeze({
    name: 'Noir',
    colors: Object.freeze({
      desktop:'#000000', face:'#101010', surface:'#000000', ink:'#f5f5f5',
      muted:'#bdbdbd', link:'#79b8ff', visited:'#d7a0ff', selected:'#004f87',
      selectedText:'#ffffff', titleStart:'#000000', titleEnd:'#202020',
      light:'#3a3a3a', edge:'#1c1c1c', shadow:'#050505', dark:'#000000',
      stripe:'#080808', quote:'#151515', tip:'#292500', desktopText:'#ffffff',
    }),
  }),
});

export function applyMode(theme, mode) {
  return { ...theme, ...MODES[mode].colors };
}
