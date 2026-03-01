# API Collecteur Paiement (Mobile)

Cette documentation couvre les endpoints necessaires pour une application mobile de collecteur de paiement.

## 1. Base URL
- Dev local: `http://localhost:3000`
- Exemple production: `https://votre-domaine.com`

## 2. Authentification (mobile)
L'API mobile utilise un token Bearer obtenu via login.

### Endpoint
`POST /api/auth/mobile/login`

### Body JSON
```json
{
  "email": "collecteur@plateforme.com",
  "password": "Collect1234!"
}
```

### Reponse 200
```json
{
  "success": true,
  "token": "<SESSION_TOKEN>",
  "tokenType": "Bearer",
  "expiresIn": 604800,
  "user": {
    "id": "...",
    "fullName": "Collecteur Demo",
    "email": "collecteur@plateforme.com",
    "role": "COLLECTOR"
  }
}
```

### Erreurs
- `400` -> `EMAIL_PASSWORD_REQUIRED`
- `401` -> `INVALID_CREDENTIALS`

### Header a envoyer ensuite
`Authorization: Bearer <SESSION_TOKEN>`

## 3. Rechercher un exposant
Permet de verifier l'identite et la situation avant encaissement.

### Endpoint (au choix)
- Par numero exposant: `GET /api/exhibitors/search?referenceNumber=EXP-2026-001`
- Par telephone: `GET /api/exhibitors/search?phone=%2B22790000000`

### Header
`Authorization: Bearer <SESSION_TOKEN>`

### Reponse 200 (exemple)
```json
{
  "id": "...",
  "referenceNumber": "EXP-2026-001",
  "firstName": "Amina",
  "lastName": "Issa",
  "fullName": "Amina Issa",
  "email": "amina@example.com",
  "companyName": "Maison Sahel",
  "phone": "+22790000000",
  "age": 32,
  "gender": "F",
  "nationality": "Nigerienne",
  "address": "Niamey",
  "businessRegister": "RCCM-123",
  "activitySector": "Agroalimentaire",
  "location": "Petit marche",
  "region": "Niamey",
  "status": "PENDING",
  "expectedAmount": 250000,
  "totalPaid": 50000,
  "booth": null
}
```

### Erreurs
- `401` -> `Unauthorized`
- `400` -> `referenceNumber or phone is required`
- `400` -> `PHONE_NOT_UNIQUE` (plusieurs exposants ont le meme telephone)
- `404` -> `Exhibitor not found`

## 4. Enregistrer un paiement
Enregistre un paiement pour un exposant via son numero exposant ou son telephone.

### Endpoint
`POST /api/payments`

### Header
- `Authorization: Bearer <SESSION_TOKEN>`
- `Content-Type: application/json`

### Body JSON
```json
{
  "referenceNumber": "EXP-2026-001",
  "amount": 25000,
  "method": "MOBILE_MONEY",
  "reference": "TXN-9988",
  "notes": "Paiement partiel"
}
```

Exemple alternatif (paiement par telephone):
```json
{
  "phone": "+22790000000",
  "amount": 25000,
  "method": "MOBILE_MONEY"
}
```

### Champs
- `referenceNumber` (string, obligatoire si `phone` absent)
- `phone` (string, obligatoire si `referenceNumber` absent)
- `amount` (number, obligatoire, > 0)
- `method` (optionnel):
  - `CASH`
  - `MOBILE_MONEY`
  - `CARD`
  - `BANK_TRANSFER`
- `reference` (optionnel)
- `notes` (optionnel)

Envoyer au minimum un identifiant: `referenceNumber` ou `phone`.

### Reponse 200
```json
{
  "success": true,
  "paymentId": "...",
  "exhibitor": {
    "id": "...",
    "referenceNumber": "EXP-2026-001",
    "fullName": "Amina Issa"
  },
  "status": "PARTIAL"
}
```

### Erreurs metier (400)
- `INVALID_PAYLOAD`
- `EXHIBITOR_NOT_FOUND`
- `PHONE_NOT_UNIQUE`
- `PARTIAL_PAYMENT_DISABLED`
- `PAYMENT_AMOUNT_OUT_OF_RANGE`

Quand `PAYMENT_AMOUNT_OUT_OF_RANGE`, la reponse inclut:
```json
{
  "error": "PAYMENT_AMOUNT_OUT_OF_RANGE",
  "minPaymentAmount": 1000,
  "maxPaymentAmount": 2000000
}
```

