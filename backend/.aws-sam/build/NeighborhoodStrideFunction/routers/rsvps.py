"""
routers/rsvps.py
Endpoints:
  GET   /meetups/{id}/rsvps      — all RSVPs for a meetup
  GET   /users/{id}/rsvps        — all RSVPs for a user
  POST  /rsvps                   — create or update an RSVP (upsert)
  PATCH /rsvps/{id}/attendance   — mark attended flag

Table: RSVPs
  PK: meetup_id (S)
  SK: user_id   (S)
  GSI UserIndex: user_id (HASH) — powers GET /users/{id}/rsvps
"""
import uuid

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from db.client import rsvps_table, users_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helper: DynamoDB item → RSVP dict ───────────────────────────────────────

def _to_rsvp(item: dict) -> dict:
    return {
        "id":        item["rsvp_id"],
        "meetup_id": item["meetup_id"],
        "user_id":   item["user_id"],
        "intent":    item["intent"],
        "attended":  item.get("attended", False),
    }


# ─── GET /meetups/{id}/rsvps ─────────────────────────────────────────────────

@router.get("/meetups/<id>/rsvps")
def get_rsvps_for_meetup(id: str):
    """Returns all RSVPs for a given meetup, including user full names."""
    resp = rsvps_table.query(
        KeyConditionExpression=Key("meetup_id").eq(id)
    )
    rsvps = [_to_rsvp(item) for item in resp.get("Items", [])]

    # Enrich with user_full_name
    user_cache = {}
    for r in rsvps:
        uid = r["user_id"]
        if uid not in user_cache:
            try:
                u_resp = users_table.get_item(Key={"user_id": uid})
                u_item = u_resp.get("Item")
                user_cache[uid] = u_item.get("full_name", "Unknown User") if u_item else "Unknown User"
            except Exception as e:
                logger.warning(f"Failed to fetch user {uid}: {e}")
                user_cache[uid] = "Unknown User"
        r["user_full_name"] = user_cache[uid]

    return {"statusCode": 200, "body": rsvps}


# ─── GET /users/{id}/rsvps ───────────────────────────────────────────────────

@router.get("/users/<id>/rsvps")
def get_user_rsvps(id: str):
    """Returns all RSVPs for a user via UserIndex GSI."""
    resp = rsvps_table.query(
        IndexName="UserIndex",
        KeyConditionExpression=Key("user_id").eq(id),
    )
    rsvps = [_to_rsvp(item) for item in resp.get("Items", [])]
    return {"statusCode": 200, "body": rsvps}


# ─── POST /rsvps ─────────────────────────────────────────────────────────────

@router.post("/rsvps")
def upsert_rsvp():
    """
    Creates or updates an RSVP.
    Body: { meetup_id, user_id, intent }
    """
    body = router.current_event.json_body
    meetup_id = body.get("meetup_id")
    user_id   = body.get("user_id")
    intent    = body.get("intent")

    if not meetup_id or not user_id or intent not in ("going", "not_going"):
        return {
            "statusCode": 400,
            "body": {"message": "meetup_id, user_id, and intent ('going'|'not_going') are required"},
        }

    # Preserve existing rsvp_id and attended flag if record already exists
    existing_resp = rsvps_table.get_item(Key={"meetup_id": meetup_id, "user_id": user_id})
    existing = existing_resp.get("Item")
    rsvp_id  = existing["rsvp_id"] if existing else str(uuid.uuid4())
    attended = existing.get("attended", False) if existing else False

    item = {
        "meetup_id": meetup_id,
        "user_id":   user_id,
        "rsvp_id":   rsvp_id,
        "intent":    intent,
        "attended":  attended,
    }
    rsvps_table.put_item(Item=item)
    return {"statusCode": 200, "body": _to_rsvp(item)}


# ─── PATCH /rsvps/{id}/attendance ────────────────────────────────────────────

@router.patch("/rsvps/<id>/attendance")
def mark_attendance(id: str):
    """
    Updates the `attended` flag on an RSVP.
    Body: { attended: bool, meetup_id: str, user_id: str }
    """
    body      = router.current_event.json_body
    attended  = body.get("attended")
    meetup_id = body.get("meetup_id")
    user_id   = body.get("user_id")

    if attended is None or not meetup_id or not user_id:
        return {
            "statusCode": 400,
            "body": {"message": "attended, meetup_id, and user_id are required"},
        }

    try:
        rsvps_table.update_item(
            Key={"meetup_id": meetup_id, "user_id": user_id},
            UpdateExpression="SET attended = :a",
            ConditionExpression="attribute_exists(meetup_id)",
            ExpressionAttributeValues={":a": bool(attended)},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "RSVP not found"}}
        raise

    resp = rsvps_table.get_item(Key={"meetup_id": meetup_id, "user_id": user_id})
    return {"statusCode": 200, "body": _to_rsvp(resp["Item"])}
