# 🧾 Ledgerly – AI-Powered Personal Finance Management

**Ledgerly** is an intelligent financial management platform that transforms how you track and understand your spending. Using OCR and AI, it automatically extracts transaction data from receipts and bills, categorizes expenses, and provides actionable insights to help you take control of your finances.

---

## 🎯 Problem Statement

Most people struggle to maintain accurate financial records. Manual expense tracking is tedious, error-prone, and time-consuming. Bills get lost, receipts pile up, and financial insights remain buried in spreadsheets.

**Ledgerly solves this** by automating receipt capture and intelligent expense categorization, turning chaotic paperwork into a clean, actionable financial dashboard.

---

## ✨ Key Features

- **📸 OCR-Powered Receipt Recognition**: Automatically extract vendor, amount, date, and items from bill images.
- **🤖 AI-Driven Categorization**: Smart expense categorization using Gemini AI.
- **📊 Real-Time Dashboard**: Visual spending overview with trends and patterns.
- **💡 Financial Insights**: AI-powered spending analysis and recommendations.
- **🔐 Secure Authentication**: User accounts with encrypted session management.
- **📱 Responsive Design**: Works on desktop and mobile devices.
- **⚡ Fast & Lightweight**: Pure HTML/CSS/JavaScript frontend + Python Flask backend.
- **🎙️ Voice Entry**: Add expenses via voice transcription (Hinglish support).
- **📅 Schedule Management**: Track business appointments and deadlines.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5 / CSS3 / JavaScript** – Clean, semantic markup with modern styling
- **No frameworks** – Fast load times, minimal dependencies
- **Responsive Design** – Mobile-first approach

### Backend
- **Python Flask** – Lightweight, scalable web framework
- **SQLite / PostgreSQL** – Persistent data storage
- **Tesseract OCR** – Receipt text extraction
- **Poppler** – PDF processing
- **OpenCV** – Image preprocessing for enhanced OCR accuracy
- **Google Gemini API** – AI-powered insights and data extraction
- **pdf2image** – PDF-to-image conversion

### Deployment
- **Render / Railway** – Backend hosting with persistent storage
- **Vercel** – Frontend static hosting (optional)
- **PostgreSQL** – Production database
- **S3 / Supabase Storage** – File storage for receipts

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip / conda
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ledgerly.git
   cd ledgerly
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Create a .env file in the backend/ folder
   LEDGERLY_SECRET_KEY=your_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   POPPLER_PATH=C:\Program Files\poppler\Library\bin
   FLASK_ENV=development
   ```

4. **Install system dependencies**
   - **Tesseract OCR**: [Download from here](https://github.com/UB-Mannheim/tesseract/wiki)
   - **Poppler**: [Download from here](https://github.com/oschwartz10612/poppler-windows/releases/)

5. **Initialize the database**
   ```bash
   cd backend
   python db.py  # Creates tables
   ```

6. **Run the backend**
   ```bash
   python app.py
   # Backend runs on http://localhost:5000
   ```

7. **Open in browser**
   - Navigate to `http://localhost:5000`
   - Demo credentials: `demo@ledgerly.in` / `Ledgerly@123`
   - Upload a receipt and watch the AI extract the data!

---

## �️ SQLite Database Setup

### Local Development (SQLite)

Ledgerly uses **SQLite** for local development. The database is automatically created on first run.

#### Initialize Database
```bash
cd backend
python db.py
```

This creates `ledgerly.db` with the following tables:

### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ledger entries (expenses/income)
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  entry_type TEXT NOT NULL,  -- 'income' or 'expense'
  amount REAL NOT NULL,
  note TEXT,
  vendor_name TEXT,
  vendor_gstin TEXT,
  bill_number TEXT,
  bill_date TEXT,
  taxable_amount REAL,
  cgst_amount REAL,
  sgst_amount REAL,
  igst_amount REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bills/Receipts
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  s3_key TEXT,
  s3_url TEXT,
  ocr_text TEXT,
  detected_amount REAL,
  vendor_name TEXT,
  bill_date TEXT,
  total_amount REAL,
  gst_amount REAL,
  items_json TEXT,
  status TEXT DEFAULT 'processing',  -- 'processing', 'done', 'error'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business Profiles
