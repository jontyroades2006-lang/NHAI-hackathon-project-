import * as SQLite from 'expo-sqlite';
import { DB_NAME } from '../utils/constants';
 
let db = null;
 
export const getDB = () => {
  if (!db) db = SQLite.openDatabase(DB_NAME);
  return db;
};
 
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      // Employees table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS employees (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT UNIQUE NOT NULL,
          name        TEXT NOT NULL,
          embedding   TEXT,
          created_at  TEXT DEFAULT (datetime('now','localtime'))
        );`
      );
      // Attendance table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS attendance (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          name        TEXT NOT NULL,
          timestamp   TEXT DEFAULT (datetime('now','localtime')),
          liveness    TEXT DEFAULT 'Verified',
          synced      INTEGER DEFAULT 0
        );`
      );
      // Face images table (stores base64 paths)
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS face_images (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          image_path  TEXT NOT NULL,
          created_at  TEXT DEFAULT (datetime('now','localtime'))
        );`
      );
    },
    err => { console.error('DB init error:', err); reject(err); },
    ()  => { console.log('DB initialised'); resolve(); }
    );
  });
};