# Windonche

Un userscript qui transforme **Onche** en bureau Windows 95 ou Windows 98 : fenêtres de topics, barre des tâches, menu Démarrer, icônes et liste de sujets compacte.

## Installer

1. Installer Tampermonkey ou Violentmonkey dans son navigateur.
2. Ouvrir [`dist/windonche.user.js`](dist/windonche.user.js), puis **Raw** pour l'installer. On peut aussi copier ce fichier dans un nouveau script du gestionnaire.
3. Recharger Onche. Le bouton **Démarrer** permet de choisir le thème, la densité ou l'apparence d'origine.

La liste des topics et chaque sujet s'ouvrent dans des fenêtres indépendantes. Leur barre de titre permet de les déplacer ; les boutons réduisent ou ferment la fenêtre, tandis que la barre des tâches les restaure sans modifier leur ordre. Les pages 1, 2, 3… d'un même topic restent dans la même fenêtre et la page courante est mise en évidence. Le bureau conserve au maximum huit fenêtres dans l'onglet navigateur courant.

Sur mobile, une seule fenêtre est affichée à la fois et le déplacement est désactivé. Désactiver le thème restitue immédiatement la page Onche d'origine.

Installer uniquement le fichier généré dans `dist/`. Les modules de `src/` ne sont pas des userscripts autonomes. Remplacer l'ancienne installation en conservant son stockage pour retrouver ses préférences ; éviter d'activer deux copies.

## Modifier le projet

Prérequis : **Node.js 22 ou plus récent**, avec npm. La génération et les tests unitaires n'ont aucune dépendance à installer.

```sh
npm run check       # Génération, tests et vérification de syntaxe
npm run build       # Régénère le fichier installable
```

Modifier les sources, puis committer aussi `dist/windonche.user.js`. Ce fichier reste lisible et non minifié ; GitHub le replie par défaut dans les diffs pour mettre les sources en avant.

```text
src/
  main.js              Point d'entrée et garde anti-doublon
  platform/storage.js  Préférences Tampermonkey / Violentmonkey
  themes/              Palettes, contrastes et moteur CSS
  icons/               URLs des images et adaptation des icônes Onche
  styles/              CSS : disposition, sujets, messages, contrôles, widgets
  desktop/             Bureau, gestionnaire de fenêtres, commandes, clavier et horloge
scripts/build.mjs      Assemblage autonome JS + CSS
userscript.meta.txt    Métadonnées du userscript
tests/               Tests et fixtures de non-régression
dist/                Userscript prêt à installer
docs/                Architecture et guide de validation
assets/icons/        243 icônes PNG servies directement depuis ce dépôt
```

Voir [l'architecture](docs/architecture.md), [le guide de contribution](CONTRIBUTING.md) et [la validation](docs/testing.md).

## Fonctionnement et limites

- Les clés historiques `retro-enabled`, `retro-version`, `retro-compact` sont conservées.
- Sans accès au stockage, le thème reste utilisable pendant la session.
- Le bureau est isolé dans un Shadow DOM ; les styles du forum utilisent `data-onche-retro`.
- Les pages Onche sont chargées dans des iframes de même origine afin de conserver connexion, formulaires et scripts natifs. Une évolution des en-têtes de sécurité du site pourrait nécessiter une autre intégration.
- Liens, messages et gestionnaires d'événements natifs sont conservés.
- Les 243 icônes PNG sont versionnées dans [`assets/icons/`](assets/icons/) et chargées depuis la copie GitHub de ce dépôt. Aucun JavaScript distant n'est chargé. Le thème reste utilisable si les images sont indisponibles.
- Clavier : Tabulation, Entrée, Espace, flèches, Début/Fin dans Démarrer, Échap pour fermer. Le focus revient à une commande visible après activation/désactivation.
- Le contrôle de contraste porte sur les paires déclarées de la palette ; il ne constitue pas un audit complet d'accessibilité du site.

Les sélecteurs dépendent du HTML d'Onche. Une évolution du forum peut nécessiter une adaptation. Les pages privées et l'envoi de messages doivent être vérifiés avec un compte connecté.

Le script source fourni déclarait une licence MIT. Les icônes externes conservent leurs droits propres.
