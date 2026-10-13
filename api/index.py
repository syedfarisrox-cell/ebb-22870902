"""
Ebb — Python backend (FastAPI)
==============================

This file is the "brain" of Ebb. The React frontend never talks to Supabase
directly. It only calls these /api/... routes, and this code talks to
Supabase on its behalf.

Why do it this way?
  * The Supabase URL and key live ONLY here, read from environment variables.
    They are never in the React code, so they can't be seen in the browser.
  * The safe-to-spend calculation happens here, on the server, so the number
    saved in the database is always worked out the same way.
  * Every request is checked: we ask Supabase "who owns this login token?"
    before reading or writing anything.

How data is kept private:
  * We use the low-privilege anon/publishable key, never the secret
    service-role key.
  * Every database call is sent WITH the user's own login token, so Supabase
    Row Level Security (RLS) only lets each person see and change their own
    rows. Even if this code had a bug, the database itself would refuse to
    hand over someone else's data.

Routes:
  GET    /api/health        – is the server up and configured?
  POST   /api/auth/signup   – create an account
  POST   /api/auth/login    – log in, get a session token
  POST   /api/auth/logout   – end the session
  GET    /api/budget        – load my saved bills
  PUT    /api/budget        – save (insert or update) my bills
  GET    /api/check-ins     – load my history
  POST   /api/check-ins     – calculate safe-to-spend AND save it
  DELETE /api/my-data       – "Wipe my data": delete all my rows

Deployed on Vercel as a Python serverless function. vercel.json sends every
/api/* request to this file.
"""

from __future__ import annotations

import os
from datetime import date
from typing import Any, Literal, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

# Local development only: read variables from a .env file if one exists.
# On Vercel, the variables come from Project Settings → Environment Variables.
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional
    pass


# ── Settings (read from environment variables, never hardcoded) ──────────────

def get_settings() -> tuple[str, str]:
    """Return (SUPABASE_URL, SUPABASE_ANON_KEY) or stop with a clear error."""
    url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="The server isn't connected to the database yet "
            "(SUPABASE_URL or SUPABASE_ANON_KEY is missing).",
        )
    return url, key


TIMEOUT = httpx.Timeout(10.0)

app = FastAPI(title="Ebb API", version="1.0.0", docs_url=None, redoc_url=None)


# ── Data shapes (Pydantic checks every request body for us) ──────────────────

ExpenseCategory = Literal["Groceries", "Transport", "Eating out", "Bills", "Other"]


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("That doesn't look like a valid email.")
        return v


class Budget(BaseModel):
    rent: float = Field(ge=0, le=1_000_000)
    phone: float = Field(ge=0, le=1_000_000)
    other: float = Field(ge=0, le=1_000_000)
    savingsBuffer: float = Field(ge=0, le=1_000_000)


