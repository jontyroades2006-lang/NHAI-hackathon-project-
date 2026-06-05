import sqlite3
from datetime import datetime

def mark_attendance(name):

    conn = sqlite3.connect(
        "attendance.db"
    )

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

def get_connection():

    return sqlite3.connect(
        "attendance.db"
    )