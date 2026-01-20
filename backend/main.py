from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from db_new import engine, SessionLocal, Transaction, Base, get_db
from openai_helper import ask_openai
from datetime import date, datetime
import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create all tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="Ask Ledgerly API", version="2.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (serve frontend)
frontend_path = Path(__file__).parent.parent
try:
    if (frontend_path / "pages").exists():
        app.mount("/static", StaticFiles(directory=str(frontend_path / "pages")), name="static")
    if (frontend_path / "styles").exists():
        app.mount("/styles", StaticFiles(directory=str(frontend_path / "styles")), name="styles")
    if (frontend_path / "script").exists():
        app.mount("/script", StaticFiles(directory=str(frontend_path / "script")), name="script")
    if (frontend_path / "uploads").exists():
        app.mount("/uploads", StaticFiles(directory=str(frontend_path / "uploads")), name="uploads")
except Exception as e:
    print(f"Warning: Could not mount static files: {e}")


# Pydantic models
class AskRequest(BaseModel):
    question: str


class TransactionCreate(BaseModel):
    date: date
    amount: float
    gst_amount: float = 0
    payment_mode: str = "cash"
    description: str = ""


class TransactionResponse(BaseModel):
    id: int
    date: date
    amount: float
    gst_amount: float
    payment_mode: str
    description: str
    created_at: datetime

    model_config = {"from_attributes": True}


class QueryResponse(BaseModel):
    title: str
    value: float
    chart: str
    data: list = None
    sql: str = ""  # Include for debugging


def validate_sql(sql: str):
    """Prevent SQL injection by validating query"""
    forbidden_keywords = [
        "delete", "drop", "update", "insert", "alter", 
        "create", "truncate", "exec", "execute", "pragma",
        "vacuum", "attach", "detach"
    ]
    
    sql_lower = sql.lower().strip()
    
    # Check for forbidden keywords
    for keyword in forbidden_keywords:
        if keyword in sql_lower:
            raise HTTPException(
                status_code=400, 
                detail=f"SQL operation not allowed: {keyword}"
            )
    
    # Must start with SELECT
    if not sql_lower.startswith("select"):
        raise HTTPException(
            status_code=400, 
            detail="Only SELECT queries allowed"
        )


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "2.0.0"}


@app.post("/ask", response_model=QueryResponse)
def ask_question(req: AskRequest, db: Session = Depends(get_db)):
    """
    Main endpoint: Convert natural language question to SQL and execute it.
    
    Example requests:
    - "Aaj ka sale" (Today's sales)
    - "Kal ka galla" (Yesterday's sales)
    - "Payment mode wise breakdown"
    - "Total GST collected"
    """
    try:
        if not req.question or len(req.question.strip()) == 0:
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        # Get AI-generated SQL query
        ai_response = ask_openai(req.question)
        sql = ai_response.get("sql", "").strip()
        
        if not sql:
            raise HTTPException(status_code=400, detail="No SQL query generated")

        # Validate SQL for safety
        validate_sql(sql)

        # Execute query
        result = db.execute(text(sql)).fetchall()

        # Format response based on chart type
        chart_type = ai_response.get("chart", "none")
        
        if chart_type == "none":
            # Single value response
            value = float(result[0][0]) if result and len(result[0]) > 0 else 0
            data = None
        else:
            # Chart data (multiple rows with label and value)
            data = []
            for row in result:
                if len(row) >= 2:
                    data.append({
                        "label": str(row[0]),
                        "value": float(row[1]) if row[1] is not None else 0
                    })
            
            value = sum(item["value"] for item in data) if data else 0

        return QueryResponse(
            title=ai_response.get("title", "Query Result"),
            value=value,
            chart=chart_type,
            data=data,
            sql=sql  # Include for debugging
        )

    except HTTPException as e:
        raise e
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON from AI: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in /ask endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@app.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction"""
    try:
        db_transaction = Transaction(
            date=transaction.date,
            amount=transaction.amount,
            gst_amount=transaction.gst_amount,
            payment_mode=transaction.payment_mode,
            description=transaction.description
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(db: Session = Depends(get_db)):
    """Get all transactions"""
    transactions = db.query(Transaction).order_by(Transaction.date.desc()).all()
    return transactions


@app.get("/transactions/date/{transaction_date}", response_model=list[TransactionResponse])
def get_transactions_by_date(transaction_date: date, db: Session = Depends(get_db)):
    """Get transactions by date"""
    transactions = db.query(Transaction).filter(
        Transaction.date == transaction_date
    ).all()
    return transactions


@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Delete a transaction"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get overall statistics"""
    try:
        # Total transactions
        total_transactions = db.query(Transaction).count()
        
        # Today's sales
        today_sales = db.execute(
            text("SELECT SUM(amount) FROM transactions WHERE date = date('now')")
        ).scalar() or 0
        
        # Total GST
        total_gst = db.execute(
            text("SELECT SUM(gst_amount) FROM transactions")
        ).scalar() or 0
        
        # By payment mode
        payment_modes = db.execute(
            text("SELECT payment_mode, SUM(amount) as total FROM transactions GROUP BY payment_mode")
        ).fetchall()
        
        return {
            "total_transactions": total_transactions,
            "today_sales": float(today_sales),
            "total_gst": float(total_gst),
            "payment_modes": [
                {"mode": str(row[0]), "amount": float(row[1])}
                for row in payment_modes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Root endpoint - serve main page
@app.get("/")
async def root():
    """Redirect to dashboard"""
    return {"message": "Ask Ledgerly API v2.0 - Powered by OpenAI", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Ask Ledgerly API v2.0...")
    print("📚 API Docs available at http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
