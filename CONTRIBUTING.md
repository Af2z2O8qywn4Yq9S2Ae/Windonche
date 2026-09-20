# Contribuer

1. Créer une branche pour une modification ciblée.
2. Modifier le module responsable, en suivant [l'architecture](docs/architecture.md).
3. Exécuter `npm run check` et les [vérifications navigateur](docs/testing.md) pertinentes.
4. Inclure le userscript régénéré dans le commit.
5. Décrire dans la pull request le problème, le comportement obtenu et les validations effectuées.

Pour ajouter un thème, copier la palette classique dans `src/themes/registry.js` avec un identifiant simple et stable, un nom et toutes les couleurs requises. Le bureau génère automatiquement son bouton. Les couleurs validées doivent être au format `#RRGGBB`. Les thèmes `95` et `98` sont réservés à la compatibilité historique.

Pour publier une nouvelle version, modifier à la fois `package.json` et `userscript.meta.txt`, puis lancer `npm run check`. Ne pas éditer directement `dist/` ni la fixture d'origine pour faire passer un test.

Préférer les éléments HTML natifs, des libellés accessibles et les variables de palette. Conserver les éléments cachés, spoilers et actions natives du forum. Ne pas ajouter d'envoi de messages ou de suivi utilisateur dans le thème.