CREATE TABLE business_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  business_name TEXT,
  gstin TEXT,
  business_type TEXT,  -- 'retail', 'wholesale', 'services', 'other'
  address TEXT,
  phone TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  profile_completion_pct INTEGER DEFAULT 0,
  catalog_completion_pct INTEGER DEFAULT 0,
  inventory_completion_pct INTEGER DEFAULT 0,
  integrations_completion_pct INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Schedules
CREATE TABLE schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  schedule_date TEXT NOT NULL,
  schedule_time TEXT,
  schedule_type TEXT,  -- 'meeting', 'reminder', 'task', 'other'
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Connection Details

**Local (Development)**:
```python
# In backend/app.py
DATABASE_URL = "sqlite:///ledgerly.db"
```

**File Location**: `backend/ledgerly.db`

### Viewing Database Contents (SQLite)

Install SQLite browser (optional):
```bash
# Windows: Download from https://sqlitebrowser.org/
# macOS: brew install sqlitebrowser
# Linux: sudo apt install sqlitebrowser
```

Or use command line:
```bash
cd backend
sqlite3 ledgerly.db
sqlite> .tables  # List all tables
sqlite> SELECT * FROM users;  # Query users
sqlite> .quit
```

### Demo User

On app startup, a demo user is automatically created:
- **Email**: `demo@ledgerly.in`
- **Password**: `Ledgerly@123`

Find it in the database:
```bash
sqlite3 backend/ledgerly.db "SELECT id, username, email FROM users WHERE email='demo@ledgerly.in';"
```

### For Production (Render with PostgreSQL)

SQLite doesn't persist across Render restarts. Switch to PostgreSQL:

1. Add PostgreSQL in Render Dashboard
2. Copy `DATABASE_URL`
3. Update `backend/db.py` to use PostgreSQL instead
4. Migration script (optional):
   ```bash
   pip install alembic
   alembic init migrations
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

---

## �📁 Project Structure

```
ledgerly/
├── backend/
│   ├── app.py                 # Flask app factory & all route handlers
│   ├── db.py                  # Database connection & SQL utilities
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── ledgerly.db            # SQLite database (local dev)
│   └── uploads/
│       └── bills/             # Local receipt storage
│
├── pages/
│   ├── index.html             # Landing page
│   ├── login.html             # Authentication page
│   ├── dashboard.html         # Main expense & financial dashboard
│   ├── insights.html          # AI-powered analytics & insights
│   └── case-study.html        # Product showcase
│
├── script/
│   ├── app.js                 # Core frontend initialization
│   ├── login.js               # Authentication handlers
│   ├── dashboard.js           # Dashboard interactions & charts
│   ├── insights.js            # Insights page logic
│   ├── bill-upload.js         # Receipt upload & OCR handling
│   ├── voice-entry.js         # Voice input processing
│   ├── modal-handler.js       # Modal dialogs
│   ├── shop-settings.js       # Business profile settings
│   └── toasts.js              # Notification system
│
├── styles/
│   ├── styles.css             # Global styles
│   ├── index.css              # Landing page styles
│   ├── login.css              # Auth page styles
│   ├── dashboard.css          # Dashboard styles
│   └── insights.css           # Insights page styles
│
├── uploads/
│   └── bills/                 # Bill storage directory
│
├── vercel.json                # Vercel deployment config
├── docker-compose.yml         # Local Docker setup
├── Dockerfile                 # Backend containerization
└── README.md                  # This file
```

---

## 🔌 Core API Endpoints

### Authentication
- `POST /api/register` – Register a new user
- `POST /api/login` – User login
- `POST /api/logout` – User logout
- `GET /api/me` – Get current user profile

### Ledger Entries
- `GET /api/entries` – Fetch all user expenses/income
- `POST /api/entries` – Create a new ledger entry
- `GET /api/billing/snapshot` – Get financial summary (week/month)

### Bills & OCR
- `POST /api/bills/upload` – Upload and process a receipt image
- `GET /api/bills` – List all processed bills
- `GET /api/bills/<id>` – Retrieve extracted bill data

### Business Profile
- `GET /api/profile` – Get business profile
- `POST /api/profile` – Update business details (name, GSTIN, etc.)

### Voice & Schedule
- `POST /api/voice/process` – Process voice transcript into expense
- `GET /api/schedule` – Get weekly schedule
- `POST /api/schedule` – Add scheduled item
- `DELETE /api/schedule/<id>` – Delete scheduled item

---

## 🚢 Deployment on Render

**One-click deployment for the full-stack app (frontend + backend):**

### Step 1: Prepare Your Repository
1. Push your code to GitHub
2. Ensure `backend/requirements.txt` lists all Python dependencies

### Step 2: Create Render Web Service
1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Fill in the configuration:
   - **Name**: `ledgerly` (or your choice)
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:10000 backend.app:create_app()`
   - **Region**: Choose closest to your users
   - **Instance Type**: Starter (free tier) or higher

