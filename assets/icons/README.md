# Bibliothèque d'icônes

Ce dossier contient 243 images PNG prêtes à être utilisées par le userscript, principalement en 16×16, 32×32 et 48×48 pixels. Elles sont servies depuis la branche `main` de ce dépôt par `raw.githubusercontent.com`.

## Provenance

Les fichiers ont été importés le 20 septembre 2026 depuis le dossier [`images/icons`](https://github.com/1j01/98/tree/5245105214cee90ab984fc15bece6c92db15ca7d/images/icons) du projet [98.js](https://github.com/1j01/98), commit `5245105214cee90ab984fc15bece6c92db15ca7d`.

Le dépôt source indique « Not yet licensed ». Certains fichiers représentent des éléments de Windows ou des logiciels tiers et peuvent rester soumis aux droits de leurs titulaires respectifs. Leur présence ici documente et remplace l'ancien chargement direct depuis `98.js.org`; elle ne change pas leurs droits.

## Utilisation

Le code centralise l'adresse dans `src/icons/assets.js`. Pour utiliser une image existante :

```js
iconURL('folder-16x16')
```

Ne concaténez jamais un nom provenant d'un utilisateur. Les noms d'icônes doivent rester des constantes du projet.
