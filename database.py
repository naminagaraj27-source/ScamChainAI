import sqlite3
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_NAME = "scamchain.db"


def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            scan_type TEXT NOT NULL,
            content TEXT NOT NULL,
            score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            threat_type TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS scam_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def create_user(name, email, password):

    conn = get_db()

    try:

        conn.execute("""
            INSERT INTO users
            (name, email, password, created_at)
            VALUES (?, ?, ?, ?)
        """, (
            name,
            email,
            generate_password_hash(password),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()
        conn.close()

        return True, "Account created successfully."

    except sqlite3.IntegrityError:

        conn.close()

        return False, "Email already registered."


def login_user(email, password):

    conn = get_db()

    user = conn.execute("""
        SELECT *
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    conn.close()

    if user and check_password_hash(user["password"], password):

        return dict(user)

    return None


def save_scan(
    user_id,
    scan_type,
    content,
    score,
    risk_level,
    threat_type
):

    conn = get_db()

    conn.execute("""
        INSERT INTO scan_history
        (
            user_id,
            scan_type,
            content,
            score,
            risk_level,
            threat_type,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        scan_type,
        content,
        score,
        risk_level,
        threat_type,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()


def get_user_history(user_id):

    conn = get_db()

    rows = conn.execute("""
        SELECT *
        FROM scan_history
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user_id,)).fetchall()

    conn.close()

    return [dict(row) for row in rows]


def save_report(user_id, category, description):

    conn = get_db()

    conn.execute("""
        INSERT INTO scam_reports
        (
            user_id,
            category,
            description,
            created_at
        )
        VALUES (?, ?, ?, ?)
    """, (
        user_id,
        category,
        description,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()