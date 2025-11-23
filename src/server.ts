import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './database/init';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import bookingRoutes from './routes/booking.routes';
import eventRoutes from './routes/event.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import assistantRoutes from './routes/assistant.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: confirm where database will be created
console.log('Running from:', process.cwd());
console.log('Expecting database at:', path.resolve(process.cwd(), 'campus_management.db'));

// --- Middleware ---
app.use(cors({
  origin: true, // or "http://localhost:8080"
  allowedHeaders: ["Content-Type", "Authorization"], // <-- important
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/assistant', assistantRoutes);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Campus Management System API' });
});

// --- Initialize database, then start server ---
(async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();

export default app;
