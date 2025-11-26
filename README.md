<<<<<<< HEAD
# tpodo timesheet - minimal server

This is a minimal Node.js + Express server to get started for the tpodo intern project. It provides simple JSON-file-backed user registration and login endpoints.

Endpoints:
- POST /register  { email, password, name? }
- POST /login     { email, password }
- GET  /me        (Authorization: Bearer <token>)

Quick start (PowerShell on Windows):

```powershell
Set-Location -LiteralPath 'C:\Users\Welcome\OneDrive\Desktop\Time sheet'
npm install
npm start
```

Notes:
- This uses a simple JSON file (server/db.json) as storage. For production use, migrate to SQLite/Postgres.
- JWT secret is read from JWT_SECRET; default is a dev value — change it before deploying.

Setting an initial admin user
 - You can instruct the server to create a first admin account automatically on startup by setting the following environment variables before running the server:
	 - ADMIN_EMAIL (required)
	 - ADMIN_PASSWORD (required)
	 - ADMIN_NAME (optional)

Example (PowerShell):
```powershell
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'a_strong_password'
$env:ADMIN_NAME = 'Alice Admin'
npm start
```
The server will create that user in `server/db.json` if the users array is empty.

Next steps for the project:
- Add time tracking models (punch in/out, timeline)
- Build a frontend (React or simple server-rendered pages)
- Replace JSON store with a proper DB and add migrations
=======
# Time-sheet
>>>>>>> dade8f09e7548d2ecba275ed03766844e3d11a50
