import sqlite3

DB_NAME = "llmx.db"


def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(conn, table_name, column_name):
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        model TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Migration for older DBs that do not yet have updated_at
    if not _column_exists(conn, "sessions", "updated_at"):
        cursor.execute("ALTER TABLE sessions ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("""
            UPDATE sessions
            SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        """)

    conn.commit()
    conn.close()


def create_session(session_id, model="unknown", title="New Chat"):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO sessions
        (
            id,
            title,
            model,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (session_id, title, model)
    )
    conn.commit()
    conn.close()


def save_message(session_id, role, content):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO messages
        (
            session_id,
            role,
            content
        )
        VALUES (?, ?, ?)
        """,
        (session_id, role, content)
    )
    conn.execute(
        """
        UPDATE sessions
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (session_id,)
    )
    conn.commit()
    conn.close()


def load_messages(session_id):
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT role, content
        FROM messages
        WHERE session_id = ?
        ORDER BY id
        """,
        (session_id,)
    ).fetchall()
    conn.close()

    return [
        {
            "role": row["role"],
            "content": row["content"]
        }
        for row in rows
    ]


def get_session(session_id):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT *
        FROM sessions
        WHERE id = ?
        """,
        (session_id,)
    ).fetchone()
    conn.close()

    return dict(row) if row else None


def session_exists(session_id):
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id
        FROM sessions
        WHERE id = ?
        """,
        (session_id,)
    ).fetchone()
    conn.close()
    return row is not None


def list_sessions():
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT *
        FROM sessions
        ORDER BY updated_at DESC, created_at DESC
        """
    ).fetchall()
    conn.close()

    return [dict(row) for row in rows]


def delete_session(session_id):
    conn = get_connection()
    conn.execute(
        """
        DELETE FROM messages
        WHERE session_id = ?
        """,
        (session_id,)
    )
    conn.execute(
        """
        DELETE FROM sessions
        WHERE id = ?
        """,
        (session_id,)
    )
    conn.commit()
    conn.close()


def rename_session(session_id, title):
    conn = get_connection()
    conn.execute(
        """
        UPDATE sessions
        SET title = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (title, session_id)
    )
    conn.commit()
    conn.close()


def update_session_model(session_id, model):
    conn = get_connection()
    conn.execute(
        """
        UPDATE sessions
        SET model = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (model, session_id)
    )
    conn.commit()
    conn.close()