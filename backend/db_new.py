from sqlalchemy import create_engine, Column, Integer, Float, String, Date, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

# Use SQLite database
DATABASE_URL = "sqlite:///./ledger.db"

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=True  # Set to False in production
)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    gst_amount = Column(Float, default=0)
    payment_mode = Column(String, default="cash")
    description = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Create all tables
Base.metadata.create_all(bind=engine)

print("Database initialized successfully!")


def get_db():
    """Dependency for FastAPI to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    # Run once to initialize database
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
