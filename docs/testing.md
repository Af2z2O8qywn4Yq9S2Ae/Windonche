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

Les tests utilisent une fixture locale, à 1280 et 390 pixels. Ils comparent une capture de l'original à celle du fichier généré, puis vérifient Démarrer, flèches/Début/Fin/Échap, focus, thèmes, densité, désactivation/restauration, stockage entre chargements, commande du gestionnaire, mise à jour du titre, double injection et actions natives. Les images distantes sont bloquées pour tester le repli hors ligne. Cela ne valide pas la disponibilité du fournisseur d'icônes ni le DOM réel d'Onche.

## Recette sur Onche

- Accueil, liste de sujets, sujet long, navigation et titre collant.
- Thèmes 95 et 98, mode compact, désactivation et restauration, rechargement.
- Tabulation et activation clavier ; focus visible et retour après fermeture.
- Petits écrans, zoom 200 %, impression et thèmes natifs clairs/sombres.
- Stories, spoilers, citations, réactions, menus et éléments masqués.
- Avec un compte : éditeur, aperçu, fenêtres de confirmation, profils et messages privés ; vérifier les actions d'envoi manuellement.
- Contraste réel et lecteur d'écran : les seuls tests de palette ne prouvent pas la conformité globale.

Ne pas confondre succès sur fixture et recette du forum connecté.
