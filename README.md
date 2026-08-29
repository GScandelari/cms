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

## Project structure

```
server.js                        — local dev entry point (npm start)
index.js                         — Cloud Functions entry point (exports `api` and `publishScheduledPosts`)

src/
  app.js                         — Express app: CORS, JSON parsing, mounts /posts and /health
  firebase.js                    — Firestore client (modular Admin SDK — see note below)
  middlewares/
    auth.js                      — requireAuth: accepts x-api-key OR a Firebase ID token allow-listed in ADMIN_EMAILS
    validate.js                  — validatePost / validatePostUpdate: field-level request validation
  routes/
    posts.js                     — GET/POST/PUT/DELETE /posts, wires auth + validation + the rebuild trigger
    uploads.js                   — GET/POST /uploads, DELETE /uploads/:name — image files for use in post content
    translate.js                 — POST /translate, drafts an English translation of a post's fields
  services/
    postsService.js              — Firestore reads/writes for posts, and publishDuePosts() for scheduled publishing
    githubDispatch.js            — triggerSiteRebuild(): fires the repository_dispatch event on publish
    uploadService.js             — uploadImage()/listImages()/deleteImage(): Firebase Storage reads/writes for uploads/
    translateService.js          — translatePost(): calls the Anthropic API to translate title/description/content

tests/                           — Jest + Supertest, one file per module above
```

`src/firebase.js` uses the *modular* Admin SDK (`getApps`/`initializeApp` from `firebase-admin/app`,
`getFirestore` from `firebase-admin/firestore`) rather than the namespaced `admin.firestore()`
style — the namespaced form broke in production (`Cannot read properties of undefined`) despite
working fine locally, so the modular API is the one to keep using here.

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
| `GITHUB_DISPATCH_TOKEN`     | Optional. Fine-grained GitHub PAT (Contents: read/write on the target repo) used to trigger a site rebuild when a post is published (see Rebuild trigger). If unset, publishing just skips the trigger — it's not required for the CMS itself to work. |
| `GITHUB_DISPATCH_REPO`      | Optional. `"owner/repo"` to send the rebuild `repository_dispatch` event to. Defaults to `GScandelari/website-gscandelari` if unset — only set this when reusing the CMS for a different site (see Rebuild trigger). |
| `ADMIN_PORTAL_ORIGINS`      | Comma-separated list of origins (e.g. `https://gscandelari-cms-admin.web.app`) allowed to call this API from a browser (CORS). Doesn't affect curl/server-to-server calls — CORS only applies to browsers. |
| `FIREBASE_STORAGE_BUCKET`   | Optional. Firebase Storage bucket for image uploads (see Image uploads). Defaults to `gscandelari-cms.firebasestorage.app` if unset. |
| `ANTHROPIC_API_KEY`         | Required for `POST /translate` (see Translation). An Anthropic API key from [console.anthropic.com](https://console.anthropic.com). |

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
  "publishAt":   "ISO 8601 date string, or null (default: null)",
  "translations": "{ [locale]: { title, description, content } } (default: {})"
}
```

`translations` holds a full translated copy of a post per locale code (currently just `en` in
practice, but the shape isn't limited to that) — see Translation below for how it's populated.

## Image uploads

All three endpoints require the same auth as writing posts (`x-api-key` or an allow-listed
Firebase ID token) — `GET /uploads` is an admin-only management view over the admin's own
uploads, not public post content, so it's gated too (unlike `GET /posts`).

| Method   | Endpoint          | Description                                    |
|----------|-------------------|-------------------------------------------------|
| `GET`    | `/uploads`        | List every uploaded image                       |
| `POST`   | `/uploads`        | Upload a new image                              |
| `DELETE` | `/uploads/:name`  | Delete an image (`:name` is just the filename, e.g. `169...-a1b2.jpg`, not a full path) |

`POST /uploads` accepts a single image as `multipart/form-data` under the field name `image`
(JPEG, PNG, GIF, or WEBP — up to 5MB). The image is saved to Firebase Storage under `uploads/`,
made publicly readable, and the response is its public URL:

```json
{ "url": "https://storage.googleapis.com/gscandelari-cms.firebasestorage.app/uploads/1755999999999-a1b2c3d4e5f6.jpg" }
```

`GET /uploads` returns every image in that same shape plus metadata, newest first:

```json
[{ "name": "1755999999999-a1b2c3d4e5f6.jpg", "url": "...", "size": 48213, "contentType": "image/jpeg", "createdAt": "2026-08-23T19:37:38.374Z" }]
```

Whether an image is currently referenced by any post isn't tracked server-side — the admin
portal figures that out by fetching `GET /posts` (already public, already includes full
`content`) and checking each post's content for the image's URL. `DELETE /uploads/:name` doesn't
know or care either way; it just deletes the Storage object.

Storage Security Rules (`storage.rules`) deny all client-side reads/writes — uploads only ever
happen through this endpoint via the Admin SDK (which isn't subject to those rules), and public
image URLs are served as plain public GCS objects, not through Firebase's rules-gated download
API. Firebase Storage must be enabled once per project via the
[Firebase Console](https://console.firebase.google.com/project/_/storage) ("Get Started") before
`firebase deploy --only storage` (or the function itself) will work — this one-time step can't
be done from the CLI or API.

```bash
curl -X POST http://localhost:3000/uploads \
  -H "x-api-key: $CMS_API_KEY" \
  -F "image=@photo.jpg"

