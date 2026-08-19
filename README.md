# CMS — Personal Blog CMS

A REST API for managing posts on a personal website, backed by Firebase Firestore.

## Stack

- **Node.js** + **Express** — HTTP server & routing
- **Firebase Admin SDK** — Firestore database
- **Firebase Cloud Functions (2nd gen)** — production hosting
- **dotenv** — environment configuration
- **Jest** + **Supertest** — testing

## Entry points

- `server.js` — local dev server (`npm start`), listens on `PORT`, reads config from `.env`.
- `index.js` — Cloud Functions entry point (`exports.api`), used only by `firebase deploy`.

Both wrap the same Express app in `src/app.js`.

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

| Variable                    | Description                                                    |
|-----------------------------|------------------------------------------------------------------|
| `PORT`                      | Port the server listens on (default: `3000`)                   |
| `FIREBASE_PROJECT_ID`       | Your Firebase project ID                                        |
| `FIREBASE_SERVICE_ACCOUNT`  | Service account JSON as a single-line string (optional)        |
| `CMS_API_KEY`               | Required. Shared secret for write requests (see Authentication) |
| `GITHUB_DISPATCH_TOKEN`     | Optional. Fine-grained GitHub PAT (Contents: read/write on `GScandelari/website-gscandelari`) used to trigger a site rebuild when a post is published (see Rebuild trigger). If unset, publishing just skips the trigger — it's not required for the CMS itself to work. |

If `FIREBASE_SERVICE_ACCOUNT` is not set, the SDK uses Application Default Credentials.

### 3. Run

```bash
npm start
```

## Authentication

`GET` requests are public. `POST`, `PUT`, and `DELETE` on `/posts` require an `x-api-key`
header matching the `CMS_API_KEY` environment variable. Requests without a valid key get
`401 Unauthorized`; if the server has no `CMS_API_KEY` configured, writes are refused with
`500` rather than silently allowed.

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CMS_API_KEY" \
  -d '{"title":"Hello","content":"World","slug":"hello","published":false}'
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
  "title":       "string (required)",
  "content":     "string (required) — Markdown",
  "slug":        "string (required)",
  "published":   "boolean (default: false)",
  "description": "string (default: '')",
  "tags":        "string[] (default: [])",
  "lang":        "'pt' | 'en' (default: 'pt')"
}
```

## Rebuild trigger

When a `POST`/`PUT` leaves a post with `published: true`, the CMS fires a
[`repository_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#repository_dispatch)
event (`cms-post-published`) against `GScandelari/website-gscandelari`, which the site's
GitHub Actions workflow listens for to rebuild and redeploy. Best-effort: if
`GITHUB_DISPATCH_TOKEN` is missing or the GitHub API call fails, the error is logged but the
post request still succeeds — publishing a post never fails because of the rebuild trigger.

### Example — Create a post

See the Authentication section above — `POST`/`PUT`/`DELETE` require the `x-api-key` header.

## Tests

```bash
npm test
```

## Deployment

Deployed as a Cloud Function (2nd gen) to the `gscandelari-cms` Firebase project,
region `southamerica-east1`. Firestore lives in the same project, so the deployed
function uses Application Default Credentials automatically — no
`FIREBASE_SERVICE_ACCOUNT` needed in production.

```bash
firebase deploy --only functions --project gscandelari-cms
```

`CMS_API_KEY` is stored in Secret Manager, not a `.env` file:

```bash
printf "your-key-here" | firebase functions:secrets:set CMS_API_KEY --project gscandelari-cms --data-file -
```

(Use `printf`, not `echo` — `echo` appends a trailing newline that becomes part of the
secret value and won't match the header a client sends.)

Live URL: `https://southamerica-east1-gscandelari-cms.cloudfunctions.net/api`
