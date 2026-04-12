"""
routers/volunteers.py
Endpoints:
  POST   /volunteer-logs              — create log (admin)
  GET    /users/{id}/volunteer-logs   — logs for a user
  GET    /volunteer-logs/pending      — all pending logs (admin)
  PATCH  /volunteer-logs/{id}/approve — approve log (admin)
  DELETE /volunteer-logs/{id}         — reject / delete log (admin)

Table: VolunteerLogs
  PK: log_id  (S)
  SK: user_id (S)
  GSI StatusIndex: status (HASH) — powers GET /volunteer-logs/pending
  GSI UserIndex:   user_id (HASH) — powers GET /users/{id}/volunteer-logs
"""
import uuid
from datetime import datetime, timezone

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from db.client import vlogs_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helper: DynamoDB item → VolunteerLog dict ────────────────────────────────

def _to_log(item: dict) -> dict:
    return {
        "id":            item["log_id"],
        "user_id":       item["user_id"],
        "meetup_id":     item["meetup_id"],
        "assigned_role": item["assigned_role"],
        "hours_credited": item.get("hours_credited", 0),
        "status":        item["status"],
    }


# ─── POST /volunteer-logs ─────────────────────────────────────────────────────

@router.post("/volunteer-logs")
def create_volunteer_log():
    """Admin only. Creates a new volunteer log with status=pending."""
    body          = router.current_event.json_body
    user_id       = body.get("user_id")
    meetup_id     = body.get("meetup_id")
    assigned_role = body.get("assigned_role")

    if not user_id or not meetup_id or not assigned_role:
        return {
            "statusCode": 400,
            "body": {"message": "user_id, meetup_id, and assigned_role are required"},
        }

    log_id = str(uuid.uuid4())
    now    = datetime.now(timezone.utc).isoformat()
    item   = {
        "log_id":         log_id,
        "user_id":        user_id,
        "meetup_id":      meetup_id,
        "assigned_role":  assigned_role,
        "hours_credited": body.get("hours_credited", 2),
        "status":         "pending",
        "created_at":     now,
    }
    vlogs_table.put_item(Item=item)
    return {"statusCode": 201, "body": _to_log(item)}


# ─── GET /users/{id}/volunteer-logs ──────────────────────────────────────────

@router.get("/users/<id>/volunteer-logs")
def get_user_volunteer_logs(id: str):
    """Returns all volunteer logs for a user via UserIndex GSI."""
    resp = vlogs_table.query(
        IndexName="UserIndex",
        KeyConditionExpression=Key("user_id").eq(id),
    )
    logs = [_to_log(item) for item in resp.get("Items", [])]
    return {"statusCode": 200, "body": logs}


# ─── GET /volunteer-logs/pending ─────────────────────────────────────────────
# NOTE: Must be registered before /volunteer-logs/{id} routes.

@router.get("/volunteer-logs/pending")
def get_pending_volunteer_logs():
    """Admin only. Queries StatusIndex GSI for status=pending."""
    resp = vlogs_table.query(
        IndexName="StatusIndex",
        KeyConditionExpression=Key("status").eq("pending"),
    )
    logs = [_to_log(item) for item in resp.get("Items", [])]
    return {"statusCode": 200, "body": logs}


# ─── PATCH /volunteer-logs/{id}/approve ───────────────────────────────────────

@router.patch("/volunteer-logs/<id>/approve")
def approve_volunteer_log(id: str):
    """Admin only. Sets status=verified. Requires user_id in request body."""
    body    = router.current_event.json_body
    user_id = body.get("user_id")
    if not user_id:
        return {"statusCode": 400, "body": {"message": "user_id is required"}}

    try:
        vlogs_table.update_item(
            Key={"log_id": id, "user_id": user_id},
            UpdateExpression="SET #s = :verified",
            ConditionExpression="attribute_exists(log_id)",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":verified": "verified"},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "Volunteer log not found"}}
        raise

    resp = vlogs_table.get_item(Key={"log_id": id, "user_id": user_id})
    return {"statusCode": 200, "body": _to_log(resp["Item"])}


# ─── DELETE /volunteer-logs/{id} ──────────────────────────────────────────────

@router.delete("/volunteer-logs/<id>")
def reject_volunteer_log(id: str):
    """Admin only. Deletes a volunteer log. Requires user_id as query param."""
    user_id = router.current_event.get_query_string_value("user_id")
    if not user_id:
        return {"statusCode": 400, "body": {"message": "user_id query parameter is required"}}

    try:
        vlogs_table.delete_item(
            Key={"log_id": id, "user_id": user_id},
            ConditionExpression="attribute_exists(log_id)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "Volunteer log not found"}}
        raise

    return {"statusCode": 200, "body": {"id": id, "deleted": True}}
