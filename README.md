## Music Album Review System

IFN636 Assessment 2 — Software Life Cycle and Management

A web application allowing user to browse albums and submit ratings/reviews
with admin moderation. Built with React, Node.js/Express, and MongoDB Atlas.

### Roles
- Admin: manage accounts and album catalogue, view and delete flagged reviews
- Member: browse albums and profile, flag reviews, submit and manage own reviews

### Architecture

- **Frontend**: React 18 (Create React App) + Tailwind CSS, React Router, axios.
- **Backend**: Node.js / Express, Mongoose against MongoDB Atlas, JWT bearer-token auth.
- **In production**: `backend/server.js` serves both the REST API (under
  `/api/*`) and the built frontend (`frontend/build`) as static files from a
  single Node process on port 5001. nginx listens on port 80 and reverse-proxies
  everything to that one process — it does not serve static files itself.
  pm2 keeps the Node process running and restarts it on crash or reboot.
- **In local development**: the frontend runs on its own CRA dev server
  (port 3000) and forwards API requests to the backend (port 5001) via CRA's
  built-in `proxy` field (`frontend/package.json`); the backend connects
  directly to MongoDB Atlas either way.

### Local setup

1. Clone the repository.
2. From the repo root: `npm run install-all` (installs root, `backend/`, and `frontend/`).
3. Copy `backend/.env.example` to `backend/.env` and fill in `MONGO_URI`, `JWT_SECRET`, and `PORT`.
4. From the repo root: `npm run dev` (runs the backend with nodemon and the frontend dev server together).
5. Open `http://localhost:3000`.
6. Optionally seed sample data — see below.

### Known limitations

- **Album-delete cascade is not atomic.** `deleteAlbum` removes an album's
  reviews and then the album itself as two separate operations, not one
  transaction. An interruption between them could leave reviews pointing at
  a deleted album, or vice versa.
- **The unsaved-changes guard is in-app only.** The confirmation dialog on
  the album form only intercepts the "Back to catalogue" link; it does not
  cover the browser's Back button, a reload, or closing the tab, so changes
  can be lost silently through those paths.
- **The aggregate rating is recomputed on every read**, not cached. Album
  detail and catalogue/search responses recalculate `averageRating` and
  `reviewCount` from the `Review` collection each time rather than storing
  them on the `Album` document, so the cost scales with read traffic.
- **The review list doesn't refresh across tabs.** If the same album is
  reviewed in another tab, the album detail page won't reflect it until
  manually reloaded.
- **Search doesn't indicate which track matched.** A query can match a
  track title, but the result only shows the album — not which of its
  tracks matched — so a track-title hit can look unexplained in the UI.

### Deployment

**Deployment URL:** _TBD — to be filled in once the EC2 instance is live._
http://16.176.156.12:5001/login

Manual deployment checklist, to run on the instance:

1. Launch a t2.micro EC2 instance (Ubuntu), with its security group open
   only on ports 22 (SSH) and 80 (HTTP).
2. SSH into the instance.
3. Install Node.js 20, e.g.:
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```
4. Clone the repository and `cd` into it.
5. Create `backend/.env` from `backend/.env.example`, filling in the real
   `MONGO_URI`, `JWT_SECRET`, and `PORT=5001`. Never commit this file.
6. In MongoDB Atlas, add the instance's public IP under Network Access.
7. Install dependencies from the repo root: `npm run install-all`.
8. Build the frontend: `cd frontend && npm run build && cd ..` — produces
   `frontend/build`, which `backend/server.js` serves automatically once present.
9. Install pm2 globally: `sudo npm install -g pm2`.
10. Start the backend under pm2: `cd backend && pm2 start server.js --name mars`.
11. Persist pm2 across reboots: run `pm2 startup` and execute the command it
    prints (registers a systemd service), then `pm2 save`.
12. Install nginx: `sudo apt-get install -y nginx`.
13. Create `/etc/nginx/sites-available/mars`:
    ```
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://localhost:5001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
    ```
14. Enable it and disable the conflicting default site:
    ```
    sudo ln -s /etc/nginx/sites-available/mars /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
    ```
15. Optionally seed demo data: `cd backend && npm run seed:albums`.
16. Verify: open `http://<instance-public-IP>/` — it should load the login
    page. Check `pm2 status`, then confirm the auto-restart AC by killing
    the Node process and observing pm2 bring it back.
17. Fill in the "Deployment URL" above and capture screenshots per the
    story's acceptance criteria.

### Seeding the catalogue

`backend/scripts/seedAlbums.js` populates the catalogue with 11 albums with
complete metadata and track lists, 9 demo reviewer accounts, and reviews
linking them to most of the albums. It's idempotent — albums are matched by
`title` + `artistName`, users by `email`, and reviews by their
`{ userId, albumId }` pair (the same compound key the schema enforces
uniqueness on) — so it's safe to run more than once, including against a
completely fresh database (e.g. right after provisioning EC2), without
creating duplicates.

```
cd backend
npm run seed:albums
```

Requires `MONGO_URI` to be set in `backend/.env` (see `.env.example`).

**Demo reviewer accounts.** These are demonstration-only logins seeded for
grading/walkthrough purposes, not real user data — they share one
deliberately public password, so **do not treat it as a secret**: it is
meant to be documented here in plain text, unlike `MONGO_URI` or
`JWT_SECRET`.

| Email | Password |
|---|---|
| brad@example.com | `Demo1234!` |
| mika@example.com | `Demo1234!` |
| henry@example.com | `Demo1234!` |
| kenny@example.com | `Demo1234!` |
| jasmine@example.com | `Demo1234!` |
| dio@example.com | `Demo1234!` |
| giorno@example.com | `Demo1234!` |
| jolene@example.com | `Demo1234!` |
| josuke@example.com | `Demo1234!` |

Each has `role: 'user'`. One album (*In Rainbows*) is deliberately left
without any reviews, to demonstrate the "No ratings yet" state.

**Album cover**
Non-copyright album covers are from Unsplash.com
