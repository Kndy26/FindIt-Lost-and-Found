# CampusFind — Campus Lost & Found & Middleman Verification

A clean, wireframe-first Campus Lost & Found web application built purely on **Cloud SQL (PostgreSQL)** for all data, accounts, roles, and sessions—featuring manual Register & Login, full CRUD item reporting, secret-trait + KTM/NIM ownership claims, a fast split-view Admin Middleman triage console, and a companion Python (`psycopg2`) PostgreSQL script.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Revised per your feedback: **Firebase Authentication has been completely removed.** User accounts, password hashes, roles, and active login sessions are stored and verified 100% in PostgreSQL.

- **Confirmed Decision 1 (Pure PostgreSQL Auth & Authorization)**: Manual **Register & Login** using Campus Email / NIM + Password. Passwords are salted and hashed with `scrypt` on the server and stored in the PostgreSQL `users` table; active login sessions are stored in a PostgreSQL `sessions` table and validated on every API request via `HttpOnly` cookie / Bearer token.
- **Confirmed Decision 2 (Language)**: Mixed Indonesian & English terminology (*campuran Indonesia dan istilah Inggris*) — clear Indonesian labels for forms and instructions paired with concise English operational terms (*Lost & Found*, *Catalog*, *Report Item*, *Admin Triage*).
- **Confirmed Decision 3 (Admin Verification Wireframe)**: **Split-View Fast Triage** — left-hand scannable queue of pending reports and ownership claims paired with a right-hand verification workspace featuring side-by-side evidence comparison and 1-click **Setujui** (Approve) / **Tolak** (Reject) actions.
- **Confirmed Decision 4 (Ownership Proof)**: **Secret Trait Form + KTM / NIM Accountability** — claimants submit hidden distinguishing details alongside their NIM (*Nomor Induk Mahasiswa*) and optional Student ID card (*KTM*) photo for strict admin verification.
- **Confirmed Decision 5 (Database & Python Integration)**: **Live Node/Express + Cloud SQL (PostgreSQL) Server** powering the web app, accompanied by a ready-to-run **Python (`psycopg2`) connector script** demonstrating direct PostgreSQL CRUD and user/item queries against the exact same tables.

---

### 1. Overview & Core Concept

- **What It Does**: Connects campus finders, owners who lost belongings, and an Admin Middleman through a unified PostgreSQL-backed workflow. Finders upload found-item details (photo, campus location, discovery time, public description, and confidential verification hint). Owners browse verified listings and submit accountability-backed ownership claims (NIM, KTM upload, and secret traits). The Admin Middleman verifies reports and claims before publication or handover.
- **Target Audience / Persona**:
  - **Student / Finder / Owner**: Registers manually with Name, NIM, Campus Email, and Password; can submit Found/Lost reports (full CRUD on own reports) and file ownership claims.
  - **Admin Middleman**: Logs in with an `admin` role account stored in PostgreSQL `users.role` and triages incoming reports and ownership claims via a fast split-view workspace.
