# Niger Pay Platform (Next.js + Postgres)

Plateforme de gestion de paiements avec workflow complet:
- import Excel des exposants depuis la page Parametres
- import Excel de la liste des kiosques depuis la page Parametres
- configuration des montants (defaut, min, max) dans Parametres
- creation unitaire d'exposant
- collecte des paiements via API mobile (pas de saisie manuelle web)
- gestion des utilisateurs avec roles (ADMIN / COLLECTOR)
- attribution de boutiques uniquement aux exposants regles
- export Excel des exposants payes
- journalisation des activites systeme (module Logs)

## Stack
- Next.js (App Router, TypeScript)
- PostgreSQL
- Prisma ORM
- Auth maison (cookie de session signee)
- UI glassmorphism inspiree des couleurs du drapeau du Niger

## 1. Installation
```bash
npm install
cp .env.example .env
```

Renseigne ensuite `DATABASE_URL`, `AUTH_SECRET` et `APP_URL` dans `.env`.

Exemple production:
- `APP_URL="https://marchedelarefondation.ne"`

## 2. Base de donnees
```bash
npm run prisma:generate
npm run db:push
npm run db:seed
```

Cela cree:
- un admin: `admin@plateforme.com`
- un collecteur demo: `collecteur@plateforme.com`
- des boutiques de test

Mots de passe par defaut (surchageables via variables d'env):
- `Admin1234!`
- `Collect1234!`

## 3. Lancer la plateforme
```bash
npm run dev
```

Puis ouvre `http://localhost:3000`.

## 4. API pour app mobile collecteur
Documentation complete: `docs/API_COLLECTEUR_PAIEMENT.md`

### Rechercher un exposant
`GET /api/exhibitors/search?referenceNumber=EXP-2026-001`

### Enregistrer un paiement
`POST /api/payments`

### Historique de collecte (mobile)
`GET /api/payments/history`

### Auth mobile (Bearer)
`POST /api/auth/mobile/login`

Body JSON:
```json
{
  "referenceNumber": "EXP-2026-001",
  "amount": 25000,
  "method": "MOBILE_MONEY",
  "reference": "TXN-9988",
  "notes": "Paiement partiel"
}
```

Note: ces endpoints exigent une session connectee.

## 5. Modules disponibles
- `/dashboard`
- `/collecte`
- `/paiements`
- `/exposants` (admin)
- `/utilisateurs` (admin)
- `/boutiques` (admin)
- `/parametres` (admin)
- `/logs` (admin)
- `/exposants/import` (admin, redirection vers `/parametres`)

## 6. Import/Export Excel
- Import exposants: page `/parametres`, fichier `.xlsx`/`.xls`
- Import kiosques: page `/parametres`, fichier `.xlsx`/`.xls`
- Export exposants payes: `GET /api/exports/exposants-payes`
- Colonnes import supportees:
  `N° Référence`, `Prénom`, `Nom`, `Email`, `Téléphone`, `Âge`, `Sexe`, `Nationalité`, `Adresse`, `Entreprise`, `Registre Commerce`, `Secteur d'activité`, `Localisation`, `Région`

## 7. Si tu as deja une base de donnees existante
Comme tu as indique avoir deja une base "paiements attendus", adapte le schema `prisma/schema.prisma` (ou fais un `prisma db pull`) pour aligner les colonnes reelles avant mise en production.