curl http://localhost:3000/uploads -H "x-api-key: $CMS_API_KEY"

curl -X DELETE http://localhost:3000/uploads/1755999999999-a1b2c3d4e5f6.jpg \
  -H "x-api-key: $CMS_API_KEY"
```

## Translation

`POST /translate` requires the same auth as writing posts. It takes a post's PT fields and
returns an English draft — it never writes anything itself; the caller is expected to review or
edit the result and save it into that post's own `translations.en` via the normal
`POST`/`PUT /posts` flow.

```bash
curl -X POST http://localhost:3000/translate \
  -H "Content-Type: application/json" \
  -H "x-api-key: $CMS_API_KEY" \
  -d '{"title":"Por que criei este blog","description":"...","content":"..."}'
```

```json
{ "title": "Why I started this blog", "description": "...", "content": "..." }
```

Translation is done by Claude (`claude-opus-5`, via `@anthropic-ai/sdk`) with a system prompt
that preserves Markdown structure, links, images, and code blocks, and asks for a natural
first-person voice rather than a literal translation. Every call costs real money against the
Anthropic API, hence the auth requirement — this endpoint is never called automatically, only
when the admin portal's "Traduzir" button is clicked.

## Scheduled publishing

Setting `publishAt` on an unpublished post schedules it. A Cloud Function
(`publishScheduledPosts`) runs every 5 minutes, publishes any post whose `publishAt` has
passed and isn't published yet, and triggers a site rebuild if it published anything.
Nothing else needs to call this — it's fully automatic once `publishAt` is set.

## Rebuild trigger

When a `POST`/`PUT` leaves a post with `published: true`, the CMS fires a
[`repository_dispatch`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#repository_dispatch)
event (`cms-post-published`) against the repo in `GITHUB_DISPATCH_REPO` (defaults to
`GScandelari/website-gscandelari`), which that site's GitHub Actions workflow listens for to
rebuild and redeploy. Best-effort: if `GITHUB_DISPATCH_TOKEN` is missing or the GitHub API call
fails, the error is logged but the post request still succeeds — publishing a post never fails
because of the rebuild trigger.

Reusing this CMS for another site is just a matter of pointing `GITHUB_DISPATCH_REPO` (and the
GitHub PAT in `GITHUB_DISPATCH_TOKEN`) at that site's repo — no code change needed here.

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

`CMS_API_KEY` (and every other secret, including `ANTHROPIC_API_KEY`) is stored in Secret
Manager, not a `.env` file:

```bash
printf "your-key-here" | firebase functions:secrets:set CMS_API_KEY --project gscandelari-cms --data-file -
printf "sk-ant-..." | firebase functions:secrets:set ANTHROPIC_API_KEY --project gscandelari-cms --data-file -
```

(Use `printf`, not `echo` — `echo` appends a trailing newline that becomes part of the
secret value and won't match the header a client sends.)

Live URL: `https://southamerica-east1-gscandelari-cms.cloudfunctions.net/api`
