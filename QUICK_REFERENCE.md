# 🎯 Ask Ledgerly v2.0 - Quick Reference

## ⚡ Quick Start

```bash
# 1. Navigate to project
cd "C:\Users\vidhy\Downloads\ledgerly-main (5)\ledgerly-main"

# 2. Activate environment
.\.venv\Scripts\activate.ps1

# 3. Start server
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Server**: http://localhost:8000  
**Docs**: http://localhost:8000/docs  
**Status**: ✅ RUNNING

---

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/stats` | Overall statistics |
| POST | `/ask` | AI-powered BI query |
| POST | `/transactions` | Create transaction |
| GET | `/transactions` | List all transactions |
| GET | `/transactions/date/{date}` | Get by date |
| DELETE | `/transactions/{id}` | Delete transaction |

---

## 💬 AI Query Commands

```json
POST /ask
{
  "question": "Aaj ka sale"
}
```

**Popular Queries:**
- "Today's sales" → `SELECT SUM(amount) WHERE date = today`
- "Payment breakdown" → Charts by payment mode
- "Weekly trend" → 7-day sales data
- "GST collected" → Total GST sum
- "Cash vs UPI" → Comparison by mode

---

## 📊 Response Format

**Single Value Response:**
```json
{
  "title": "Today's Sales",
  "value": 4500.0,
  "chart": "none",
  "data": null
}
```

**Chart Response:**
```json
{
  "title": "Sales by Payment Mode",
  "value": 17000.0,
  "chart": "bar",
  "data": [
    {"label": "cash", "value": 9000},
    {"label": "upi", "value": 5000},
    {"label": "card", "value": 3000}
  ]
}
```

---

## 🔧 Database Operations

```python
# Add transaction
POST /transactions
{
  "date": "2026-01-21",
  "amount": 1500,
  "gst_amount": 270,
  "payment_mode": "upi"
}

# View all
GET /transactions

# View today's
GET /transactions/date/2026-01-21

# Delete
DELETE /transactions/5
```

---

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Port 8000 in use | `taskkill /PID <PID> /F` |
| API key error | Check `.env` file has `OPENAI_API_KEY` |
| 429 quota error | Add credits to OpenAI account |
| Import errors | Run `pip install -r requirements.txt` |

---

## 📂 Project Structure

```
ledgerly-main/
├── backend/
│   ├── main.py              ← FastAPI server
│   ├── db_new.py            ← Database setup
│   ├── openai_helper.py     ← AI integration
│   ├── requirements.txt     ← Dependencies
│   ├── .env                 ← Config
│   └── ledger.db            ← SQLite database
├── pages/                   ← HTML files
├── styles/                  ← CSS files
├── script/                  ← JavaScript
└── uploads/                 ← Media
```

---

## 🔄 Port Configuration

- **Backend API**: 8000 (FastAPI)
- **Frontend**: 5000 (If still using Flask)
- **Database**: SQLite (local file)

---

## 🎬 Example Usage

### Python Client
```python
import requests

# Health check
r = requests.get('http://localhost:8000/health')
print(r.json())

# Ask AI
r = requests.post('http://localhost:8000/ask', 
  json={'question': 'Aaj ka sale'})
print(r.json())
```

### cURL
```bash
# Ask question
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Today sales"}'
```

### JavaScript
```javascript
const response = await fetch('http://localhost:8000/ask', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({question: 'Aaj ka sale'})
});
const result = await response.json();
console.log(result);
```

---

## 📋 Checklist

- [x] FastAPI backend setup
- [x] SQLAlchemy ORM configured
- [x] OpenAI integration ready
- [x] Test data seeded
- [x] API documentation generated
- [ ] Frontend updated (TO DO)
- [ ] Authentication added (OPTIONAL)
- [ ] Deployed to production (FUTURE)

---

## 🆘 Support

**Need Help?**
1. Check `/docs` endpoint for interactive API docs
2. Review `INTEGRATION_GUIDE.md` for detailed setup
3. Check server logs for error messages
4. Verify `.env` file has correct API key

---

**Last Updated**: 2026-01-21  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
