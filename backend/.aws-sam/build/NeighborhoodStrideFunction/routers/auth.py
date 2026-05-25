"""
routers/auth.py
Endpoints:
  POST /auth/login             — look up or create user by email+provider
  PUT  /users/{id}/waiver      — accept waiver
  GET  /users                  — list all users (admin only)

Table: Users
  PK: user_id (S)
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter
from botocore.exceptions import ClientError

from db.client import users_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _to_user(item: dict) -> dict:
    """Map a DynamoDB Users item to the User shape the frontend expects."""
    return {
        "id":               item["user_id"],
        "full_name":        item["full_name"],
        "email":            item["email"],
        "provider":         item["provider"],
        "role":             item["role"],
        "waiver_accepted":  item.get("waiver_accepted", False),
        "waiver_timestamp": item.get("waiver_timestamp"),
    }


def _get_user(user_id: str) -> dict | None:
    resp = users_table.get_item(Key={"user_id": user_id})
    item = resp.get("Item")
    return _to_user(item) if item else None


# ─── POST /auth/login ─────────────────────────────────────────────────────────

@router.post("/auth/login")
def login():
    """
    Accepts { provider, email }.
    Looks up the user by email. Creates a new neighbor-role user on first login.
    Returns the full User object.
    """
    body: dict[str, Any] = router.current_event.json_body
    email: str  = body.get("email", "").strip().lower()
    provider: str = body.get("provider", "")
    full_name: str = body.get("name") or ""

    if not email or provider not in ("google", "apple"):
        return {"statusCode": 400, "body": {"message": "provider and email are required"}}

    # Scan Users table by email (acceptable for small user bases)
    resp = users_table.scan(
        FilterExpression="email = :e",
        ExpressionAttributeValues={":e": email},
    )
    items = resp.get("Items", [])

    if items:
        existing = items[0]
        
        # Build update expression dynamically based on what we need to update
        update_expr = "SET #prov = :p"
        expr_names = {"#prov": "provider"}
        expr_values = {":p": provider}
        
        if full_name and existing.get("full_name") != full_name:
            update_expr += ", full_name = :fn"
            expr_values[":fn"] = full_name
            existing["full_name"] = full_name
            
        users_table.update_item(
            Key={"user_id": existing["user_id"]},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
        )
        existing["provider"] = provider
        return {"statusCode": 200, "body": _to_user(existing)}

    # First login — create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "user_id":          user_id,
        "email":            email,
        "provider":         provider,
        "full_name":        full_name or email.split("@")[0],
        "role":             "neighbor",
        "waiver_accepted":  False,
        "waiver_timestamp": None,
        "created_at":       now,
    }
    users_table.put_item(Item=item)
    return {"statusCode": 201, "body": _to_user(item)}


# ─── PUT /users/{id}/waiver ───────────────────────────────────────────────────

@router.put("/users/<id>/waiver")
def update_waiver(id: str):
    """Mark a user's waiver as accepted."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        users_table.update_item(
            Key={"user_id": id},
            UpdateExpression="SET waiver_accepted = :t, waiver_timestamp = :ts",
            ConditionExpression="attribute_exists(user_id)",
            ExpressionAttributeValues={":t": True, ":ts": now},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "User not found"}}
        raise

    user = _get_user(id)
    return {"statusCode": 200, "body": user}


# ─── GET /users ───────────────────────────────────────────────────────────────

@router.get("/users")
def get_all_users():
    """Returns all users."""
    resp = users_table.scan()
    users = [_to_user(item) for item in resp.get("Items", [])]
    return {"statusCode": 200, "body": users}

# ─── PATCH /users/{id}/role ───────────────────────────────────────────────────

@router.patch("/users/<id>/role")
def update_role(id: str):
    """Update a user's role."""
    body: dict[str, Any] = router.current_event.json_body
    new_role = body.get("role")
    if new_role not in ("neighbor", "volunteer", "admin"):
        return {"statusCode": 400, "body": {"message": "Invalid role"}}

    try:
        users_table.update_item(
            Key={"user_id": id},
            UpdateExpression="SET #r = :role",
            ConditionExpression="attribute_exists(user_id)",
            ExpressionAttributeNames={"#r": "role"},
            ExpressionAttributeValues={":role": new_role},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "User not found"}}
        raise

    user = _get_user(id)
    return {"statusCode": 200, "body": user}
