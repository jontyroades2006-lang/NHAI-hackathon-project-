import sqlite3
import shutil
import os


DATASET_DIR = "dataset"


def create_employee_table():

    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id  TEXT UNIQUE,
            name         TEXT
        )
        """
    )

    conn.commit()
    conn.close()


def employee_exists(employee_id):

    create_employee_table()

    conn   = sqlite3.connect("attendance.db")
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM employees WHERE employee_id = ?",
        (employee_id,)
    )

    record = cursor.fetchone()
    conn.close()

    return record is not None


def register_employee(name, employee_id, image_path):
    """
    Save employee to DB and copy face image into dataset/<name>/
    so that the face-recognition model can pick it up.
    """

    create_employee_table()

    if employee_exists(employee_id):
        return False, "Employee ID already registered"

    # Save face image to dataset folder (used by recognize_image)
    person_dir = os.path.join(DATASET_DIR, name)
    os.makedirs(person_dir, exist_ok=True)

    dest = os.path.join(person_dir, f"{employee_id}.jpg")
    shutil.copy(image_path, dest)

    conn   = sqlite3.connect("attendance.db")
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO employees (employee_id, name) VALUES (?, ?)",
        (employee_id, name)
    )

    conn.commit()
    conn.close()

    return True, f"{name} registered successfully"


def get_all_employees():

    create_employee_table()

    conn   = sqlite3.connect("attendance.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, employee_id, name FROM employees")
    rows = cursor.fetchall()
    conn.close()

    return [
        {"id": r[0], "employee_id": r[1], "name": r[2]}
        for r in rows
    ]
