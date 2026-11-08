import sqlite3
import os
from datetime import datetime
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'expenses.db')
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('debit', 'credit')),
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            payment_method TEXT DEFAULT 'Cash',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

    # Check if empty, seed default data if empty
    cursor.execute('SELECT COUNT(*) as count FROM transactions')
    count = cursor.fetchone()['count']
    if count == 0:
        seed_default_data(conn)
    conn.close()

def seed_default_data(conn):
    sample_records = [
        ("Monthly Tech Salary", 4200.00, "credit", "Salary", "2026-09-01", "Bank Transfer", "Direct deposit regular payroll"),
        ("Freelance Web Design", 850.00, "credit", "Freelance", "2026-09-05", "UPI / Digital Wallet", "UI revamp client project"),
        ("Apartment Rent", 1250.00, "debit", "Housing", "2026-09-02", "Bank Transfer", "September rent"),
        ("Organic Grocery Haul", 142.50, "debit", "Food & Dining", "2026-09-04", "Credit Card", "Whole foods & pantry restock"),
        ("Stock Dividends", 215.30, "credit", "Investment", "2026-09-08", "Bank Transfer", "Q3 Index fund yield"),
        ("High-speed Fiber Internet", 65.00, "debit", "Utilities", "2026-09-09", "Debit Card", "Monthly fiber subscription"),
        ("Boutique Coffee & Pastries", 24.50, "debit", "Food & Dining", "2026-09-12", "UPI / Digital Wallet", "Cafe study session"),
        ("Noise Cancelling Headphones", 279.00, "debit", "Electronics", "2026-09-15", "Credit Card", "Sony WH-1000XM5"),
        ("Gym Membership", 55.00, "debit", "Healthcare & Fitness", "2026-09-16", "Debit Card", "Monthly fitness center"),
        ("Consulting Bonus", 600.00, "credit", "Freelance", "2026-09-18", "Bank Transfer", "Architecture advisory"),
        ("Subway & Rideshare Pass", 78.00, "debit", "Transportation", "2026-09-20", "Credit Card", "City commute travel"),
        ("Streaming Subscriptions", 32.98, "debit", "Entertainment", "2026-09-22", "Credit Card", "Netflix & Spotify family"),
        ("Dinner with Friends", 115.40, "debit", "Food & Dining", "2026-09-25", "Credit Card", "Italian bistro dinner"),
        ("Sell Old Monitor", 120.00, "credit", "Other Income", "2026-09-27", "Cash", "Sold 27-inch secondary screen"),
        ("Weekly Groceries", 98.20, "debit", "Food & Dining", "2026-09-29", "Debit Card", "Produce and essentials")
    ]
    cursor = conn.cursor()
    cursor.executemany('''
        INSERT INTO transactions (title, amount, type, category, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', sample_records)
    conn.commit()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "expense-tracker-api"})

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    t_type = request.args.get('type')
    category = request.args.get('category')
    search = request.args.get('search')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    sort_by = request.args.get('sort_by', 'date')
    sort_order = request.args.get('sort_order', 'desc').upper()

    if sort_by not in ['date', 'amount', 'title']:
        sort_by = 'date'
    if sort_order not in ['ASC', 'DESC']:
        sort_order = 'DESC'

    query = 'SELECT * FROM transactions WHERE 1=1'
    params = []

    if t_type and t_type.lower() in ['debit', 'credit']:
        query += ' AND type = ?'
        params.append(t_type.lower())

    if category and category.lower() != 'all':
        query += ' AND category = ?'
        params.append(category)

    if search:
        query += ' AND (title LIKE ? OR notes LIKE ? OR category LIKE ?)'
        like_term = f'%{search}%'
        params.extend([like_term, like_term, like_term])

    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)

    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)

    query += f' ORDER BY {sort_by} {sort_order}, id DESC'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    transactions = [dict(row) for row in rows]
    conn.close()

    return jsonify(transactions)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    try:
        amount = float(data.get('amount', 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    t_type = data.get('type', '').lower()
    category = (data.get('category') or 'Other').strip()
    date_str = (data.get('date') or datetime.now().strftime('%Y-%m-%d')).strip()
    payment_method = (data.get('payment_method') or 'Cash').strip()
    notes = (data.get('notes') or '').strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than 0"}), 400
    if t_type not in ['debit', 'credit']:
        return jsonify({"error": "Type must be 'debit' or 'credit'"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transactions (title, amount, type, category, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title, amount, t_type, category, date_str, payment_method, notes))
    conn.commit()
    new_id = cursor.lastrowid

    cursor.execute('SELECT * FROM transactions WHERE id = ?', (new_id,))
    item = dict(cursor.fetchone())
    conn.close()

    return jsonify(item), 201

@app.route('/api/transactions/<int:t_id>', methods=['PUT'])
def update_transaction(t_id):
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    try:
        amount = float(data.get('amount', 0))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400

    t_type = data.get('type', '').lower()
    category = (data.get('category') or 'Other').strip()
    date_str = (data.get('date') or datetime.now().strftime('%Y-%m-%d')).strip()
    payment_method = (data.get('payment_method') or 'Cash').strip()
    notes = (data.get('notes') or '').strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than 0"}), 400
    if t_type not in ['debit', 'credit']:
        return jsonify({"error": "Type must be 'debit' or 'credit'"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM transactions WHERE id = ?', (t_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Transaction not found"}), 404

    cursor.execute('''
        UPDATE transactions
        SET title = ?, amount = ?, type = ?, category = ?, date = ?, payment_method = ?, notes = ?
        WHERE id = ?
    ''', (title, amount, t_type, category, date_str, payment_method, notes, t_id))
    conn.commit()

    cursor.execute('SELECT * FROM transactions WHERE id = ?', (t_id,))
    item = dict(cursor.fetchone())
    conn.close()

    return jsonify(item)

@app.route('/api/transactions/<int:t_id>', methods=['DELETE'])
def delete_transaction(t_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM transactions WHERE id = ?', (t_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Transaction not found"}), 404

    cursor.execute('DELETE FROM transactions WHERE id = ?', (t_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": f"Transaction {t_id} deleted"})

@app.route('/api/summary', methods=['GET'])
def get_summary():
    conn = get_db()
    cursor = conn.cursor()

    # Total Credit
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = 'credit'")
    credit_res = cursor.fetchone()
    total_credit = round(float(credit_res['total']), 2)
    credit_count = credit_res['count']

    # Total Debit
    cursor.execute("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type = 'debit'")
    debit_res = cursor.fetchone()
    total_debit = round(float(debit_res['total']), 2)
    debit_count = debit_res['count']

    net_balance = round(total_credit - total_debit, 2)
    savings_rate = round(((total_credit - total_debit) / total_credit * 100), 1) if total_credit > 0 else 0

    # Category breakdown for debits (expenses)
    cursor.execute('''
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE type = 'debit'
        GROUP BY category
        ORDER BY total DESC
    ''')
    debit_categories = [
        {
            "category": row['category'],
            "total": round(float(row['total']), 2),
            "count": row['count'],
            "percentage": round((float(row['total']) / total_debit * 100), 1) if total_debit > 0 else 0
        }
        for row in cursor.fetchall()
    ]

    # Category breakdown for credits (income)
    cursor.execute('''
        SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
        FROM transactions
        WHERE type = 'credit'
        GROUP BY category
        ORDER BY total DESC
    ''')
    credit_categories = [
        {
            "category": row['category'],
            "total": round(float(row['total']), 2),
            "count": row['count'],
            "percentage": round((float(row['total']) / total_credit * 100), 1) if total_credit > 0 else 0
        }
        for row in cursor.fetchall()
    ]

    # Monthly breakdown (last 6 months with format YYYY-MM)
    cursor.execute('''
        SELECT 
            substr(date, 1, 7) as month,
            SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credit,
            SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debit
        FROM transactions
        GROUP BY substr(date, 1, 7)
        ORDER BY month ASC
    ''')
    monthly_trend = [
        {
            "month": row['month'],
            "credit": round(float(row['total_credit']), 2),
            "debit": round(float(row['total_debit']), 2),
            "net": round(float(row['total_credit']) - float(row['total_debit']), 2)
        }
        for row in cursor.fetchall()
    ]

    conn.close()

    return jsonify({
        "total_credit": total_credit,
        "total_debit": total_debit,
        "net_balance": net_balance,
        "savings_rate": savings_rate,
        "total_transactions": credit_count + debit_count,
        "credit_count": credit_count,
        "debit_count": debit_count,
        "debit_categories": debit_categories,
        "credit_categories": credit_categories,
        "monthly_trend": monthly_trend
    })

@app.route('/api/seed', methods=['POST'])
def seed_data():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions')
    seed_default_data(conn)
    conn.close()
    return jsonify({"success": True, "message": "Database reset and seeded with default transactions"})

@app.route('/api/clear', methods=['POST'])
def clear_data():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM transactions')
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "All transactions cleared"})

@app.route('/api/export', methods=['GET'])
def export_csv():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, type, category, amount, date, payment_method, notes, created_at FROM transactions ORDER BY date DESC, id DESC')
    rows = cursor.fetchall()
    conn.close()

    output = ["ID,Title,Type,Category,Amount,Date,Payment Method,Notes,Created At"]
    for row in rows:
        title = f'"{row["title"].replace(chr(34), chr(34)+chr(34))}"'
        notes = f'"{row["notes"].replace(chr(34), chr(34)+chr(34))}"'
        output.append(f'{row["id"]},{title},{row["type"]},{row["category"]},{row["amount"]},{row["date"]},{row["payment_method"]},{notes},{row["created_at"]}')

    csv_data = "\n".join(output)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=transactions_export.csv"}
    )
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({"message": "Expense Tracker API is running. Build frontend or run Vite dev server at http://localhost:3000"})

if __name__ == '__main__':
    init_db()
    print("Expense Tracker API running on http://127.0.0.1:5000")
    app.run(host='127.0.0.1', port=5000, debug=True)

