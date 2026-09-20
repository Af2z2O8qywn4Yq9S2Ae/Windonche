# Validation

## Tests sans dépendance

```sh
npm run check
```

Vérifie : rapports de contraste connus, palettes, préférence invalide, migration des clés historiques, stockage indisponible, mises à jour atomiques, nettoyage des couches, build reproductible, syntaxe du fichier final, extraction fidèle du CSS, isolation des modules et refus des cycles/imports externes.

## Tests navigateur

Installer ponctuellement Playwright et Chromium :

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run test:browser
```

Avec Chrome déjà installé : `BROWSER_CHANNEL=chrome npm run test:browser` (syntaxe macOS/Linux). `PLAYWRIGHT_MODULE` peut désigner une installation locale existante du paquet Playwright.

Les tests utilisent des fixtures locales de forum et de topic, à 1280 et 390 pixels. Ils vérifient le chargement en iframe, l'absence de bureau récursif, le déplacement, l'ouverture d'un topic, son agencement pleine largeur, le déplacement de sa pagination et de ses actions natives, l'ordre stable des tâches, la réduction, la restauration, la fermeture, Démarrer, le clavier, les thèmes, les modes Clair/Sombre/Noir, la densité, la désactivation et la double injection. Les images distantes sont bloquées pour tester le repli hors ligne. Cela ne valide pas la disponibilité du fournisseur d'icônes ni toutes les pages privées d'Onche.

## Recette sur Onche

- Accueil, liste de sujets, sujet long, navigation, pagination active et titre collant.
- Ouverture de plusieurs topics, ordre stable, déplacement, redimensionnement, réduction, restauration et fermeture.
- Thèmes 95 et 98, modes Clair/Sombre/Noir, mode compact, désactivation et restauration, rechargement.
- Tabulation et activation clavier ; focus visible et retour après fermeture.
- Petits écrans, zoom 200 %, impression et thèmes natifs clairs/sombres.
- Stories, spoilers, citations, réactions, menus et éléments masqués.
- Avec un compte : favori et actualisation dans la barre du topic, éditeur, aperçu, fenêtres de confirmation, profils et messages privés ; vérifier les actions d'envoi manuellement.
- Contraste réel et lecteur d'écran : les seuls tests de palette ne prouvent pas la conformité globale.

Ne pas confondre succès sur fixture et recette du forum connecté.
