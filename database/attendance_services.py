import sqlite3
from datetime import datetime


def create_table():

    conn = sqlite3.connect("attendance.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS attendance(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            timestamp TEXT,
            liveness TEXT
        )
        """
    )

    conn.commit()
    conn.close()


def attendance_exists(name):

    create_table()

    conn = sqlite3.connect("attendance.db")

    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT *
        FROM attendance
        WHERE name = ?
        AND DATE(timestamp)=DATE('now')
        """,
        (name,)
    )

    record = cursor.fetchone()

    conn.close()

    return record is not None


def mark_attendance(name):

    create_table()

    if attendance_exists(name):

        print(f"{name} already marked today")

        return

    conn = sqlite3.connect("attendance.db")

    cursor = conn.cursor()

    current_time = datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )

    cursor.execute(
        """
        INSERT INTO attendance
        (name,timestamp,liveness)
        VALUES(?,?,?)
        """,
        (
            name,
            current_time,
            "Verified"
        )
    )

    conn.commit()

    conn.close()

    print(
        f"Attendance Saved For {name}"
    )