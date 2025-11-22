import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'src/campus_management.db');
let db: sqlite3.Database | null = null;

export const getDb = (): sqlite3.Database => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
};

const run = (db: sqlite3.Database, sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const get = <T = any>(db: sqlite3.Database, sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const initializeDatabase = async (): Promise<void> => {
  const database = getDb();

  // --- USERS TABLE ---
  await run(database, `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // --- BOOKINGS TABLE ---
  await run(database, `
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource_type TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // --- EVENTS TABLE ---
  await run(database, `
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      organizer_id INTEGER NOT NULL,
      category TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  // Add status column if it doesn't exist (for existing databases)
  try {
    await run(database, `ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'pending'`);
    console.log('Added status column to events table');
  } catch (err: any) {
    // Column might already exist
    if (!err.message.includes('duplicate column')) {
      console.error('Error adding status column:', err);
    }
  }

  // --- MAINTENANCE REQUESTS TABLE ---
  await run(database, `
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  // --- DEFAULT USERS ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const maintenancePassword = await bcrypt.hash('m123123', 10);

  // Default Admin
  const existingAdmin = await get(database, 'SELECT id FROM users WHERE email = ?', ['admin@campus.edu']);
  if (!existingAdmin) {
    await run(database,
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@campus.edu', adminPassword, 'Admin User', 'admin']
    );
    console.log('Default admin user created: admin@campus.edu / admin123');
  }

  // Default Maintenance
  const existingMaintenance = await get(database, 'SELECT id FROM users WHERE email = ?', ['maintenance@campus.edu']);
  if (!existingMaintenance) {
    await run(database,
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['maintenance@campus.edu', maintenancePassword, 'Maintenance User', 'maintenance']
    );
    console.log('Default maintenance user created: maintenance@campus.edu / m123123');
  }

  console.log('Database tables initialized successfully');
};