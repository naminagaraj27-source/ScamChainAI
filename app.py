from flask import Flask, render_template, request, jsonify, session, Response
from google import genai
from werkzeug.security import generate_password_hash, check_password_hash

import os
import sqlite3
import re
import csv
import io

from urllib.parse import urlparse
from datetime import datetime


app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "scamchain-ai-secret-key-change-this"
)

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DB_NAME = os.path.join(
    BASE_DIR,
    "scamchain.db"
)


# =========================================================
# DATABASE
# =========================================================

def get_db():

    conn = sqlite3.connect(DB_NAME)

    conn.row_factory = sqlite3.Row

    return conn


def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            scan_type TEXT NOT NULL,
            content TEXT NOT NULL,
            score INTEGER NOT NULL,
            risk_level TEXT NOT NULL,
            threat_type TEXT NOT NULL,
            signals TEXT,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT,
            email TEXT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()

    conn.close()


init_db()


# =========================================================
# HELPER
# =========================================================

def current_time():

    return datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def get_json():

    return request.get_json(
        silent=True
    ) or {}


# =========================================================
# SCAM ANALYSIS
# =========================================================

def analyze_content(
    content,
    scan_type
):

    text = str(
        content or ""
    ).strip()

    lower = text.lower()

    score = 5

    signals = []


    urgent_words = [
        "urgent",
        "immediately",
        "act now",
        "last chance",
        "within 24 hours",
        "account will be blocked",
        "account suspended",
        "verify immediately"
    ]


    credential_words = [
        "otp",
        "password",
        "pin",
        "cvv",
        "card number",
        "login",
        "verify your account",
        "verification",
        "upi pin"
    ]


    payment_words = [
        "send money",
        "transfer money",
        "upi",
        "payment",
        "processing fee",
        "pay now",
        "deposit",
        "fee",
        "refund fee"
    ]


    reward_words = [
        "lottery",
        "winner",
        "won",
        "prize",
        "reward",
        "cashback",
        "gift"
    ]


    investment_words = [
        "investment",
        "double your money",
        "guaranteed returns",
        "guaranteed profit",
        "crypto profit",
        "trading profit"
    ]


    # -----------------------------------------------------
    # URGENCY
    # -----------------------------------------------------

    if any(
        word in lower
        for word in urgent_words
    ):

        score += 15

        signals.append(
            "Urgent or threatening language"
        )


    # -----------------------------------------------------
    # CREDENTIALS
    # -----------------------------------------------------

    credential_found = any(
        word in lower
        for word in credential_words
    )

    if credential_found:

        score += 25

        signals.append(
            "Requests sensitive account information"
        )


    # -----------------------------------------------------
    # PAYMENT
    # -----------------------------------------------------

    payment_found = any(
        word in lower
        for word in payment_words
    )

    if payment_found:

        score += 20

        signals.append(
            "Requests money or payment"
        )


    # -----------------------------------------------------
    # REWARD
    # -----------------------------------------------------

    reward_found = any(
        word in lower
        for word in reward_words
    )

    if reward_found:

        score += 18

        signals.append(
            "Unexpected prize or reward claim"
        )


    # -----------------------------------------------------
    # INVESTMENT
    # -----------------------------------------------------

    investment_found = any(
        word in lower
        for word in investment_words
    )

    if investment_found:

        score += 22

        signals.append(
            "Potential investment scam language"
        )


    # -----------------------------------------------------
    # URL
    # -----------------------------------------------------

    urls = re.findall(
        r"https?://[^\s]+",
        text
    )


    for url in urls:

        try:

            parsed = urlparse(url)

            host = (
                parsed.hostname or ""
            ).lower()


            if parsed.scheme.lower() == "http":

                score += 10

                signals.append(
                    "Website uses HTTP instead of HTTPS"
                )


            if re.match(
                r"^\d{1,3}(\.\d{1,3}){3}$",
                host
            ):

                score += 18

                signals.append(
                    "Link uses an IP address instead of a domain"
                )


            shorteners = [
                "bit.ly",
                "tinyurl.com",
                "t.co",
                "shorturl.at",
                "rb.gy"
            ]


            if host in shorteners:

                score += 18

                signals.append(
                    "Shortened URL detected"
                )


            suspicious_url_words = [
                "verify",
                "login",
                "secure",
                "update",
                "claim",
                "wallet",
                "payment",
                "bank"
            ]


            if any(
                word in parsed.path.lower()
                for word in suspicious_url_words
            ):

                score += 12

                signals.append(
                    "Suspicious words found in URL"
                )


        except Exception:

            score += 8

            signals.append(
                "Unable to validate the URL"
            )


    # -----------------------------------------------------
    # EMAIL
    # -----------------------------------------------------

    if scan_type == "email":

        if "dear customer" in lower:

            score += 5

            signals.append(
                "Generic greeting detected"
            )


        if "click here" in lower:

            score += 10

            signals.append(
                "Pressure to click a link"
            )


    # -----------------------------------------------------
    # PHONE
    # -----------------------------------------------------

    if scan_type == "phone":

        if re.search(
            r"\+?\d[\d\s-]{7,14}\d",
            text
        ):

            signals.append(
                "Phone number detected"
            )


        if credential_found:

            score += 15

            signals.append(
                "Sensitive information requested by phone"
            )


    # -----------------------------------------------------
    # PAYMENT TYPE
    # -----------------------------------------------------

    if scan_type == "payment":

        if "upi" in lower:

            score += 12

            signals.append(
                "UPI payment reference detected"
            )


        if credential_found:

            score += 15

            signals.append(
                "Payment request asks for sensitive credentials"
            )


    # Remove duplicates

    signals = list(
        dict.fromkeys(signals)
    )


    if not signals:

        signals.append(
            "No obvious scam indicators detected"
        )


    score = max(
        0,
        min(
            score,
            100
        )
    )


    # -----------------------------------------------------
    # RISK
    # -----------------------------------------------------

    if score >= 70:

        risk_level = "HIGH RISK"

        risk_class = "high"

        recommendations = [
            "Do not click suspicious links.",
            "Do not share OTP, PIN, CVV or passwords.",
            "Do not send money until independently verified.",
            "Contact the organization through a trusted official channel."
        ]


    elif score >= 35:

        risk_level = "SUSPICIOUS"

        risk_class = "medium"

        recommendations = [
            "Verify the sender before taking action.",
            "Do not share sensitive information.",
            "Check the website address carefully.",
            "Use official websites or apps."
        ]


    else:

        risk_level = "LOW RISK"

        risk_class = "low"

        recommendations = [
            "Continue to stay alert online.",
            "Verify important requests independently.",
            "Never share passwords or OTPs."
        ]


    # -----------------------------------------------------
    # THREAT TYPE
    # -----------------------------------------------------

    if investment_found:

        threat_type = "Investment Scam"


    elif reward_found:

        threat_type = "Lottery / Reward Scam"


    elif (
        "upi" in lower
        or payment_found
    ):

        threat_type = "UPI / Payment Scam"


    elif urls:

        threat_type = "Suspicious Link / Phishing"


    elif scan_type == "phone":

        threat_type = "Phone Scam"


    elif scan_type == "email":

        threat_type = "Email / Phishing Scam"


    else:

        threat_type = "Potential Scam"


    return {
        "score": score,
        "risk_level": risk_level,
        "risk_class": risk_class,
        "threat_type": threat_type,
        "signals": signals,
        "recommendations": recommendations
    }


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register_user():

    data = get_json()


    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    password = str(
        data.get(
            "password",
            ""
        )
    )


    if not name or not email or not password:

        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400


    if len(password) < 6:

        return jsonify({
            "success": False,
            "message": "Password must contain at least 6 characters."
        }), 400


    conn = get_db()


    try:

        conn.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password,
                created_at
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                name,
                email,
                generate_password_hash(password),
                current_time()
            )
        )


        conn.commit()


    except sqlite3.IntegrityError:

        conn.close()


        return jsonify({
            "success": False,
            "message": "Email already registered."
        }), 409


    conn.close()


    return jsonify({
        "success": True,
        "message": "Account created successfully."
    })


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login_user():

    data = get_json()


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    password = str(
        data.get(
            "password",
            ""
        )
    )


    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400


    conn = get_db()


    user = conn.execute(
        """
        SELECT *
        FROM users
        WHERE email = ?
        """,
        (
            email,
        )
    ).fetchone()


    conn.close()


    if not user:

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401


    if not check_password_hash(
        user["password"],
        password
    ):

        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401


    session["user_id"] = user["id"]

    session["user_name"] = user["name"]

    session["user_email"] = user["email"]


    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": {
            "name": user["name"],
            "email": user["email"]
        }
    })


