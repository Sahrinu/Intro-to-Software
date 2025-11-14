# Quick Start Guide

## 🚀 Fast Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start Backend

```bash
npm run dev
```

The backend will start on `http://localhost:3000` and automatically create the SQLite database.

### Step 3: Start Frontend

```bash
cd frontend
npm run dev
```

The Vite dev server will start on `http://localhost:8080` with hot module replacement (HMR).

### Step 4: Login

Use the default admin account:
- **Email**: `admin@campus.edu`
- **Password**: `admin123`

Or register a new account from the registration page.

## 📱 Using the Application

1. **Login/Register**: Start by logging in or creating an account
2. **Dashboard**: View your bookings, events, and maintenance requests
3. **Bookings**: Book campus resources (rooms, equipment, facilities)
4. **Events**: Create and view campus events
5. **Maintenance**: Submit maintenance requests
6. **AI Assistant**: Chat with the AI assistant for help

## 🔧 Troubleshooting

### Backend won't start
- Make sure port 3000 is not in use
- Check that all dependencies are installed: `npm install`

### Frontend can't connect to backend
- Ensure backend is running on `http://localhost:3000`
- Check browser console for CORS errors
- Vite proxy is configured in `vite.config.ts` - API calls to `/api` are automatically proxied to backend

### Database errors
- Delete `campus_management.db` and restart the server to recreate it
- Check file permissions in the project directory

### AI Assistant not working
- The assistant works with mock responses by default
- To use OpenAI: Add `OPENAI_API_KEY` to `.env` file

## 🎯 Next Steps

- Customize the UI in `frontend/styles/main.css`
- Add more features in the respective route files
- Configure environment variables in `.env`
- Deploy to production (update CORS and API URLs)

