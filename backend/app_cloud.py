"""
Ledgerly Backend - Cloud Ready Version
Simplified for Render/Vercel deployment (no OCR/CV dependencies)
"""
from __future__ import annotations

import json
import os
import re
import uuid
from datetime import timedelta, datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from flask import Flask, jsonify, request, session, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from db import connect, default_db_path, init_db, query_one, query_all, exec_one

# Optional: Gemini API (won't crash if not available)
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
genai = None
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai_module
        genai_module.configure(api_key=GEMINI_API_KEY)
        genai = genai_module
    except ImportError:
        print("[ledgerly] google-generativeai not installed, AI features disabled")

# Frontend paths
FRONTEND_DIR = Path(__file__).parent.parent / "pages"
STYLES_DIR = Path(__file__).parent.parent / "styles"
SCRIPTS_DIR = Path(__file__).parent.parent / "script"

def create_app(db_path: str | None = None):
    """Application factory."""
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    
    app.secret_key = os.environ.get("LEDGERLY_SECRET_KEY", "dev-secret-change-me")
    app.permanent_session_lifetime = timedelta(days=7)

    # Database setup
    _db_path = db_path or os.environ.get("LEDGERLY_DB", default_db_path())
    init_db(_db_path)

    def get_conn():
        return connect(_db_path)

    # ============ AUTH HELPERS ============
    def require_login():
        user_id = session.get("user_id")
        return user_id

    # ============ SERVE FRONTEND ============
    @app.route("/")
    def home():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/<path:filename>.html")
    def serve_page(filename):
        return send_from_directory(FRONTEND_DIR, f"{filename}.html")

    @app.route("/styles/<path:filename>")
    def serve_styles(filename):
        return send_from_directory(STYLES_DIR, filename)

    @app.route("/script/<path:filename>")
    def serve_scripts(filename):
        return send_from_directory(SCRIPTS_DIR, filename)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

    # ============ AUTH ROUTES ============
    @app.post("/api/register")
    def api_register():
        data = request.get_json(force=True)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        shop_name = data.get("shop_name", "My Shop")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        with get_conn() as conn:
            existing = query_one(conn, "SELECT id FROM users WHERE email = ?", (email,))
            if existing:
                return jsonify({"error": "Email already registered"}), 409

            password_hash = generate_password_hash(password)
            exec_one(conn, 
                "INSERT INTO users (email, password_hash, shop_name) VALUES (?, ?, ?)",
                (email, password_hash, shop_name))
            conn.commit()

            user = query_one(conn, "SELECT id, email, shop_name FROM users WHERE email = ?", (email,))

        session.permanent = True
        session["user_id"] = user["id"]
        return jsonify({"ok": True, "user": dict(user)})

    @app.post("/api/login")
    def api_login():
        data = request.get_json(force=True)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        with get_conn() as conn:
            user = query_one(conn, "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?", (email,))

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        session.permanent = True
        session["user_id"] = user["id"]
        return jsonify({"ok": True, "user": {"id": user["id"], "email": user["email"], "shop_name": user["shop_name"]}})

    @app.post("/api/logout")
    def api_logout():
        session.clear()
        return jsonify({"ok": True})

    @app.get("/api/me")
    def api_me():
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "Not logged in"}), 401

        with get_conn() as conn:
            user = query_one(conn, "SELECT id, email, shop_name FROM users WHERE id = ?", (user_id,))

        if not user:
            session.clear()
            return jsonify({"error": "User not found"}), 404

        return jsonify({"ok": True, "user": dict(user)})

    # ============ TRANSACTIONS ============
    @app.get("/api/transactions")
    def api_list_transactions():
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "unauthorized"}), 401

        with get_conn() as conn:
            rows = query_all(conn,
                """SELECT id, date, description, amount, gst_amount, payment_mode, created_at
                   FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC""",
                (user_id,))

        return jsonify({"ok": True, "transactions": [dict(r) for r in rows]})

    @app.post("/api/transactions")
    def api_add_transaction():
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "unauthorized"}), 401

        data = request.get_json(force=True)
        date = data.get("date", datetime.now().strftime("%Y-%m-%d"))
        description = data.get("description", "")
        amount = float(data.get("amount", 0))
        gst_amount = float(data.get("gst_amount", 0))
        payment_mode = data.get("payment_mode", "cash")

        with get_conn() as conn:
            exec_one(conn,
                """INSERT INTO transactions (user_id, date, description, amount, gst_amount, payment_mode)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (user_id, date, description, amount, gst_amount, payment_mode))
            conn.commit()
            row = query_one(conn, "SELECT * FROM transactions WHERE id = last_insert_rowid()")

        return jsonify({"ok": True, "transaction": dict(row)})

    @app.delete("/api/transactions/<int:txn_id>")
    def api_delete_transaction(txn_id: int):
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "unauthorized"}), 401

        with get_conn() as conn:
            exec_one(conn, "DELETE FROM transactions WHERE id = ? AND user_id = ?", (txn_id, user_id))
            conn.commit()

        return jsonify({"ok": True})

    # ============ STATS/DASHBOARD ============
    @app.get("/api/stats")
    def api_stats():
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "unauthorized"}), 401

        today = datetime.now().strftime("%Y-%m-%d")

        with get_conn() as conn:
            # Today's sales
            today_row = query_one(conn,
                "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND date = ?",
                (user_id, today))
            
            # Total transactions
            total_row = query_one(conn,
                "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ?",
                (user_id,))
            
            # GST collected
            gst_row = query_one(conn,
                "SELECT COALESCE(SUM(gst_amount), 0) as total FROM transactions WHERE user_id = ?",
                (user_id,))

        return jsonify({
            "ok": True,
            "today_sales": today_row["total"] if today_row else 0,
            "total_transactions": total_row["count"] if total_row else 0,
            "total_revenue": total_row["total"] if total_row else 0,
            "total_gst": gst_row["total"] if gst_row else 0
        })

    # ============ AI CHAT (Gemini) ============
    @app.post("/api/ask")
    def api_ask():
        user_id = require_login()
        if not user_id:
            return jsonify({"error": "unauthorized"}), 401

        if not genai:
            return jsonify({"error": "AI not configured"}), 503

        data = request.get_json(force=True)
        question = data.get("question", "").strip()

        if not question:
            return jsonify({"error": "Question required"}), 400

        try:
            # Get user's transaction context
            with get_conn() as conn:
                rows = query_all(conn,
                    """SELECT date, description, amount, gst_amount, payment_mode 
                       FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 50""",
                    (user_id,))
            
            context = "User's recent transactions:\n"
            for r in rows:
                context += f"- {r['date']}: {r['description']} - ₹{r['amount']} ({r['payment_mode']})\n"

            prompt = f"""You are Ledgerly AI, a helpful assistant for small business owners in India.
            
{context}

User question: {question}

Provide a helpful, concise response. If asked about finances, use the transaction data above."""

            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            
            return jsonify({"ok": True, "answer": response.text})

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app


# For Gunicorn / Render
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
