# mentions

This repository contains a backend service and a React single-page application. The frontend now lives in `client/` to avoid package conflicts with the server's dependencies.

## Backend

The backend remains at the repository root. Follow the backend's own setup instructions (or add them here) to install dependencies and run the service.

## Client (React + Vite)

All frontend code and its `package.json` are contained in `client/`.

```bash
cd client
npm install
npm run dev
```

Use this workspace separation when adding new dependencies or scripts so backend and frontend packages do not clash.
