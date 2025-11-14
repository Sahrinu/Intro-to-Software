# Smart, AI-Driven Sustainable Campus Management System

A complete full-stack web application for managing campus resources, events, maintenance requests, and providing AI-powered assistance.

## 🏗️ Architecture

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: TypeScript, Node.js, Express
- **Database**: SQLite
- **Authentication**: JWT with Role-Based Access Control (RBAC)
- **AI Assistant**: OpenAI API integration with mock fallback
- **Routing**: React Router v6

## 📁 Project Structure

```
Intro-to-Software/
├── src/                    # Backend source code
│   ├── server.ts          # Express server entry point
│   ├── database/          # Database initialization
│   ├── routes/            # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── booking.routes.ts
│   │   ├── event.routes.ts
│   │   ├── maintenance.routes.ts
│   │   └── assistant.routes.ts
│   ├── middleware/        # Authentication & authorization
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── frontend/              # Frontend application (React)
│   ├── index.html         # Main HTML file
│   ├── vite.config.ts     # Vite configuration
│   ├── styles/            # CSS stylesheets
│   └── src/               # React source code
│       ├── main.tsx       # React entry point
│       ├── App.tsx        # Main App component
│       ├── components/    # Reusable components
│       ├── pages/         # Page components
│       ├── contexts/      # React contexts (Auth)
│       └── services/      # API service layer
├── Booking/               # Booking module documentation
├── Campus Assistant/      # AI Assistant module documentation
├── Events and Scheduling/ # Events module documentation
├── Maintenance/           # Maintenance module documentation
└── User Role/             # User management module documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install backend dependencies:**
   ```bash
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```
   
   Note: The frontend now uses React with Vite. Make sure you have Node.js v16+ installed.

3. **Configure environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   OPENAI_API_KEY=your-openai-api-key-here
   NODE_ENV=development
   ```
   
   Note: The AI Assistant will work with mock responses if `OPENAI_API_KEY` is not provided.

### Running the Application

1. **Start the backend server:**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000`

2. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will be available at `http://localhost:8080` (Vite dev server with hot reload)

### Default Admin Account

- **Email**: `admin@campus.edu`
- **Password**: `admin123`

## 📋 Features

### 1. User Role Management
- User registration and authentication
- Role-based access control (Admin, Faculty, Student, Staff, Maintenance)
- JWT token-based authentication
- User profile management

### 2. Booking System
- Book campus resources (rooms, equipment, facilities)
- View booking history
- Conflict detection for time slots
- Status management (pending, approved, rejected, completed)
- Admin/Staff can approve/reject bookings

### 3. Events and Scheduling
- Create and manage campus events
- View all public events
- Event details (title, description, location, time, category)
- Event organization and management

### 4. Maintenance Requests
- Submit maintenance requests
- Priority levels (low, medium, high, urgent)
- Status tracking (pending, in_progress, completed, cancelled)
- Assignment to maintenance staff
- Admin/Maintenance staff can manage all requests

### 5. AI Campus Assistant
- Chat-based AI assistant
- Help with bookings, events, maintenance
- Sustainability information
- OpenAI integration with mock fallback

## 🔐 Role-Based Access Control

- **Admin**: Full access to all features
- **Faculty**: Can create bookings, events, and maintenance requests
- **Student**: Can create bookings, events, and maintenance requests
- **Staff**: Can manage bookings and view all requests
- **Maintenance**: Can view and manage maintenance requests

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID

### Bookings
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id/status` - Update booking status (admin/staff)
- `DELETE /api/bookings/:id` - Delete booking

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Maintenance
- `GET /api/maintenance` - Get all maintenance requests
- `GET /api/maintenance/:id` - Get request by ID
- `POST /api/maintenance` - Create new request
- `PATCH /api/maintenance/:id/status` - Update request status
- `PATCH /api/maintenance/:id/assign` - Assign request to staff
- `PUT /api/maintenance/:id` - Update request

### AI Assistant
- `POST /api/assistant/chat` - Send message to AI assistant

## 🧪 Development

### Build for Production

**Backend:**
```bash
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```

## 📝 Notes

- The database (SQLite) is automatically created on first run
- All passwords are hashed using bcrypt
- JWT tokens expire after 7 days (configurable)
- CORS is enabled for development
- The AI Assistant uses mock responses if OpenAI API key is not configured

## 🤝 Contributing

This is a project for Intro to Software course. Follow clean code practices and maintain the modular architecture.

## 📄 License

ISC
