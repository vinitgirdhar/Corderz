from openai import OpenAI
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

client = OpenAI(api_key=api_key)

SYSTEM_PROMPT = """
You are a BI query generator for a ledger system. Your job is to convert natural language queries 
(in Hindi/English mixed) into SQL queries that analyze transaction data.

DATABASE SCHEMA:
- transactions(id INTEGER, date DATE, amount FLOAT, gst_amount FLOAT, payment_mode TEXT, description TEXT, created_at DATETIME, updated_at DATETIME)

COMMON USER QUERIES (Hindi/English):
- "Kal ka galla" → yesterday's total sales
- "Aaj kitna" → today's total sales
- "Aaj ka sales" → today's total sales
- "Cash me kitna" → cash payment totals
- "UPI se kitna" → UPI payment totals
- "GST kitna laga" → total GST collected
- "Last 7 days" → weekly trends
- "Payment mode wise breakdown" → sales by payment method
- "This month" → current month sales
- "Yesterday's transactions" → yesterday's transactions
- "Total revenue" → sum of all amounts

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
For single value responses:
{
  "sql": "SELECT SUM(amount) FROM transactions WHERE date = date('now')",
  "chart": "none",
  "title": "Today's Sales"
}

For chart/breakdown responses (multiple rows with labels):
{
  "sql": "SELECT payment_mode, SUM(amount) FROM transactions GROUP BY payment_mode",
  "chart": "bar",
  "title": "Sales by Payment Mode"
}

RULES:
1. Output ONLY valid JSON (no ```json blocks, no explanatory text before or after JSON)
2. Use SQLite date functions correctly:
   - date('now') = today
   - date('now', '-1 day') = yesterday
   - date('now', '-7 days') = 7 days ago
3. Chart types: "bar" (for categories), "pie" (for percentages), "line" (for time series), "none" (for single values)
4. For "kal" or "yesterday" use: WHERE date = date('now', '-1 day')
5. For "aaj" or "today" use: WHERE date = date('now')
6. For week/7 days use: WHERE date >= date('now', '-7 days')
7. For month use: WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
8. Always use SUM() for amounts, COUNT() for transaction counts
9. For breakdown queries, group by relevant column (payment_mode, date, etc)
10. Ensure queries are read-only and safe (SELECT only)
"""


def ask_openai(question: str) -> dict:
    """
    Convert natural language question to SQL query using OpenAI.
    
    Args:
        question: User's question in Hindi/English mix
        
    Returns:
        Dictionary with keys: sql, chart, title
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Fast and cost-effective
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question}
            ],
            temperature=0.1,  # Low temperature for consistent SQL generation
            response_format={"type": "json_object"},  # Forces JSON output
            max_tokens=500  # Limit response size
        )
        
        # Extract and parse the response
        response_text = response.choices[0].message.content
        ai_response = json.loads(response_text)
        
        return ai_response
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response from OpenAI: {str(e)}")
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


if __name__ == "__main__":
    # Test the OpenAI helper
    test_question = "Aaj ka sale"
    try:
        result = ask_openai(test_question)
        print(f"Question: {test_question}")
        print(f"Result: {json.dumps(result, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
