import { getDB } from './db';
 
export const markAttendance = (employeeId, name) => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      // Check if already marked today
      tx.executeSql(
        `SELECT id FROM attendance
         WHERE employee_id = ?
         AND DATE(timestamp) = DATE('now','localtime')`,
        [employeeId],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve({ status: 'already_marked', message: `${name} already marked today` });
            return;
          }
          tx.executeSql(
            `INSERT INTO attendance (employee_id, name, liveness)
             VALUES (?, ?, 'Verified')`,
            [employeeId, name],
            (_, result) => resolve({
              status:  'success',
              message: `Attendance marked for ${name}`,
              id:      result.insertId
            }),
            (_, err) => reject(err)
          );
        },
        (_, err) => reject(err)
      );
    });
  });
};
 
export const getAttendance = () => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM attendance ORDER BY timestamp DESC',
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err)      => reject(err)
      );
    });
  });
};
 
export const getTodayAttendance = () => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        `SELECT * FROM attendance
         WHERE DATE(timestamp) = DATE('now','localtime')
         ORDER BY timestamp DESC`,
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err)      => reject(err)
      );
    });
  });
};
 
export const getUnsyncedRecords = () => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM attendance WHERE synced = 0',
        [],
        (_, { rows }) => resolve(rows._array),
        (_, err)      => reject(err)
      );
    });
  });
};
 
export const markSynced = (ids) => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE attendance SET synced = 1 WHERE id IN (${ids.join(',')})`,
        [],
        (_, result) => resolve(result),
        (_, err)    => reject(err)
      );
    });
  });
};
 
export const purgeSyncedRecords = () => {
  return new Promise((resolve, reject) => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM attendance WHERE synced = 1',
        [],
        (_, result) => resolve(result),
        (_, err)    => reject(err)
      );
    });
  });
};