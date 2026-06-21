from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL,
    config_json TEXT NOT NULL,
    hardware_json TEXT NOT NULL,
    ollama_version TEXT,
    summary_json TEXT
);
CREATE TABLE IF NOT EXISTS trials (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    model TEXT NOT NULL,
    mode TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    repetition INTEGER NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    metrics_json TEXT,
    response_text TEXT,
    error TEXT,
    artifact_dir TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_trials_session ON trials(session_id);
CREATE INDEX IF NOT EXISTS idx_trials_model ON trials(model);
"""


class BenchmarkStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def create_session(self, session: dict[str, Any]) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    session["id"], session["created_at"], None, "running",
                    json.dumps(session["config"]), json.dumps(session["hardware"]),
                    session.get("ollama_version"), None,
                ),
            )

    def save_trial(self, trial: dict[str, Any]) -> None:
        with self.connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO trials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    trial["id"], trial["session_id"], trial["model"], trial["mode"],
                    trial["prompt_id"], trial["repetition"], trial["status"],
                    trial["started_at"], trial.get("finished_at"),
                    json.dumps(trial.get("metrics", {})), trial.get("response"),
                    trial.get("error"), trial.get("artifact_dir"),
                ),
            )

    def finish_session(self, session_id: str, finished_at: str, status: str, summary: dict[str, Any]) -> None:
        with self.connect() as connection:
            connection.execute(
                "UPDATE sessions SET finished_at=?, status=?, summary_json=? WHERE id=?",
                (finished_at, status, json.dumps(summary), session_id),
            )

    def list_sessions(self, limit: int = 20) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                "SELECT id, created_at, finished_at, status, config_json, summary_json "
                "FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [self._session_row(row) for row in rows]

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
            if not row:
                return None
            trials = connection.execute(
                "SELECT * FROM trials WHERE session_id=? ORDER BY started_at", (session_id,)
            ).fetchall()
        session = self._session_row(row)
        session["hardware"] = json.loads(row["hardware_json"])
        session["ollama_version"] = row["ollama_version"]
        session["trials"] = [self._trial_row(item) for item in trials]
        return session

    @staticmethod
    def _session_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"], "created_at": row["created_at"],
            "finished_at": row["finished_at"], "status": row["status"],
            "config": json.loads(row["config_json"]),
            "summary": json.loads(row["summary_json"]) if row["summary_json"] else {},
        }

    @staticmethod
    def _trial_row(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"], "session_id": row["session_id"], "model": row["model"],
            "mode": row["mode"], "prompt_id": row["prompt_id"],
            "repetition": row["repetition"], "status": row["status"],
            "started_at": row["started_at"], "finished_at": row["finished_at"],
            "metrics": json.loads(row["metrics_json"] or "{}"),
            "response": row["response_text"], "error": row["error"],
            "artifact_dir": row["artifact_dir"],
        }
