# Salon - Frontend (HTML / CSS / JavaScript Vanilla + Axios)

## Lancer
1. Démarrez le backend Laravel : `php artisan serve` (par défaut http://localhost:8000).
2. Ouvrez `assets/js/config.js` et vérifiez `API_URL`, `SALON_NAME`, `CURRENCY`.
3. Servez ce dossier avec un serveur statique (ex. extension VS Code "Live Server" ou `npx serve .`), puis ouvrez `login.html`.
4. Si le navigateur signale une erreur CORS, autorisez l'origine du frontend dans la configuration CORS de Laravel.

## Structure
- `login.html`, `pages/*.html` : une page par module
- `assets/css/style.css` : variables de couleur (`:root`) et composants
- `assets/js/config.js` : URL de l'API | `auth.js` : token et session | `api.js` : tous les appels Axios
- `assets/js/app.js` : sidebar, header, modales, notifications, formatage
- `dashboard.js`, `clients.js` : modules déjà réalisés

## Authentification
Sanctum par token : `POST /login` renvoie `{token, user}`, envoyé ensuite en `Authorization: Bearer`.
Un 401 renvoie automatiquement vers la connexion. Les rôles `admin` et `reception` adaptent le menu ; le backend reste l'autorité (403).

## Limites connues (liées au backend)
- Profil : aucune route d'auto-modification (seul l'admin peut modifier `/users/{id}`).
- Le dashboard complet (rapports) est réservé à l'admin ; la réception voit une version réduite.
- Heures des visites : selon le format renvoyé par Laravel, un décalage UTC peut apparaître (voir `fmtDateTime` dans `app.js`).

## Avancement
Fait : socle, connexion, tableau de bord, clients. À venir : employés, congés, services, visites, factures (impression), paiements, dépenses, profil.