class Income(BaseModel):
    amount: float = Field(gt=0, le=1_000_000)
    source: str = Field(min_length=1, max_length=80)
    date: date

    @field_validator("source")
    @classmethod
    def clean_source(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please say where this income came from.")
        return v


class Expense(BaseModel):
    amount: float = Field(gt=0, le=1_000_000)
    category: ExpenseCategory
    date: date


class CheckInRequest(BaseModel):
    income: Income
    expense: Expense


# ── Small helpers ────────────────────────────────────────────────────────────

def money(x: float) -> float:
    """Round to cents so we never store values like 884.9999999."""
    return round(float(x), 2)


def supabase_error_message(resp: httpx.Response) -> str:
    """Pull a human-readable message out of a Supabase error response."""
    try:
        body = resp.json()
    except ValueError:
        return resp.text or "Unknown error"
    for field in ("msg", "error_description", "message", "error"):
        if isinstance(body, dict) and body.get(field):
            return str(body[field])
    return "Unknown error"


def bearer_token(authorization: Optional[str]) -> str:
    """Read 'Authorization: Bearer <token>' sent by the React app."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please log in first.")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Please log in first.")
    return token


async def current_user(token: str) -> dict[str, Any]:
    """Ask Supabase Auth who owns this token. Rejects expired or fake tokens."""
    url, key = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{url}/auth/v1/user",
            headers={"apikey": key, "Authorization": f"Bearer {token}"},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Your session has ended. Please log in again.",
        )
    return resp.json()


def db_headers(token: str, prefer: Optional[str] = None) -> dict[str, str]:
    """Headers for the Supabase database (REST) API, sent as the logged-in user,
    so Row Level Security applies."""
    _, key = get_settings()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def check_db(resp: httpx.Response, action: str) -> None:
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Couldn't {action} right now ({supabase_error_message(resp)}).",
        )


def budget_to_api(row: dict[str, Any]) -> dict[str, Any]:
    """Database column names → the camelCase names the React app uses."""
    return {
        "rent": float(row["rent"]),
        "phone": float(row["phone"]),
        "other": float(row["other_bills"]),
        "savingsBuffer": float(row["savings_buffer"]),
        "updatedAt": row.get("updated_at"),
    }


def check_in_to_api(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "createdAt": row["created_at"],
        "income": {
            "amount": float(row["income_amount"]),
            "source": row["income_source"],
            "date": row["income_date"],
        },
        "expense": {
            "amount": float(row["expense_amount"]),
            "category": row["expense_category"],
            "date": row["expense_date"],
        },
        "bills": {
            "rent": float(row["rent"]),
            "phone": float(row["phone"]),
            "other": float(row["other_bills"]),
            "savingsBuffer": float(row["savings_buffer"]),
        },
        "safeBefore": float(row["safe_before"]),
        "safeToSpend": float(row["safe_to_spend"]),
        "outcome": row["outcome"],
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health() -> dict[str, Any]:
    """Quick check that the backend is running and its settings exist.
    It only says whether each variable is set, never its value."""
    return {
        "status": "ok",
        "supabaseUrlSet": bool(os.environ.get("SUPABASE_URL")),
        "supabaseKeySet": bool(os.environ.get("SUPABASE_ANON_KEY")),
    }


# Auth ------------------------------------------------------------------------

FRIENDLY_AUTH_ERRORS = {
    "invalid login credentials": "That email and password don't match. Try again?",
    "email not confirmed": "Please confirm your email first. Check your inbox.",
    "user already registered": "There's already an account with that email. Try logging in.",
}


def friendly(msg: str) -> str:
    return FRIENDLY_AUTH_ERRORS.get(msg.strip().lower(), msg)


def session_payload(data: dict[str, Any]) -> dict[str, Any]:
    user = data.get("user") or {}
    return {
        "accessToken": data["access_token"],
        "expiresIn": data.get("expires_in", 3600),
        "user": {"id": user.get("id"), "email": user.get("email")},
    }


@app.post("/api/auth/signup")
async def signup(body: Credentials) -> dict[str, Any]:
    url, key = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            f"{url}/auth/v1/signup",
            headers={"apikey": key, "Content-Type": "application/json"},
            json={"email": body.email, "password": body.password},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=400, detail=friendly(supabase_error_message(resp)))

    data = resp.json()
    if data.get("access_token"):
        # Email confirmation is OFF in Supabase → the user is logged in straight away.
        return {"status": "signed_in", "session": session_payload(data)}
    # Email confirmation is ON → Supabase has emailed them a link.
    return {"status": "confirm_email"}


@app.post("/api/auth/login")
async def login(body: Credentials) -> dict[str, Any]:
    url, key = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(
            f"{url}/auth/v1/token?grant_type=password",
            headers={"apikey": key, "Content-Type": "application/json"},
            json={"email": body.email, "password": body.password},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=401, detail=friendly(supabase_error_message(resp)))
    return {"status": "signed_in", "session": session_payload(resp.json())}


@app.post("/api/auth/logout")
async def logout(authorization: Optional[str] = Header(default=None)) -> dict[str, str]:
    token = bearer_token(authorization)
    url, key = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Tells Supabase to revoke this session. Ignore failures: the app
        # forgets the token either way.
        await client.post(
            f"{url}/auth/v1/logout",
            headers={"apikey": key, "Authorization": f"Bearer {token}"},
        )
    return {"status": "logged_out"}


# Budget (Step 1: bills) -------------------------------------------------------

@app.get("/api/budget")
async def get_budget(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    token = bearer_token(authorization)
    user = await current_user(token)
    url, _ = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{url}/rest/v1/budgets",
            params={"select": "*", "user_id": f"eq.{user['id']}"},
            headers=db_headers(token),
        )
    check_db(resp, "load your bills")
    rows = resp.json()
    return {"budget": budget_to_api(rows[0]) if rows else None}


@app.put("/api/budget")
async def save_budget(
    body: Budget, authorization: Optional[str] = Header(default=None)
) -> dict[str, Any]:
    token = bearer_token(authorization)
    user = await current_user(token)
    url, _ = get_settings()
    row = {
        "user_id": user["id"],
        "rent": money(body.rent),
        "phone": money(body.phone),
        "other_bills": money(body.other),
        "savings_buffer": money(body.savingsBuffer),
        # updated_at is set automatically by a trigger in the database
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # "Upsert": insert a new row, or update it if this user already has one.
        resp = await client.post(
            f"{url}/rest/v1/budgets",
            params={"on_conflict": "user_id"},
            headers=db_headers(token, "resolution=merge-duplicates,return=representation"),
            json=row,
        )
    check_db(resp, "save your bills")
    return {"budget": budget_to_api(resp.json()[0])}


# Check-ins (Steps 2–3 + result) ----------------------------------------------

def calculate(budget: dict[str, Any], body: CheckInRequest) -> dict[str, Any]:
    """Ebb's core formula, same as the A2 MVP:
    safe-to-spend = income − (rent + phone + other bills) − savings buffer − expense
    If the result would go below $0, the expense would dip into the savings
    buffer, so the outcome is 'declined' (shown as 'Hold on a moment')."""
    total_bills = float(budget["rent"]) + float(budget["phone"]) + float(budget["other_bills"])
    safe_before = money(body.income.amount - total_bills - float(budget["savings_buffer"]))
    safe_after = money(safe_before - body.expense.amount)
    return {
        "safe_before": safe_before,
        "safe_to_spend": safe_after,
        "outcome": "success" if safe_after >= 0 else "declined",
    }


@app.post("/api/check-ins")
async def create_check_in(
    body: CheckInRequest, authorization: Optional[str] = Header(default=None)
) -> dict[str, Any]:
    token = bearer_token(authorization)
    user = await current_user(token)
    url, _ = get_settings()

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # 1. Load this user's saved bills from Supabase.
        resp = await client.get(
            f"{url}/rest/v1/budgets",
            params={"select": "*", "user_id": f"eq.{user['id']}"},
            headers=db_headers(token),
        )
        check_db(resp, "load your bills")
        rows = resp.json()
        if not rows:
            raise HTTPException(status_code=400, detail="Please set up your bills first.")
        budget = rows[0]

        # 2. Do the maths on the server.
        result = calculate(budget, body)

        # 3. Save the whole check-in (with a snapshot of the bills used).
        row = {
            "user_id": user["id"],
            "income_amount": money(body.income.amount),
            "income_source": body.income.source,
            "income_date": body.income.date.isoformat(),
            "expense_amount": money(body.expense.amount),
            "expense_category": body.expense.category,
            "expense_date": body.expense.date.isoformat(),
            "rent": money(budget["rent"]),
            "phone": money(budget["phone"]),
            "other_bills": money(budget["other_bills"]),
            "savings_buffer": money(budget["savings_buffer"]),
            **result,
        }
        resp = await client.post(
            f"{url}/rest/v1/check_ins",
            headers=db_headers(token, "return=representation"),
            json=row,
        )
        check_db(resp, "save this check-in")

    return {"checkIn": check_in_to_api(resp.json()[0])}


@app.get("/api/check-ins")
async def list_check_ins(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    token = bearer_token(authorization)
    user = await current_user(token)
    url, _ = get_settings()
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{url}/rest/v1/check_ins",
            params={
                "select": "*",
                "user_id": f"eq.{user['id']}",
                "order": "created_at.desc",
                "limit": "50",
            },
            headers=db_headers(token),
        )
    check_db(resp, "load your history")
    return {"checkIns": [check_in_to_api(r) for r in resp.json()]}


# Wipe -------------------------------------------------------------------------

@app.delete("/api/my-data")
async def wipe_my_data(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    """Delete every check-in and the saved bills for this user, then end the session."""
    token = bearer_token(authorization)
    user = await current_user(token)
    url, key = get_settings()
    uid = f"eq.{user['id']}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r1 = await client.delete(
            f"{url}/rest/v1/check_ins",
            params={"user_id": uid},
            headers=db_headers(token, "return=representation"),
        )
        check_db(r1, "delete your check-ins")
        r2 = await client.delete(
            f"{url}/rest/v1/budgets",
            params={"user_id": uid},
            headers=db_headers(token, "return=representation"),
        )
        check_db(r2, "delete your bills")
        await client.post(
            f"{url}/auth/v1/logout",
            headers={"apikey": key, "Authorization": f"Bearer {token}"},
        )
    return {
        "status": "wiped",
        "deleted": {"checkIns": len(r1.json()), "budgets": len(r2.json())},
    }
