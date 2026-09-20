# Architecture

## Flux d'exécution

`main.js` empêche les doublons et l'exécution en iframe, crée `ThemeEngine`, installe les styles et les icônes, puis monte le bureau. Les interactions du bureau appellent `engine.update(patch)`. Le moteur valide les contrastes avant de changer les attributs HTML, les variables CSS et le stockage.

| Responsabilité | Fichiers à modifier |
| --- | --- |
| Couleurs, police, nouveau thème | `src/themes/registry.js` |
| Contrastes et validation | `src/themes/contrast.js` |
| État, variables CSS, activation | `src/themes/engine.js` |
| Clés de stockage et repli sans API GM | `src/platform/storage.js` |
| Fournisseur d'icônes | `src/icons/assets.js` |
| Correspondance avec les classes `.mdi` | `src/icons/site-icons.js` |
| Apparence du forum | `src/styles/*.css` |
| Corrections spécifiques au DOM Onche | `src/styles/onche-adapter.css` |
| Structure HTML du bureau | `src/desktop/template.js` |
| Apparence du bureau isolé | `src/styles/desktop.css` |
| Commandes, choix du thème, densité | `src/desktop/mount.js` |
| Ouverture, fermeture et clavier | `src/desktop/menu.js` |
| Titre et horloge | `src/desktop/status.js` |

## Contrats à préserver

Les noms des variables `--w9-*`, les attributs `data-onche-retro` et `data-onche-compact`, l'identifiant du bureau et les clés `retro-*` sont conservés pour maintenir le comportement existant. Les thèmes `95` et `98` restent disponibles ; `98` est le repli pour une préférence inconnue. Le moteur utilise `Object.hasOwn` pour refuser les propriétés héritées telles que `toString`.

Le bureau utilise des liens et boutons natifs, dans une navigation nommée. Ce n'est pas un composant `role="menu"` : Tabulation conserve donc son comportement natif. Les commandes sélectionnées annoncent `aria-pressed`, Démarrer annonce `aria-expanded`, les images décoratives ont un texte alternatif vide. Le HTML généré est réservé aux constantes du projet ; ne pas y interpoler de contenu utilisateur. Le titre de page passe par `textContent`.

Désactiver masque le bureau et retire les attributs qui activent le CSS ; le bouton de restauration reste présent. Les écouteurs et l'horloge durent pendant la vie de la page pour permettre la réactivation. `ThemeEngine.destroy()` nettoie seulement le moteur CSS ; ce n'est pas une API de démontage du bureau.

## Cascade CSS

`styles/install.js` assemble, dans cet ordre : disposition, sujets, messages, contrôles, widgets. La couche `onche-adapter` vient ensuite, puis la substitution progressive des icônes dont les images ont chargé. Les styles du Shadow DOM sont indépendants. Cet ordre reproduit le script fourni : ne pas déplacer une règle sans vérifier sa priorité.

Les couleurs sont centralisées dans le registre. Les valeurs en pixels et les `!important` d'origine sont conservés dans cette refonte pour éviter un changement visuel simultané. Les sélecteurs du forum sont volontairement regroupés dans les styles et l'adaptateur ; aucune dépendance à un framework n'est ajoutée.

## Génération

Les sources sont des modules JavaScript. Un petit assembleur sans dépendance les regroupe en fonctions isolées, inclut le CSS comme chaînes de texte et produit une IIFE précédée des métadonnées userscript. Le résultat ne dépend d'aucun serveur de modules.

Le format accepté est volontairement limité : imports nommés JS sur une ligne (`import { name } from './file.js';`), imports CSS par défaut, exports directs `const`, `function`, `class`. Pas d'import dynamique, de réexport, d'alias, de cycle ni de paquet externe. Les syntaxes non prises en charge font échouer la génération. Si le projet nécessite TypeScript, des dépendances npm ou une syntaxe de modules plus riche, remplacer cet assembleur par un bundler standard plutôt qu'étendre un parseur maison.

`dist/` est versionné pour permettre l'installation sans outil de développement. La génération est déterministe. La CI vérifie que le fichier committé correspond aux sources.

## Périmètre de la migration

La fixture `tests/fixtures/original.user.js` contient la partie Onche du fichier fourni. Le second en-tête sans rapport, visant une conversation ChatGPT, est exclu. Les tests vérifient l'équivalence textuelle du CSS après normalisation des espaces. Les changements fonctionnels ciblés sont le retour du focus après activation/désactivation et le rejet des noms de thème hérités du prototype.
