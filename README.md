# 🔍 Bitespeed Identity Reconciliation Service

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

**A smart REST API that links customer identities across multiple emails and phone numbers**

[Live Demo](#-live-demo) • [API Docs](#-api-documentation) • [Setup](#-local-setup) • [How It Works](#-how-it-works)

</div>

---

## 🧩 The Problem

Imagine a customer named Doc who buys from FluxKart.com using different emails and phone numbers for each purchase to stay anonymous. How do you recognize it's the same person and give them a personalized experience?

That's exactly what this service solves - **Identity Reconciliation**.

---

## 🚀 Live Demo

> **Base URL:** `https://bitespeed-identity.onrender.com`

```
POST https://bitespeed-identity.onrender.com/identify
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Hosting | Render.com |

---

## 🧠 How It Works

The service maintains a `Contact` table where each customer can have multiple entries - one **primary** and many **secondary** contacts, all linked together.

### Reconciliation Rules

```
New request comes in
        │
        ▼
No match found? ──► Create new PRIMARY contact
        │
        ▼
Match found with existing contact?
        │
        ├── Same info already exists ──► Return existing cluster as-is
        │
        ├── New info + partial match ──► Create SECONDARY contact linked to primary
        │
        └── Two separate primaries match? ──► Older one stays PRIMARY
                                              Newer one becomes SECONDARY
                                              All its secondaries re-linked
```

### Database Schema

```prisma
model Contact {
  id              Int       @id @default(autoincrement())
  phoneNumber     String?
  email           String?
  linkedId        Int?
  linkPrecedence  String    // "primary" | "secondary"
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
}
```

---

## 📡 API Documentation

### `POST /identify`

Identifies and consolidates a customer's contact information.

**Request Body**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
> At least one of `email` or `phoneNumber` is required.

**Response**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["123456", "999999"],
    "secondaryContactIds": [2, 3]
  }
}
```

---

### 📋 Example Scenarios

**Scenario 1 - New Customer**

Request:
```json
{ "email": "doc@hillvalley.edu", "phoneNumber": "123456" }
```
Response:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

---

**Scenario 2 - Same customer, new email**

Request:
```json
{ "email": "emmett@hillvalley.edu", "phoneNumber": "123456" }
```
Response:
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu", "emmett@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

---

**Scenario 3 - Two clusters merging**

When a request links two previously separate primary contacts, the older one becomes the true primary and the newer one is demoted to secondary along with all its linked contacts.

---

## 💻 Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL database
- npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/binnisha/bitespeed-identity.git
cd bitespeed-identity

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Add your DATABASE_URL in .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
PORT=3000
```

---

## 🗂️ Project Structure

```
bitespeed-identity/
├── src/
│   ├── index.ts          # Express app entry point
│   └── identify.ts       # Core identity reconciliation logic
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── .env                  # Environment variables
├── package.json
└── tsconfig.json
```

---

## 🔄 Commit History Philosophy

This project follows meaningful, incremental commits:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code improvements
- `docs:` for documentation updates

---

## 👩‍💻 Author

🛠️ Engineered by Binisha Thakur: Turning business logic into clean, scalable backend systems.