### Step 3: Set Environment Variables
In Render Dashboard → Environment:
```
LEDGERLY_SECRET_KEY=<generate_strong_random_32_char_string>
GEMINI_API_KEY=<your_google_gemini_api_key>
FLASK_ENV=production
TESSERACT_CMD=/usr/bin/tesseract
POPPLER_PATH=/usr/bin
```

### Step 4: Add PostgreSQL Database (Optional but Recommended)
1. In Render Dashboard → Create new **PostgreSQL**
2. Copy the connection string
3. Add to environment variables:
   ```
   DATABASE_URL=<auto_injected_postgres_url>
   ```

### Step 5: Add Persistent Disk (for Bill Uploads)
1. Render Dashboard → Disks → Add Disk
2. **Mount Path**: `/data`
3. **Size**: 1 GB (minimum)
4. Update `backend/app.py`:
   ```python
   BILLS_UPLOAD_DIR = Path("/data/uploads/bills")
   ```

### Step 6: Deploy
```bash
git push origin main
# Render auto-deploys on push
```

**Your app is live at**: `https://ledgerly-xxxxx.onrender.com`

---

### Post-Deployment
- Visit your deployed URL
- Test with demo credentials: `demo@ledgerly.in` / `Ledgerly@123`
- Upload a receipt to verify OCR works
- Monitor logs in Render Dashboard

### Important Notes
- **Cold starts**: Free tier may sleep after 15 mins; upgrade to Starter for always-on
- **File storage**: Use persistent disk for uploads; don't rely on `/tmp`
- **Database**: SQLite won't persist; use PostgreSQL for production
- **Tesseract/Poppler**: Render's Ubuntu base includes these; if missing, use build scripts

---

## 🧪 Testing the App

### Demo Account
- **Email**: `demo@ledgerly.in`
- **Password**: `Ledgerly@123`

### Test Workflows

1. **Receipt Upload & OCR**:
   - Upload a bill/receipt image
   - Watch OCR extract vendor, amount, date, items
   - AI categorizes the expense

2. **Voice Entry**:
   - Click "Add via Voice"
   - Speak: "5 kilo chawal 500 rupaye" or "spent 200 on coffee"
   - AI interprets and creates entry

3. **Dashboard**:
   - View spending breakdown by category
   - See trends over time
   - Check financial snapshot

4. **Insights**:
   - Review AI-generated spending recommendations
   - Analyze expense patterns

---

## 🔒 Security Features