Quand `PARTIAL_PAYMENT_DISABLED`, la reponse inclut:
```json
{
  "error": "PARTIAL_PAYMENT_DISABLED",
  "remainingAmount": 250000
}
```

### Erreurs auth
- `401` -> `Unauthorized`

## 5. Historique de collecte du collecteur
Permet au collecteur de consulter son propre historique (les paiements des autres collecteurs ne sont pas retournes).

### Endpoint
`GET /api/payments/history`

### Header
`Authorization: Bearer <SESSION_TOKEN>`

### Query params optionnels
- `page` (defaut `1`)
- `limit` (defaut `20`, max `100`)
- `referenceNumber` (filtre exact sur la reference exposant)
- `method` (`CASH`, `MOBILE_MONEY`, `CARD`, `BANK_TRANSFER`)
- `from` (date ISO, ex: `2026-01-01T00:00:00.000Z`)
- `to` (date ISO, ex: `2026-12-31T23:59:59.999Z`)

### Reponse 200 (exemple)
```json
{
  "success": true,
  "page": 1,
  "limit": 20,
  "totalItems": 2,
  "totalPages": 1,
  "summary": {
    "count": 2,
    "amount": 75000
  },
  "items": [
    {
      "id": "pay_1",
      "amount": 50000,
      "method": "MOBILE_MONEY",
      "reference": "TXN-1200",
      "notes": "Acompte",
      "paidAt": "2026-03-01T10:00:00.000Z",
      "exhibitor": {
        "id": "exp_1",
        "referenceNumber": "EXP-2026-001",
        "fullName": "Amina Issa",
        "companyName": "Maison Sahel",
        "phone": "+22790000000"
      },
      "collector": {
        "id": "usr_1",
        "fullName": "Collecteur Demo",
        "email": "collecteur@plateforme.com"
      }
    }
  ]
}
```

### Erreurs
- `401` -> `Unauthorized`
- `400` -> `INVALID_METHOD`
- `400` -> `INVALID_FROM_DATE`
- `400` -> `INVALID_TO_DATE`

## 6. Raccourci cURL (workflow complet)

### 1) Login mobile
```bash
curl -X POST "http://localhost:3000/api/auth/mobile/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"collecteur@plateforme.com","password":"Collect1234!"}'
```

### 2) Rechercher exposant
```bash
curl "http://localhost:3000/api/exhibitors/search?referenceNumber=EXP-2026-001" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

Ou par telephone:
```bash
curl "http://localhost:3000/api/exhibitors/search?phone=%2B22790000000" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

### 3) Enregistrer paiement
```bash
curl -X POST "http://localhost:3000/api/payments" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceNumber":"EXP-2026-001",
    "amount":25000,
    "method":"MOBILE_MONEY",
    "reference":"TXN-9988",
    "notes":"Paiement partiel"
  }'
```

Ou paiement par telephone:
```bash
curl -X POST "http://localhost:3000/api/payments" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone":"+22790000000",
    "amount":25000,
    "method":"MOBILE_MONEY",
    "reference":"TXN-9988"
  }'
```

### 4) Consulter son historique
```bash
curl "http://localhost:3000/api/payments/history?page=1&limit=20" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

## 7. Roles et securite
- Roles autorises API mobile paiement: `ADMIN`, `COLLECTOR`
- L'historique `GET /api/payments/history` est limite automatiquement au collecteur authentifie.
- Les actions sont journalisees dans le module Logs systeme.
- Le token est sensible: stocker en securise (Keychain/Keystore), jamais en clair.

## 8. Notes d'integration mobile
- Si 401: refaire login pour recuperer un nouveau token.
- Toujours afficher `minPaymentAmount`/`maxPaymentAmount` a l'utilisateur en cas de rejet de montant.
- Si `PARTIAL_PAYMENT_DISABLED`, forcer la saisie du `remainingAmount` exact.
- Afficher `status` retourne apres paiement pour mise a jour immediate de l'ecran.
- Utiliser `summary` de l'historique pour afficher le total collecte du collecteur dans l'app.
- Si `PHONE_NOT_UNIQUE`: demander le numero exposant (`referenceNumber`) pour eviter une ambiguite.
