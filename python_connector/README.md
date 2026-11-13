# CampusFind — Python PostgreSQL Connector

Folder ini berisi skrip Python sederhana menggunakan `psycopg2` yang terhubung langsung ke skema PostgreSQL yang sama dengan aplikasi web CampusFind (`users`, `sessions`, `items`, `claims`).

## Cara Menjalankan Secara Lokal

1. Pastikan PostgreSQL berjalan dan jalankan skema tabel:
   ```bash
   psql -U postgres -d campus_lost_found -f schema.sql
   ```
2. Pasang dependensi Python:
   ```bash
   pip install -r requirements.txt
   ```
3. Atur environment variables koneksi PostgreSQL:
   ```bash
   export PGHOST=localhost
   export PGPORT=5432
   export PGDATABASE=campus_lost_found
   export PGUSER=postgres
   export PGPASSWORD=password_anda
   ```
4. Jalankan skrip untuk menguji koneksi & membaca daftar barang:
   ```bash
   python3 lost_and_found_db.py
   ```
