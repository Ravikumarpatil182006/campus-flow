"""CampusFlow local demo API using only the Python standard library.

This is a coursework prototype, not a production identity or records system.
Run with: python -m backend.main
"""

from __future__ import annotations

import json
import mimetypes
import os
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get("CAMPUSFLOW_DB", ROOT / "backend" / "campusflow.db"))
HOST = os.environ.get("CAMPUSFLOW_HOST", "127.0.0.1")
PORT = int(os.environ.get("CAMPUSFLOW_PORT", "8000"))

ROLES = [
    {"id": "student", "name": "Student", "scope": "My academic life"},
    {"id": "professor", "name": "Professor", "scope": "Teaching & advising"},
    {"id": "hod", "name": "HOD", "scope": "Department operations"},
    {"id": "dean", "name": "Dean", "scope": "School oversight"},
    {"id": "registrar", "name": "Registrar", "scope": "Academic records"},
    {"id": "vice_chancellor", "name": "Vice Chancellor", "scope": "Academic & administrative oversight"},
    {"id": "erp_manager", "name": "ERP Manager", "scope": "Platform operations"},
    {"id": "admin", "name": "Admin", "scope": "Campus operations"},
    {"id": "chancellor", "name": "Chancellor", "scope": "Institution leadership"},
]

SAMPLE_COURSES = [
    {"code": "CSE 301", "name": "Design & Analysis of Algorithms", "faculty": "Dr. Ananya Rao", "attendance": 91, "credits": 4},
    {"code": "CSE 312", "name": "Full Stack Development", "faculty": "Prof. Karthik Menon", "attendance": 84, "credits": 4},
    {"code": "MAT 205", "name": "Probability & Statistics", "faculty": "Dr. Neha Iyer", "attendance": 88, "credits": 3},
    {"code": "CSE 303", "name": "Database Management Systems", "faculty": "Prof. S. Prakash", "attendance": 79, "credits": 4},
]


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("""CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, details TEXT NOT NULL,
        status TEXT NOT NULL, role TEXT NOT NULL, created_at TEXT NOT NULL,
        extra TEXT NOT NULL DEFAULT '{}'
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL,
        category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
        date TEXT NOT NULL, audience TEXT NOT NULL DEFAULT 'all'
    )""")
    if db.execute("SELECT COUNT(*) FROM notices").fetchone()[0] == 0:
        samples = [
            ("Campus portal", "campus", "Centre for Wellness student support sessions", "Book an introductory appointment with the Student Wellness Centre.", "2026-10-28", "all"),
            ("LMS · CSE 312", "lms", "New Full Stack Development module available", "Module 4 notes and a REST API practice brief were added to the course space.", "2026-10-27", "student"),
            ("Examination office", "exams", "Semester 3 examination timetable published", "Review the draft timetable and syllabus information in the examination workspace.", "2026-10-26", "all"),
            ("Student life", "events", "DSU TechWeek registration is open", "Workshops, project showcases and build challenges run 12–14 November.", "2026-10-25", "all"),
            ("Placement cell", "career", "Graduate Software Intern drive", "Applications close 08 November. Review eligibility before applying.", "2026-10-24", "student"),
        ]
        db.executemany("INSERT INTO notices(source,category,title,body,date,audience) VALUES(?,?,?,?,?,?)", samples)
    db.commit()
    return db


def row_request(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "type": row["type"], "details": row["details"], "status": row["status"], "role": row["role"], "created_at": row["created_at"], "extra": json.loads(row["extra"])}


class Handler(BaseHTTPRequestHandler):
    server_version = "CampusFlowDemo/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"{self.address_string()} - {fmt % args}")

    def send_bytes(self, status: int, data: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: int, payload: object) -> None:
        self.send_bytes(status, json.dumps(payload).encode(), "application/json; charset=utf-8")

    def body_json(self) -> dict:
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 1_000_000)
            return json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return {}

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/health":
            return self.send_json(200, {"status": "ok", "service": "campusflow-demo-api"})
        if path == "/api/roles":
            return self.send_json(200, {"roles": ROLES})
        if path == "/api/courses":
            return self.send_json(200, {"courses": SAMPLE_COURSES})
        if path == "/api/notices":
            with connect() as db:
                rows = db.execute("SELECT * FROM notices ORDER BY date DESC").fetchall()
            return self.send_json(200, {"notices": [dict(row) for row in rows]})
        if path == "/api/requests":
            query = self.headers.get("X-Demo-Role", "student")
            with connect() as db:
                if query == "student":
                    rows = db.execute("SELECT * FROM requests WHERE role='student' ORDER BY created_at DESC").fetchall()
                else:
                    rows = db.execute("SELECT * FROM requests ORDER BY created_at DESC").fetchall()
            return self.send_json(200, {"requests": [row_request(row) for row in rows]})
        if path == "/" or path.startswith("/frontend/") or path in {"/app.js", "/styles.css"}:
            relative = "frontend/index.html" if path == "/" else (path.lstrip("/") if path.startswith("/frontend/") else f"frontend/{path.lstrip('/')}")
            target = (ROOT / relative).resolve()
            if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
                return self.send_json(404, {"error": "not found"})
            content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
            return self.send_bytes(200, target.read_bytes(), f"{content_type}; charset=utf-8")
        self.send_json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        payload = self.body_json()
        if path == "/api/requests":
            kind = str(payload.get("type", ""))[:80].strip()
            details = str(payload.get("details", ""))[:1000].strip()
            role = str(payload.get("role", "student"))
            if role not in {item["id"] for item in ROLES} or not kind or not details:
                return self.send_json(400, {"error": "type, details, and a valid demo role are required"})
            import secrets
            request_id = f"CF-{secrets.token_hex(3).upper()}"
            status = str(payload.get("status", "Received"))[:80]
            extra = payload.get("extra", {})
            if not isinstance(extra, dict):
                extra = {}
            with connect() as db:
                db.execute("INSERT INTO requests(id,type,details,status,role,created_at,extra) VALUES(?,?,?,?,?,?,?)", (request_id, kind, details, status, role, datetime.now(timezone.utc).isoformat(), json.dumps(extra)))
                db.commit()
                row = db.execute("SELECT * FROM requests WHERE id=?", (request_id,)).fetchone()
            return self.send_json(201, {"request": row_request(row)})
        self.send_json(404, {"error": "not found"})

    def do_PATCH(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        parts = path.strip("/").split("/")
        if len(parts) != 3 or parts[0:2] != ["api", "requests"]:
            return self.send_json(404, {"error": "not found"})
        payload = self.body_json()
        status = str(payload.get("status", ""))[:80].strip()
        if not status:
            return self.send_json(400, {"error": "status required"})
        with connect() as db:
            changed = db.execute("UPDATE requests SET status=? WHERE id=?", (status, parts[2])).rowcount
            db.commit()
            row = db.execute("SELECT * FROM requests WHERE id=?", (parts[2],)).fetchone()
        if not changed:
            return self.send_json(404, {"error": "request not found"})
        self.send_json(200, {"request": row_request(row)})


if __name__ == "__main__":
    connect().close()
    print(f"CampusFlow demo is ready at http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
