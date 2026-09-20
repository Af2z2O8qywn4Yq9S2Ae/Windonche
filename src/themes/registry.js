const CLASSIC = Object.freeze({
  desktop:'#008080', face:'#c0c0c0', surface:'#ffffff', ink:'#000000',
  muted:'#404040', link:'#000080', visited:'#800080', selected:'#000080',
  selectedText:'#ffffff', titleStart:'#000080', titleEnd:'#005a9e',
  light:'#ffffff', edge:'#dfdfdf', shadow:'#808080', dark:'#0a0a0a',
  stripe:'#f3f3f3', quote:'#efefef', tip:'#ffffe1', desktopText:'#ffffff',
  font:'Tahoma,"MS Sans Serif",Arial,sans-serif'
});
export const THEMES = Object.freeze({
  '95': Object.freeze({...CLASSIC, name:'Windows 95', titleEnd:'#000080'}),
  '98': Object.freeze({...CLASSIC, name:'Windows 98'})
});
