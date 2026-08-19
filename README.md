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
| `CMS_API_KEY`               | Shared secret for write requests via `x-api-key` (see Authentication) |
| `ADMIN_EMAILS`              | Comma-separated allow list of emails permitted to write via a Firebase Auth bearer token (see Authentication). Not required if you only ever use `CMS_API_KEY`. |
| `GITHUB_DISPATCH_TOKEN`     | Optional. Fine-grained GitHub PAT (Contents: read/write on `GScandelari/website-gscandelari`) used to trigger a site rebuild when a post is published (see Rebuild trigger). If unset, publishing just skips the trigger — it's not required for the CMS itself to work. |
| `ADMIN_PORTAL_ORIGINS`      | Comma-separated list of origins (e.g. `https://gscandelari-cms-admin.web.app`) allowed to call this API from a browser (CORS). Doesn't affect curl/server-to-server calls — CORS only applies to browsers. |

If `FIREBASE_SERVICE_ACCOUNT` is not set, the SDK uses Application Default Credentials.

### 3. Run

```bash
npm start
```

## Authentication

`GET` requests are public. `POST`, `PUT`, and `DELETE` on `/posts` accept either credential:

- **`x-api-key` header** matching `CMS_API_KEY` — for scripts/curl.
- **`Authorization: Bearer <Firebase ID token>`** — for the admin portal/app. The token's
  email must be verified and present in `ADMIN_EMAILS`.

Requests with neither a valid key nor a valid, allow-listed token get `401 Unauthorized`.

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
  "lang":        "'pt' | 'en' (default: 'pt')",
  "publishAt":   "ISO 8601 date string, or null (default: null)"
}
```

## Scheduled publishing

Setting `publishAt` on an unpublished post schedules it. A Cloud Function
(`publishScheduledPosts`) runs every 5 minutes, publishes any post whose `publishAt` has
passed and isn't published yet, and triggers a site rebuild if it published anything.
Nothing else needs to call this — it's fully automatic once `publishAt` is set.

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
