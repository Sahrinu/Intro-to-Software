import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../campus_management.db');
let db: sqlite3.Database;

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

const run = (db: sqlite3.Database, sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const initializeDatabase = async (): Promise<void> => {
  const database = getDb();
  
  // Users table
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

  // Bookings table
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

  // Events table
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  // Maintenance requests table
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

  // Create default admin user if not exists
  const bcrypt = require('bcryptjs');
  const defaultPassword = await bcrypt.hash('admin123', 10);
  
  const existingAdmin = await new Promise<any>((resolve, reject) => {
    database.get('SELECT id FROM users WHERE email = ?', ['admin@campus.edu'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!existingAdmin) {
    await new Promise<void>((resolve, reject) => {
      database.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        ['admin@campus.edu', defaultPassword, 'Admin User', 'admin'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('Default admin user created (email: admin@campus.edu, password: admin123)');
  }

  console.log('Database tables created successfully');
};