- **Password Hashing**: Werkzeug PBKDF2 with salt
- **Session Management**: Flask secure cookies (14-day expiration)
- **Input Validation**: Server-side validation on all endpoints
- **CORS Protection**: Configured for production domains
- **SQL Injection Prevention**: Parameterized queries
- **Environment Secrets**: Sensitive data via `.env` (never hardcoded)

---

## 📊 How OCR & AI Works

### Receipt Processing Pipeline

```
1. User uploads bill image (PNG/JPG/PDF)
        ↓
2. Image preprocessing (OpenCV adaptive thresholding)
        ↓
3. Text extraction (Tesseract OCR)
        ↓
4. Gemini Vision API analysis
        ↓
5. Data extraction & validation (vendor, amount, GST, items)
        ↓
6. Store in database with confidence score
        ↓
7. Display on dashboard + auto-create ledger entry
```

### Example: Bill Processing

**Input**: Photo of restaurant bill

**Extracted** (via Gemini Vision):
```json
{
  "vendor_name": "Pizza Hut India",
  "vendor_gstin": "18ABCDE1234F1Z0",
  "bill_date": "2026-01-21",
  "items": [
    {
      "description": "Margherita Pizza Large",
      "hsn_code": "21069000",
      "quantity": 1,
      "rate": 450,
      "amount": 450
    }
  ],
  "subtotal": 450,
  "cgst_amount": 40.50,
  "sgst_amount": 40.50,
  "total_amount": 531,
  "confidence": 0.92
}
```

---

## 🎓 What You'll Learn

- ✅ **Full-stack development**: Frontend, backend, database
- ✅ **Computer Vision**: OCR, image preprocessing, PDF handling
- ✅ **AI Integration**: Prompt engineering, structured data extraction from LLMs
- ✅ **Database Design**: Relational schema, SQL optimization
- ✅ **API Design**: RESTful principles, error handling, authentication
- ✅ **Production Deployment**: Container orchestration, environment management
- ✅ **Security**: Password hashing, session management, input validation
- ✅ **UX/Responsive Design**: Mobile-first CSS, accessibility

---

## 📦 Dependencies

### Core Requirements
```
Flask==2.3.0
Werkzeug==2.3.0
python-dotenv==1.0.0
pytesseract==0.3.10
pdf2image==1.16.3
opencv-python==4.8.0.76
numpy==1.24.3
Pillow==10.0.0
google-generativeai==0.3.0
```

See `backend/requirements.txt` for full list.

---

## 🐛 Troubleshooting

### Tesseract Not Found
```
Solution: Set TESSERACT_CMD in .env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### Poppler Missing
```
Solution: Set POPPLER_PATH in .env
POPPLER_PATH=C:\Program Files\poppler\Library\bin
```

### Database Locked (SQLite)
```
Solution: Use PostgreSQL for production
DATABASE_URL=postgresql://user:pass@localhost/ledgerly
```

### Gemini API Errors
```
Solution: Verify GEMINI_API_KEY is set and has quota
Check: https://console.cloud.google.com/billing
```

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License – see the `LICENSE` file for details.

---

## 💬 Support

- **Report Issues**: [GitHub Issues](https://github.com/yourusername/ledgerly/issues)
- **Email**: support@ledgerly.in
- **Discord**: [Join our community](https://discord.gg/ledgerly)

---

## 🎉 Acknowledgments

- **Google Gemini API** – For intelligent data extraction
- **Tesseract OCR** – For reliable text recognition
- **Poppler** – For PDF processing
- **OpenCV** – For image preprocessing
- The open-source community ❤️

---

**Built with ❤️ for financial freedom**

**Live Demo**:  https://ledgerly-api-p6my.onrender.com/
**GitHub**: https://github.com/trisha0505/Corderz.git
**Demo video**: 


https://github.com/user-attachments/assets/dc8eba73-ae15-44cc-9112-e3768b363395