- **Key Value**: Keeps 100% of relational entities—users, sessions, items, and verification claims—inside PostgreSQL with foreign-key integrity, while preventing fraudulent claims via hidden verification traits and NIM/KTM accountability.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Manual Register & Login (PostgreSQL)**:
     - User registers with `Full Name`, `NIM`, `Campus Email`, and `Password` (stored in PostgreSQL `users`).
     - User signs in via the manual Login form (Email or NIM + Password); server creates a session record in PostgreSQL `sessions`.
     - Includes quick-fill demo credentials on the Login screen (1 student account & 1 admin middleman account seeded in PostgreSQL) for immediate testing of both roles alongside fresh manual registration.
  2. **Public Catalog & Search**: Clean responsive grid listing **Verified** found/lost items, filterable by status (*Found* / *Lost*), category, campus location, and keyword search. Secret traits are strictly hidden from public catalog responses.
  3. **Report Item (CRUD)**: Authenticated form to create, edit, or delete a Found/Lost report with image upload (with preview), campus location, discovery date/time, public description, and confidential verification note. Newly submitted reports enter `pending_review` until approved by the Admin Middleman.
  4. **Submit Ownership Claim (KTM + Secret Trait)**: On any verified item detail view, a logged-in student submits a claim containing their pre-filled/verified NIM, secret identifying details, contact info, and optional KTM photo upload.
  5. **Admin Middleman Split-View Triage**:
     - *Left Pane*: Compact queue split into **Pending Reports** and **Pending Claims**, displaying thumbnail, item title, location, and tabular-numeral timestamps.
     - *Right Pane*: Instant verification card comparing the **Finder's Secret Note & Photo** side-by-side against the **Claimant's Secret Answer, NIM, and KTM Proof**, with an optional admin note and 1-click **Setujui** / **Tolak** buttons (collapses cleanly to a stacked master-detail view on mobile).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp, utilitarian wireframe clarity — flat structural surfaces, clear hairline boundaries, and zero decorative clutter.
  - *Color Palette & Mood (60-30-10)*:
    - `--background`: `#F8FAFC` / `#FFFFFF` (60% neutral canvas).
    - `--surface`: `#F1F5F9` with `#E2E8F0` 1px borders (30% structural dividers & panels).
    - `--primary` / `--accent`: Deep Slate `#0F172A` with Cobalt Blue `#2563EB` reserved strictly for active tabs and primary actions (10% accent).
    - Semantic states (always paired with explicit text labels): Green `#16A34A` (*Verified / Approved*), Amber `#D97706` (*Pending Review*), Crimson `#DC2626` (*Rejected*).
  - *Typography & Hierarchy*: `Plus Jakarta Sans` for crisp UI headings and navigation, `DM Sans` for compact readable body text (`14px`–`15px`), and `JetBrains Mono` (`tabular-nums`) for timestamps, NIMs, and ticket IDs.
  - *Component Styling & Layout*: Strict 3-zone top navigation bar (`CampusFind` — 4 single-line links: `Catalog`, `Report Item`, `My Reports`, `Admin Triage` — Account / Login action). Unboxed inline metadata with `·` separators; single-level flat elevation with `1px` borders.

- **Interactive Feedback & Motion**: Fast `150ms`–`200ms` transitions for queue selection, optimistic loading states on **Setujui** / **Tolak**, skeleton placeholders during PostgreSQL queries, helpful empty states with direct action buttons, and inline toast notifications.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: 100% PostgreSQL Authentication (`users` + `sessions`)**
  - *Chosen Approach*: Email/NIM + `scrypt` salted password hashing stored in `users`, paired with random cryptographic session tokens stored in `sessions` and sent via `HttpOnly` cookies.
  - *Why*: Aligns directly with your coursework and requirement to store all accounts, credentials, roles, and authorization state purely in PostgreSQL without external auth providers.
  - *Alternatives Considered*: External OAuth/Firebase Auth (rejected per your explicit instruction).

- **Decision 2: Admin Middleman Split-View Queue vs. Separate Modal Pages**
  - *Chosen Approach*: Persistent master-detail split-view on desktop (`~360px` queue + fluid inspection canvas) and single-tap drill-down on mobile.
  - *Why*: Eliminates repetitive modal open/close cycles so an admin can verify campus reports and compare secret traits against KTM/NIM records in seconds.
  - *Alternatives Considered*: Data table with popup modals (slower click path for consecutive verifications).

- **Decision 3: Live Node/Express Backend + Companion Python Script**
  - *Chosen Approach*: Express API backed by Cloud SQL PostgreSQL (Drizzle ORM + `pg` Pool) for live web execution, paired with a standalone Python (`psycopg2`) CLI/helper script connecting directly to the same PostgreSQL schema.
  - *Why*: Satisfies AI Studio's Node/Vite single-port web runtime while giving you clean, working Python PostgreSQL code (`create_item`, `list_items`, `verify_item`, `delete_item`, `get_user_by_nim`) ready to run against PostgreSQL.

---

### 4. Technical Architecture & Data Strategy

- **Architecture & Component Diagram**:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                        Browser Client (React + Tailwind)                  │
│  ┌─────────────┐   ┌───────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │ Manual Auth │   │ Public Feed & │   │ Report CRUD  │   │ Admin      │  │
│  │ (Login/Reg) │   │ Claim Drawer  │   │ & My Reports │   │ Split-View │  │
│  └──────┬──────┘   └───────┬───────┘   └──────┬───────┘   └─────┬──────┘  │
└─────────┼──────────────────┼──────────────────┼─────────────────┼─────────┘
          │                  │  HttpOnly Cookie │                 │
          │                  │  Session Token   │                 │
          ▼                  ▼                  ▼                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   Express API Server (Port 3000)                          │
