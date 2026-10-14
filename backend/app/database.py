from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "dinezy.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db_columns():
    """Ensure orders table has Razorpay and payment status columns in SQLite"""
    try:
        import sqlite3
        if "sqlite" in DATABASE_URL:
            db_file = str(DEFAULT_DB_PATH)
            conn = sqlite3.connect(db_file)
            cur = conn.cursor()
            tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            if "orders" in tables:
                cols = [r[1] for r in cur.execute("PRAGMA table_info(orders)").fetchall()]
                needed = [
                    ("order_status", "VARCHAR(50) DEFAULT 'PENDING_PAYMENT'"),
                    ("payment_status", "VARCHAR(50) DEFAULT 'PENDING'"),
                    ("razorpay_order_id", "VARCHAR(100)"),
                    ("razorpay_payment_id", "VARCHAR(100)"),
                    ("razorpay_signature", "VARCHAR(255)"),
                    ("payment_link_url", "TEXT"),
                    ("currency", "VARCHAR(10) DEFAULT 'INR'"),
                ]
                for col_name, col_def in needed:
                    if col_name not in cols:
                        cur.execute(f"ALTER TABLE orders ADD COLUMN {col_name} {col_def}")
                # Backfill existing legacy orders
                cur.execute("UPDATE orders SET payment_status = 'PAID' WHERE payment_status = 'PENDING' AND status != 'PENDING_PAYMENT'")
                cur.execute("UPDATE orders SET order_status = status WHERE order_status IS NULL OR order_status = 'PENDING_PAYMENT'")
                cur.execute("UPDATE orders SET currency = 'INR' WHERE currency IS NULL")
                conn.commit()
            conn.close()
    except Exception as e:
        print(f"[DB Migration Warning] Could not alter table: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

