# Cart Path Chat Backend

AI-powered chat system for Cart Path Cleaning website.

## Features
- Real-time chat via WebSocket
- OpenAI GPT-4 integration
- PostgreSQL for chat history
- Email notifications for human handoff
- Admin panel (PWA) for replying to chats

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Run database migrations:
```bash
node src/db/migrate.js
```

5. Start server:
```bash
npm start
```

## Deployment on Coolify

1. Create new application in Coolify
2. Connect to GitHub repo: `Pink-Mahi/cart_path_chat`
3. Set build pack to "Dockerfile"
4. Add environment variables from `.env.example`
5. Add PostgreSQL database service
6. Deploy

## Environment Variables

- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - Your OpenAI API key
- `FRONTEND_URL` - Your website URL (for CORS)
- `ADMIN_EMAIL` - Email for notifications
- `SMTP_*` - Email server configuration
