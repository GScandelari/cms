# CMS — Personal Blog CMS

A REST API for managing posts on a personal website, backed by Firebase Firestore.

## Stack

- **Node.js** + **Express** — HTTP server & routing
- **Firebase Admin SDK** — Firestore database
- **dotenv** — environment configuration
- **Jest** + **Supertest** — testing

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in your Firebase credentials:

```bash
cp .env.example .env
```

| Variable                    | Description                                             |
|-----------------------------|---------------------------------------------------------|
| `PORT`                      | Port the server listens on (default: `3000`)            |
| `FIREBASE_PROJECT_ID`       | Your Firebase project ID                                |
| `FIREBASE_SERVICE_ACCOUNT`  | Service account JSON as a single-line string (optional) |

If `FIREBASE_SERVICE_ACCOUNT` is not set, the SDK uses Application Default Credentials.

### 3. Run

```bash
npm start
```

## REST API

Base URL: `http://localhost:3000`

| Method   | Endpoint       | Description          |
|----------|----------------|----------------------|
| `GET`    | `/posts`       | List all posts       |
| `GET`    | `/posts/:id`   | Get a single post    |
| `POST`   | `/posts`       | Create a new post    |
| `PUT`    | `/posts/:id`   | Update a post        |
| `DELETE` | `/posts/:id`   | Delete a post        |
| `GET`    | `/health`      | Health check         |

### Post schema

```json
{
  "title":     "string (required)",
  "content":   "string (required)",
  "slug":      "string (required)",
  "published": "boolean (default: false)"
}
```

### Example — Create a post

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World","slug":"hello","published":false}'
```

## Tests

```bash
npm test
```
