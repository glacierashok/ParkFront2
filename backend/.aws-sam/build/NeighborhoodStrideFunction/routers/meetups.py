"""
routers/meetups.py
Endpoints:
  GET   /meetups/upcoming      — next active meetup
  GET   /meetups               — all meetups
  POST  /meetups               — create meetup (admin)
  PATCH /meetups/{id}/cancel   — cancel meetup (admin)

Table: Meetups
  PK: meetup_id (S)
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter
from botocore.exceptions import ClientError

from db.client import meetups_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helper: DynamoDB item → Meetup dict ─────────────────────────────────────

def _to_meetup(item: dict) -> dict:
    res = {
        "id":             item["meetup_id"],
        "scheduled_time": item["scheduled_time"],
        "status":         item["status"],
        "weather_note":   item.get("weather_note", ""),
    }
    if "park_id" in item:
        res["park_id"] = item["park_id"]
    if "latitude" in item and item["latitude"] is not None:
        res["latitude"] = float(item["latitude"])
    if "longitude" in item and item["longitude"] is not None:
        res["longitude"] = float(item["longitude"])
    return res


# ─── GET /meetups/upcoming ────────────────────────────────────────────────────
# NOTE: This route MUST be registered before GET /meetups/{id} to avoid
# "upcoming" being treated as a path parameter.

@router.get("/meetups/upcoming")
def get_upcoming_meetup():    
    now = datetime.now(timezone.utc).isoformat()
    resp = meetups_table.scan(
        FilterExpression="#s = :active AND scheduled_time > :now",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":active": "active", ":now": now},
    )
    
    items = resp.get("Items", [])
    if not items:
        return {"statusCode": 200, "body": None}

    earliest = min(items, key=lambda m: m["scheduled_time"])
    return {"statusCode": 200, "body": _to_meetup(earliest)}


# ─── GET /meetups ─────────────────────────────────────────────────────────────

@router.get("/meetups")
def get_all_meetups():
    logger.info("\nGetting all meetups")
    logger.info(f"Meetup table: {meetups_table}")
    try:
        
        resp = meetups_table.scan()
    except Exception as e:
        logger.error(f"Error scanning meetups table: {e}")
        return {"statusCode": 500, "body": {"message": "Error scanning meetups table"}}

    logger.info(f"Meetup response: {resp}")
    items = resp.get("Items", [])
    logger.info("Meetup items:")
    logger.info(items)
    meetups = sorted(
        [_to_meetup(i) for i in items],
        key=lambda m: m["scheduled_time"],
        reverse=True,
    )
    return {"statusCode": 200, "body": meetups}


# ─── POST /meetups ────────────────────────────────────────────────────────────

@router.post("/meetups")
def create_meetup():
    body = router.current_event.json_body
    required = ("scheduled_time",)
    if not all(body.get(k) for k in required):
        return {"statusCode": 400, "body": {"message": "scheduled_time is required"}}

    meetup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "meetup_id":      meetup_id,
        "scheduled_time": body["scheduled_time"],
        "status":         body.get("status", "active"),
        "weather_note":   body.get("weather_note", ""),
        "created_at":     now,
    }
    
    if "park_id" in body:
        item["park_id"] = str(body["park_id"])
    if "latitude" in body and body["latitude"] is not None:
        try:
            item["latitude"] = Decimal(str(body["latitude"]))
        except Exception:
            pass
    if "longitude" in body and body["longitude"] is not None:
        try:
            item["longitude"] = Decimal(str(body["longitude"]))
        except Exception:
            pass

    meetups_table.put_item(Item=item)
    return {"statusCode": 201, "body": _to_meetup(item)}


# ─── PATCH /meetups/{id}/cancel ───────────────────────────────────────────────

@router.patch("/meetups/<id>/cancel")
def cancel_meetup(id: str):
    try:
        meetups_table.update_item(
            Key={"meetup_id": id},
            UpdateExpression="SET #s = :canceled",
            ConditionExpression="attribute_exists(meetup_id)",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={":canceled": "canceled"},
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "Meetup not found"}}
        raise

    resp = meetups_table.get_item(Key={"meetup_id": id})
    return {"statusCode": 200, "body": _to_meetup(resp["Item"])}
