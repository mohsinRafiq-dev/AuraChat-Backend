# AuraChat Backend

Backend application for Aura Chat.

## Local setup

```bash
npm install
npm run dev
```

## MongoDB Atlas setup

1. Create a MongoDB Atlas cluster.
2. Add your development IP address to Network Access (or allow `0.0.0.0/0` for quick testing).
3. Create a database user and copy the connection string.
4. In `backend/.env`, set:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/chat-app?retryWrites=true&w=majority
```

5. Restart the backend.

The backend already reads `MONGODB_URI` from environment, so Atlas works without code changes.

## Notes

- Configure environment variables in `.env` before running.