# =========================================================
# CURRENT USER
# =========================================================

@app.route(
    "/api/me"
)
def current_user():

    if "user_id" not in session:

        return jsonify({
            "logged_in": False
        })


    return jsonify({
        "logged_in": True,
        "user": {
            "name": session.get(
                "user_name",
                ""
            ),
            "email": session.get(
                "user_email",
                ""
            )
        }
    })


# =========================================================
# LOGOUT
# =========================================================

@app.route(
    "/api/logout",
    methods=["POST"]
)
def logout_user():

    session.clear()


    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    })


# =========================================================
# ANALYZE
# =========================================================

@app.route(
    "/analyze",
    methods=["POST"]
)
def analyze():

    data = get_json()


    content = str(
        data.get(
            "content",
            data.get(
                "text",
                ""
            )
        )
    ).strip()


    scan_type = str(
        data.get(
            "scan_type",
            "message"
        )
    ).strip().lower()


    if not content:

        return jsonify({
            "success": False,
            "message": "Please enter something to analyze."
        }), 400


    result = analyze_content(
        content,
        scan_type
    )


    conn = get_db()


    conn.execute(
        """
        INSERT INTO scans
        (
            user_id,
            scan_type,
            content,
            score,
            risk_level,
            threat_type,
            signals,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session.get("user_id"),
            scan_type,
            content,
            result["score"],
            result["risk_level"],
            result["threat_type"],
            " | ".join(
                result["signals"]
            ),
            current_time()
        )
    )


    conn.commit()

    conn.close()


    return jsonify({
        "success": True,
        "result": result
    })


# =========================================================
# HISTORY
# =========================================================

@app.route(
    "/api/history"
)
@app.route(
    "/history"
)
def history():

    user_id = session.get(
        "user_id"
    )


    if user_id is None:

        return jsonify({
            "success": False,
            "message": "Please login to view history."
        }), 401


    conn = get_db()


    rows = conn.execute(
        """
        SELECT
            id,
            scan_type,
            content,
            score,
            risk_level,
            threat_type,
            created_at
        FROM scans
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 50
        """,
        (
            user_id,
        )
    ).fetchall()


    conn.close()


    history_data = []


    for row in rows:

        history_data.append({

            "id":
                row["id"],

            "scan_type":
                row["scan_type"],

            "content":
                row["content"],

            "score":
                row["score"],

            "risk_level":
                row["risk_level"],

            "threat_type":
                row["threat_type"],

            "created_at":
                row["created_at"]

        })


    return jsonify({

        "success": True,

        "history":
            history_data

    })


# =========================================================
# STATS
# =========================================================

@app.route(
    "/stats"
)
def stats():

    conn = get_db()


    total_scans = conn.execute(
        """
        SELECT COUNT(*)
        FROM scans
        """
    ).fetchone()[0]


    high_risk = conn.execute(
        """
        SELECT COUNT(*)
        FROM scans
        WHERE risk_level = 'HIGH RISK'
        """
    ).fetchone()[0]


    reports = conn.execute(
        """
        SELECT COUNT(*)
        FROM reports
        """
    ).fetchone()[0]


    conn.close()


    return jsonify({

        "success": True,

        "total_scans":
            total_scans,

        "threats_detected":
            high_risk,

        "reports":
            reports,

        "categories":
            8

    })


# =========================================================
# REPORT
# =========================================================

@app.route(
    "/report",
    methods=["POST"]
)
def report_scam():

    data = get_json()


    name = str(
        data.get(
            "name",
            ""
        )
    ).strip()


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip()


    category = str(
        data.get(
            "category",
            ""
        )
    ).strip()


    description = str(
        data.get(
            "description",
            ""
        )
    ).strip()


    if not category or not description:

        return jsonify({
            "success": False,
            "message": "Category and description are required."
        }), 400


    conn = get_db()


    conn.execute(
        """
        INSERT INTO reports
        (
            user_id,
            name,
            email,
            category,
            description,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            session.get("user_id"),
            name,
            email,
            category,
            description,
            current_time()
        )
    )


    conn.commit()

    conn.close()


    return jsonify({

        "success": True,

        "message":
            "Scam report submitted successfully."

    })


