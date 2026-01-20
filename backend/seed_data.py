"""Seed the database with test data"""
from db_new import SessionLocal, Transaction
from datetime import date, timedelta

db = SessionLocal()

# Clear existing data
db.query(Transaction).delete()
db.commit()

# Add test transactions
test_transactions = [
    # Today's transactions
    Transaction(date=date.today(), amount=1500, gst_amount=270, payment_mode="cash", description="Grocery sale"),
    Transaction(date=date.today(), amount=2000, gst_amount=360, payment_mode="upi", description="Online sale"),
    Transaction(date=date.today(), amount=1200, gst_amount=216, payment_mode="card", description="Card payment"),
    
    # Yesterday's transactions  
    Transaction(date=date.today() - timedelta(days=1), amount=3000, gst_amount=540, payment_mode="cash", description="Store sale"),
    Transaction(date=date.today() - timedelta(days=1), amount=1500, gst_amount=270, payment_mode="upi", description="Online order"),
    
    # 2 days ago
    Transaction(date=date.today() - timedelta(days=2), amount=2500, gst_amount=450, payment_mode="cash", description="Retail sale"),
    Transaction(date=date.today() - timedelta(days=2), amount=1800, gst_amount=324, payment_mode="card", description="Credit sale"),
    
    # 7 days ago
    Transaction(date=date.today() - timedelta(days=7), amount=2000, gst_amount=360, payment_mode="cash", description="Weekly sale"),
    Transaction(date=date.today() - timedelta(days=7), amount=1500, gst_amount=270, payment_mode="upi", description="UPI payment"),
]

db.add_all(test_transactions)
db.commit()

print("✅ Database seeded with test data!")
print(f"Added {len(test_transactions)} transactions")

db.close()
