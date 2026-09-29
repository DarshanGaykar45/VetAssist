# VetAssist — Cattle Artificial Insemination (AI) Clinic Management System

**VetAssist** is a veterinary clinic management system built exclusively for bovine / cattle healthcare and Artificial Insemination (AI) practitioners. It features an offline-first **React + Vite** Progressive Web Application (PWA) frontend, a secure **Node.js + Express.js** REST API backend, and permanent, persistent data storage using **Prisma ORM with SQLite** (PostgreSQL-ready).

---

## 🌟 Key Capabilities

* **Offline-First PWA Architecture**:
  * Service Worker (`sw.js`) for static App Shell caching and offline access.
  * Local **IndexedDB** storage mirroring clinic records for full functionality in rural, low-connectivity field areas.
  * **Outbox Queue & Sync Engine** (`syncEngine.js`): Automatic background synchronization with idempotent `clientId` deduplication and retry pacing when returning online.
  * Mobile-optimized responsive interface with bottom tab navigation, Floating Action Button (FAB), and Add to Home Screen banner.
* **Farmer-First Cattle Management**:
  * Farmer profiles with contact info, village location, and cattle counts.
  * Cattle identification records (ear tags, breed, lactation number, purpose).
* **Artificial Insemination Record Keeping**:
  * Digital recording of inseminations with semen straw batch / bull breed tracking.
  * Automatic sequential receipt generation (`AI-YYYY-XXXX`).
* **One-Tap WhatsApp Receipt Dispatch**:
  * Generates formatted WhatsApp receipts via `wa.me` deep links sent directly to the farmer's mobile number.
  * Includes clinic header, doctor details, cow count, straw code, and receipt number.
* **Single-Practitioner Secure Authentication**:
  * Strict single-doctor account model (public registration disabled).
  * Password hashing via `bcryptjs` (salt rounds: 12) with JWT session tokens.
  * Profile and credential management directly from Clinic Settings.
* **Real-Time Analytics & Reporting**:
  * Live dashboard metrics: total farmers, insemination trends, cattle served.
  * Daily summary reports, date-range filtering, and top farmer leaderboards.
* **Permanent Relational Storage**:
  * Persistent storage on disk (`backend/database/vetassist.db`).
  * Automated backup and restore scripts.

---

## 📁 Project Architecture

```
VetAssist/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma schema (User, Farmer, Cow, InseminationRecord, ClinicSetting)
│   │   └── seed.js              # Database seed script for doctor account & clinic settings
│   ├── database/
│   │   └── vetassist.db         # Persistent SQLite database file
│   ├── backups/                 # Timestamped database backups
│   ├── scripts/
│   │   ├── backup.js            # Automated database backup script
│   │   ├── restore.js           # Database restore script
│   │   ├── verify-offline-sync.js # Phase 7 offline-to-online sync verification
│   │   └── verify-all.js        # Comprehensive end-to-end verification
│   ├── src/
│   │   ├── config/              # Prisma client singleton
│   │   ├── controllers/         # Business logic (auth, farmers, inseminations, dashboard, reports, settings)
│   │   ├── middleware/          # JWT authentication, rate limiting, error handling
│   │   ├── routes/              # RESTful API route definitions
│   │   └── server.js            # Express application entry point (Port 5000)
│   ├── test-ai-clinic.js        # 26-point automated integration test suite
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA Web App Manifest
│   │   └── sw.js                # Service Worker for offline caching
│   ├── src/
│   │   ├── components/          # UI components (Navbar, Sidebar, Modal, Loader, MobileTabBar, etc.)
│   │   ├── context/             # AuthContext (JWT session state & offline persistence)
│   │   ├── db/                  # IndexedDB client (`indexedDb.js`)
│   │   ├── hooks/               # useAuth, useLiveQuery hooks
│   │   ├── pages/               # Home, Login, Dashboard, Patients (Farmers & Cattle), Inseminations, Reports, Settings
│   │   ├── services/            # API clients and offline Sync Engine (`syncEngine.js`)
│   │   └── styles/              # Design tokens and responsive styles
│   ├── vite.config.js           # Proxy configuration to http://localhost:5000
│   └── package.json
├── package.json                 # Root script runner for concurrent development
├── .gitignore                   # Excludes .env, *.db-journal, and node_modules
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
* Node.js v18+ (Tested on Node v24)
* npm v9+

### 1. Install Dependencies & Setup Database

From the root directory:

```powershell
# Install all dependencies across root, backend, and frontend
npm run install:all

# Generate Prisma client, push database schema, and seed default doctor account
npm run setup
```

### 2. Start Both Backend & Frontend

From the root directory:

```powershell
npm run dev
```

Or run them individually in separate terminals:

```powershell
# Terminal 1: Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Client (Port 5173)
cd frontend
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔑 Default Login Credentials

The system is configured with a default practitioner account:

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Bovine AI Practitioner** | `doctor@vetassist.com` | `Doctor@123` | Full access to clinic records, farmers, inseminations, reports, and settings |

*(Credentials can be updated at any time from the **Settings** page).*

---

## 🗄️ Database Management & Backups

### Active Database Location
* Persistent SQLite file: `backend/database/vetassist.db`

### Backup Database
To create a timestamped backup copy:
```powershell
cd backend
npm run db:backup
```
Backups are saved to `backend/backups/vetassist_backup_<timestamp>.db`.

### Restore Database
To restore the database from a backup file:
```powershell
cd backend
node scripts/restore.js <backup-filename-or-path>
```

---

## 🧪 Testing & Verification

The codebase includes comprehensive automated test suites:

### 1. Cattle AI Clinic Integration Suite (26 Tests)
```powershell
cd backend
node test-ai-clinic.js
```
Verifies health checks, disabled public registration, doctor authentication, farmer and cattle CRUD, insemination records, WhatsApp receipt links, dashboard metrics, reports, settings, and legacy endpoint 404 security.

### 2. Offline-to-Online Sync Verification
```powershell
cd backend
node scripts/verify-offline-sync.js
```
Verifies offline record creation, `farmerClientId` reference resolution, idempotent retry handling, 4xx error boundary handling, and burst queue processing.

### 3. Comprehensive End-to-End Suite
```powershell
cd backend
node scripts/verify-all.js
```
Verifies the full end-to-end workflow across all sections (Farmers, Inseminations, Settings, and in-place Credential updates).