# =========================================================
# CSV
# =========================================================

@app.route(
    "/api/history.csv"
)
def history_csv():

    user_id = session.get(
        "user_id"
    )


    if user_id is None:

        return jsonify({

            "success": False,

            "message":
                "Please login first."

        }), 401


    conn = get_db()


    rows = conn.execute(
        """
        SELECT
            scan_type,
            content,
            score,
            risk_level,
            threat_type,
            created_at
        FROM scans
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (
            user_id,
        )
    ).fetchall()


    conn.close()


    output = io.StringIO()


    writer = csv.writer(
        output
    )


    writer.writerow([

        "Scan Type",

        "Content",

        "Risk Score",

        "Risk Level",

        "Threat Type",

        "Date"

    ])


    for row in rows:

        writer.writerow([

            row["scan_type"],

            row["content"],

            row["score"],

            row["risk_level"],

            row["threat_type"],

            row["created_at"]

        ])


    return Response(

        output.getvalue(),

        mimetype="text/csv",

        headers={

            "Content-Disposition":
                "attachment; filename=scamchain_history.csv"

        }

    )


# =========================================================
# GEMINI AI ASSISTANT
# =========================================================

LANGUAGES = {

    "en": "English",

    "ta": "Tamil",

    "hi": "Hindi",

    "te": "Telugu",

    "ml": "Malayalam",

    "kn": "Kannada"

}


GEMINI_MODELS = [

    "gemini-3.5-flash-lite",

    "gemini-3.1-flash-lite",

    "gemini-3.5-flash"

]


def ask_gemini(
    question,
    language
):

    api_key = os.getenv(
        "GEMINI_API_KEY",
        ""
    ).strip()


    if not api_key:

        raise RuntimeError(
            "GEMINI_API_KEY is not configured."
        )


    selected_language = LANGUAGES.get(
        language,
        "English"
    )


    prompt = f"""

You are ScamChain AI.

You are a multilingual AI assistant
for scam awareness and cyber safety.

The selected website language is:

{selected_language}

IMPORTANT:

Answer ONLY in {selected_language}.

Do NOT automatically switch to English.

Understand questions written in:

English
Tamil
Hindi
Telugu
Malayalam
Kannada
mixed languages

But always answer in:

{selected_language}

QUESTION RULE:

Answer the exact question asked.

Do not give unrelated information.

Use simple and clear language.

SCAM SAFETY:

You can explain:

Scam messages
Phishing
OTP scams
UPI scams
Banking scams
Fake job scams
Investment scams
Shopping scams
Social media scams
Suspicious links
Cyber safety

Never ask the user to provide:

OTP
PIN
CVV
Password
UPI PIN
Banking credentials
Card security information

USER QUESTION:

{question}

Now answer the exact question
in {selected_language} only.

"""


    client = genai.Client(
        api_key=api_key
    )


    last_error = None


    for model in GEMINI_MODELS:

        for attempt in range(2):

            try:

                response = client.models.generate_content(

                    model=model,

                    contents=prompt

                )


                answer = (
                    getattr(
                        response,
                        "text",
                        ""
                    )
                    or
                    ""
                ).strip()


                if answer:

                    return (
                        answer,
                        model
                    )


                last_error = (
                    f"{model}: empty response"
                )


            except Exception as error:

                last_error = (
                    f"{model}: {repr(error)}"
                )

                print(
                    "GEMINI ERROR:",
                    last_error
                )


    raise RuntimeError(
        last_error
        or
        "Gemini did not return an answer."
    )


# =========================================================
# AI API
# =========================================================

@app.route(
    "/api/assistant",
    methods=["POST"]
)
def ai_assistant():

    data = get_json()


    question = str(
        data.get(
            "question",
            ""
        )
    ).strip()


    language = str(
        data.get(
            "language",
            "en"
        )
    ).strip().lower()


    if language not in LANGUAGES:

        language = "en"


    if not question:

        return jsonify({

            "success": False,

            "error":
                "Please ask a question."

        }), 400


    try:

        answer, model = ask_gemini(

            question,

            language

        )


        return jsonify({

            "success": True,

            "answer":
                answer,

            "language":
                language,

            "language_name":
                LANGUAGES[language],

            "model":
                model

        })


    except Exception as error:

        print(
            "FINAL AI ERROR:",
            repr(error)
        )


        return jsonify({

            "success": False,

            "error":
                "AI service is temporarily busy. Please try again."

        }), 503


# =========================================================
# START
# =========================================================

if __name__ == "__main__":

    print("")
    print("=" * 55)
    print("       SCAMCHAIN AI")
    print("=" * 55)

    if os.getenv("GEMINI_API_KEY"):

        print(
            "GEMINI_API_KEY: SET"
        )

    else:

        print(
            "GEMINI_API_KEY: NOT SET"
        )

    print(
        "Website: http://127.0.0.1:5000"
    )

    print("=" * 55)
    print("")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )