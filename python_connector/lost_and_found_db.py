"""
CampusFind — Skrip Konektor Python Sederhana untuk PostgreSQL (psycopg2)
Menyediakan koneksi langsung ke database PostgreSQL beserta operasi CRUD
untuk tabel users, items (Lost & Found), dan claims (Verifikasi Admin Middleman).
"""

import hashlib
import os
import secrets
from typing import Any, Optional

import psycopg2
from psycopg2.extras import RealDictCursor


def get_connection():
    """Membuka koneksi ke PostgreSQL menggunakan environment variables atau DATABASE_URL."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url, cursor_factory=RealDictCursor)

    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.getenv("PGDATABASE", "campus_lost_found"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", ""),
        cursor_factory=RealDictCursor,
    )


def hash_password(password: str) -> str:
    """Hash password menggunakan scrypt + salt acak (format kompatibel dengan server)."""
    salt = secrets.token_hex(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=16384,
        r=8,
        p=1,
        dklen=64,
    ).hex()
    return f"{salt}:{derived}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Memverifikasi password terhadap hash scrypt yang tersimpan di PostgreSQL."""
    parts = stored_hash.split(":")
    if len(parts) != 2:
        return False
    salt, expected_hex = parts
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt.encode("utf-8"),
        n=16384,
        r=8,
        p=1,
        dklen=64,
    ).hex()
    return secrets.compare_digest(derived, expected_hex)


# ==============================================================================
# 1. AUTHENTICATION & USERS (Pure PostgreSQL)
# ==============================================================================

def register_user(nim: str, email: str, full_name: str, password: str, role: str = "student") -> dict[str, Any]:
    sql = """
        INSERT INTO users (nim, email, full_name, password_hash, role)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, nim, email, full_name, role, created_at;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (nim.strip(), email.strip().lower(), full_name.strip(), hash_password(password), role))
        return dict(cur.fetchone())


def login_user(identifier: str, password: str) -> Optional[dict[str, Any]]:
    """Login menggunakan NIM atau Email kampus, lalu membuat baris sesi di tabel sessions."""
    sql = """
        SELECT id, nim, email, full_name, password_hash, role
        FROM users
        WHERE LOWER(email) = LOWER(%s) OR nim = %s
        LIMIT 1;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (identifier.strip(), identifier.strip()))
        user = cur.fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            return None

        raw_token = secrets.token_hex(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        cur.execute(
            """
            INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (%s, %s, NOW() + INTERVAL '7 days');
            """,
            (token_hash, user["id"]),
        )
        return {
            "id": user["id"],
            "nim": user["nim"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
            "session_token": raw_token,
        }


# ==============================================================================
# 2. CRUD LAPORAN BARANG (ITEMS)
# ==============================================================================

def create_item(
    reporter_id: int,
    report_type: str,
    title: str,
    category: str,
    location: str,
    event_time: str,
    description: str,
    secret_note: str,
    image_url: str = "",
) -> dict[str, Any]:
    sql = """
        INSERT INTO items (
            reporter_id, report_type, title, category, location,
            event_time, description, image_url, secret_note, status
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending_review')
        RETURNING *;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            sql,
            (reporter_id, report_type, title, category, location, event_time, description, image_url, secret_note),
        )
        return dict(cur.fetchone())


def list_verified_items(report_type: Optional[str] = None) -> list[dict[str, Any]]:
    """Mengambil daftar barang terverifikasi (tanpa membocorkan secret_note)."""
    base_sql = """
        SELECT i.id, i.report_type, i.title, i.category, i.location, i.event_time,
               i.description, i.image_url, i.status, i.created_at,
               u.full_name AS reporter_name
        FROM items i
        JOIN users u ON u.id = i.reporter_id
        WHERE i.status = 'verified'
    """
    params: list[Any] = []
    if report_type in ("found", "lost"):
        base_sql += " AND i.report_type = %s"
        params.append(report_type)
    base_sql += " ORDER BY i.created_at DESC;"

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(base_sql, params)
        return [dict(row) for row in cur.fetchall()]


def update_item(item_id: int, reporter_id: int, title: str, location: str, description: str) -> Optional[dict[str, Any]]:
    sql = """
        UPDATE items
        SET title = %s, location = %s, description = %s, updated_at = NOW()
        WHERE id = %s AND reporter_id = %s
        RETURNING *;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (title, location, description, item_id, reporter_id))
        row = cur.fetchone()
        return dict(row) if row else None


def delete_item(item_id: int, reporter_id: int) -> bool:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM items WHERE id = %s AND reporter_id = %s;", (item_id, reporter_id))
        return cur.rowcount > 0


# ==============================================================================
# 3. KLAIM KEPEMILIKAN & VERIFIKASI ADMIN MIDDLEMAN
# ==============================================================================

def submit_claim(
    item_id: int,
    claimant_id: int,
    claimant_nim: str,
    secret_answer: str,
    contact_info: str,
    ktm_image_url: str = "",
) -> dict[str, Any]:
    sql = """
        INSERT INTO claims (item_id, claimant_id, claimant_nim, secret_answer, ktm_image_url, contact_info)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (item_id, claimant_id, claimant_nim, secret_answer, ktm_image_url, contact_info))
        return dict(cur.fetchone())


def admin_verify_item(item_id: int, admin_id: int, decision: str, admin_note: str = "") -> Optional[dict[str, Any]]:
    """Admin middleman menyetujui ('verified') atau menolak ('rejected') laporan barang."""
    if decision not in ("verified", "rejected"):
        raise ValueError("Decision must be 'verified' or 'rejected'")
    sql = """
        UPDATE items
        SET status = %s, admin_note = %s, verified_by = %s, updated_at = NOW()
        WHERE id = %s
        RETURNING id, title, status, admin_note;
    """
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(sql, (decision, admin_note, admin_id, item_id))
        row = cur.fetchone()
        return dict(row) if row else None


def admin_verify_claim(claim_id: int, admin_id: int, approve: bool, admin_note: str = "") -> Optional[dict[str, Any]]:
    """Admin middleman memverifikasi klaim kepemilikan (membandingkan ciri rahasia + KTM/NIM)."""
    new_status = "approved" if approve else "rejected"
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE claims
            SET status = %s, admin_note = %s, reviewed_by = %s, reviewed_at = NOW()
            WHERE id = %s
            RETURNING id, item_id, status;
            """,
            (new_status, admin_note, admin_id, claim_id),
        )
        claim = cur.fetchone()
        if not claim:
            return None

        if approve:
            cur.execute(
                "UPDATE items SET status = 'claimed', updated_at = NOW() WHERE id = %s;",
                (claim["item_id"],),
            )
            cur.execute(
                """
                UPDATE claims
                SET status = 'rejected', admin_note = 'Barang sudah diserahkan ke pemilik terverifikasi.', reviewed_by = %s, reviewed_at = NOW()
                WHERE item_id = %s AND id <> %s AND status = 'pending';
                """,
                (admin_id, claim["item_id"], claim_id),
            )
        return dict(claim)


if __name__ == "__main__":
    print("CampusFind Python PostgreSQL Connector siap digunakan.")
    print("Pastikan PGHOST, PGPORT, PGDATABASE, PGUSER, dan PGPASSWORD sudah dikonfigurasi.")
    try:
        items = list_verified_items()
        print(f"Koneksi berhasil! Ditemukan {len(items)} barang terverifikasi di PostgreSQL:")
        for item in items:
            print(f" - [{item['report_type'].upper()}] {item['title']} @ {item['location']}")
    except Exception as exc:
        print(f"Gagal terhubung ke PostgreSQL lokal: {exc}")