│  ┌─────────────────────────┐       ┌───────────────────────────────────┐  │
│  │ PostgreSQL Session Auth │──────▶│ Role & Ownership Guard            │  │
│  │ (scrypt + sessions tbl) │       │ (student / admin RBAC from DB)    │  │
│  └─────────────────────────┘       └─────────────────┬─────────────────┘  │
│                                                      │                    │
│  ┌───────────────────────────────────────────────────▼─────────────────┐  │
│  │ Drizzle ORM Query Layer + pg Connection Pool (SQL_* Env Vars)       │  │
│  └───────────────────────────────────────────────────┬─────────────────┘  │
└──────────────────────────────────────────────────────┼────────────────────┘
                                                       │
                    ┌──────────────────────────────────┴──────────────────┐
                    ▼                                                     │
┌──────────────────────────────────────┐   ┌──────────────────────────────┴┐
│       Cloud SQL (PostgreSQL)         │◀──│ Standalone Python Connector   │
│  • users (id, nim, email, pass, role)│   │ (psycopg2 CRUD helper script) │
│  • sessions (token, user_id, exp)    │   └───────────────────────────────┘
│  • items (user_id, type, status...)  │
│  • claims (item_id, user_id, nim...) │
└──────────────────────────────────────┘
```

- **Data Model & State (PostgreSQL Relational Schema)**:
  - **`users`**: `id` (PK), `nim` (unique student/staff ID), `email` (unique), `fullName`, `passwordHash` (`salt:hash` via `scrypt`), `role` (`'student'` | `'admin'`), `createdAt`.
  - **`sessions`**: `id` (PK), `token` (unique SHA-256 hashed session token), `userId` (FK -> `users.id`, cascade delete), `expiresAt`, `createdAt`.
  - **`items`**: `id` (PK), `reporterId` (FK -> `users.id`), `reportType` (`'found'` | `'lost'`), `title`, `category`, `location`, `eventTime`, `description`, `imageUrl`, `secretNote` (hidden verification clue), `status` (`'pending_review'` | `'verified'` | `'claimed'` | `'rejected'`), `adminNote`, `createdAt`, `updatedAt`.
  - **`claims`**: `id` (PK), `itemId` (FK -> `items.id`, cascade delete), `claimantId` (FK -> `users.id`), `claimantNim`, `secretAnswer`, `ktmImageUrl`, `contactInfo`, `status` (`'pending'` | `'approved'` | `'rejected'`), `adminNote`, `reviewedBy` (FK -> `users.id`), `reviewedAt`, `createdAt`.

- **Interactive Component & State Mapping**:
  - **Auth Flow**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` validate credentials and manage `sessions` rows + `HttpOnly` cookies purely in PostgreSQL.
  - **Catalog View**: Fetches verified items via `GET /api/items`, supports live search + category/type tabs, opens the Claim Drawer on click.
  - **Report CRUD & My Reports**: Validates photo, campus location, time, title, and secret trait; submits `POST /api/items`, edits via `PATCH /api/items/:id`, and deletes via `DELETE /api/items/:id` (enforcing `reporterId === req.user.id` or `admin`).
  - **Claim Flow**: Submits `POST /api/items/:id/claims` with NIM, secret trait answer, contact info, and optional KTM image; tracked under **My Reports & Claims**.
  - **Admin Split-View Triage**: Protected by `requireAdmin` (checks `users.role === 'admin'` from PostgreSQL session); fetches `GET /api/admin/queue`, displays master queue on the left and side-by-side comparison on the right, and resolves via `PATCH /api/admin/items/:id/verify` or `PATCH /api/admin/claims/:id/verify`.

- **Key Sequences & Integrations**:
  - **Cloud SQL Provisioning & Schema Migration**: Provisioned via Cloud SQL for PostgreSQL, managed via Drizzle Kit schema migrations and seeded with sample campus items + student/admin test accounts.
  - **Python Simple Connector**: Included in the workspace as a clean, documented `psycopg2` script (`python_connector/lost_and_found_db.py` + `requirements.txt` + `README.md`) connecting via `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, and `SQL_PASSWORD` with complete CRUD functions matching the PostgreSQL tables.
