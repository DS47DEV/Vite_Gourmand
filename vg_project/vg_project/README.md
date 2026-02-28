# Vite & Gourmand — Node/Express + Postgres + Mongo (Docker)

Ce dépôt fournit :
- **Front** statique (HTML/CSS) basé sur ton `index.html` existant.
- **API REST** Node/Express.
- **PostgreSQL** (données métier + CRUD).
- **MongoDB** (événements / analytics NoSQL).
- **Docker Compose** pour lancer l’ensemble.

> Remarque : ton front actuel contient beaucoup de CSS/JS inline. Pour une CSP stricte (anti-XSS), il faudra idéalement extraire le JS dans `public/app.js`.

---

## 1) Lancer en local (Docker)

### Prérequis
- Docker Desktop (ou Docker Engine) + Docker Compose.

### Démarrage
```bash
docker compose up --build
```

Accès :
- Front : http://localhost:3000
- API : http://localhost:8080/api/health
- Postgres : localhost:5432 (vg/vgpass, DB vitegourmand)
- Mongo : localhost:27017

Les scripts SQL sont appliqués automatiquement au 1er démarrage de Postgres : `sql/001_schema.sql`, `sql/002_seed.sql`.

---

## 2) API (principaux endpoints)

### Auth
- `POST /api/auth/register` `{ email, password, prenom, nom }` -> `{ user, token }`
- `POST /api/auth/login` `{ email, password }` -> `{ user, token }`
- `GET /api/auth/me` (Bearer token)

> Le token est un JWT à envoyer en header : `Authorization: Bearer <token>`

### Menus (CRUD)
- `GET /api/menus`
- `GET /api/menus/:id`
- `POST /api/menus` (role employee/admin)
- `PUT /api/menus/:id` (role employee/admin)
- `PATCH /api/menus/:id` (role employee/admin)
- `DELETE /api/menus/:id` (role admin)

### Orders (CRUD)
- `GET /api/orders` (client -> ses commandes ; employee/admin -> toutes)
- `GET /api/orders/:id`
- `POST /api/orders`
- `PUT /api/orders/:id` (client seulement si status=received)
- `PATCH /api/orders/:id/status` (employee/admin)
- `DELETE /api/orders/:id` (annulation logique -> status=cancelled)

### Reviews
- `GET /api/reviews` (public: approved)
- `POST /api/reviews` (client -> pour une commande completed)
- `GET /api/reviews/pending` (employee/admin)
- `PATCH /api/reviews/:id/moderate` (employee/admin)

### NoSQL Events (Mongo)
- `POST /api/events` (ingest)
- `GET /api/events/stats?from=YYYY-MM-DD&to=YYYY-MM-DD` (admin)

---

## 3) Front : Fetch asynchrone (exemple)

Ton `index.html` peut appeler l’API en `fetch` via Nginx (même domaine) :
- appeler `/api/menus` (Nginx proxy -> container api)

Exemple minimal :
```js
async function api(path, options={}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers||{}) },
    ...options,
  });
  if(!res.ok) throw new Error(await res.text());
  return res.status===204 ? null : res.json();
}

const menus = await api('/menus');
console.log(menus);
```

---

## 4) Sécurité (front + back)

### SQL Injection
- **Toujours** utiliser des requêtes paramétrées (`$1,$2,...`) côté Postgres (déjà fait dans l’API).

### XSS
- Côté **front**, éviter d’insérer du texte utilisateur avec `innerHTML`.
  - Utiliser `textContent` / `createElement`.
  - Alternative : sanitizer (DOMPurify) si tu dois garder `innerHTML`.

### Hardening API
- `helmet` (headers)
- `express-rate-limit` (anti brute force)
- validation Zod (tailles max)
- CORS restreint via `CORS_ORIGIN`
- JWT + RBAC (`client` / `employee` / `admin`)

---

## 5) Déploiement (procédure type)

### Option simple (VPS + Docker)
1. Installer Docker + Docker Compose sur le serveur.
2. Copier le projet (git clone / scp).
3. Mettre des secrets **réels** : `JWT_SECRET`, mots de passe DB.
4. Lancer :
   ```bash
   docker compose up -d --build
   ```
5. Ajouter un reverse-proxy (Nginx sur l’hôte) + HTTPS (Let’s Encrypt) si nécessaire.

---

## 6) Notes sur les seeds
`sql/002_seed.sql` contient des hashes `REPLACE_ME` :
- le plus simple : créer les comptes via `/api/auth/register` en dev,
- ou générer des bcrypt et remplacer.
