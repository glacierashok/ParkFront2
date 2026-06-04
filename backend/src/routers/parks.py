"""
routers/parks.py
Endpoints:
  GET    /parks            — list all parks
  POST   /parks            — create a new park (admin)
  DELETE /parks/{id}       — delete a park (admin)

Table: Parks
  PK: park_id (S)
"""
from decimal import Decimal

from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter

from db.client import parks_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helper: DynamoDB item → Park dict ───────────────────────────────────────

def _to_park(item: dict) -> dict:
    res = {
        "id":        item["park_id"],
        "name":      item.get("name", "Unknown Park"),
        "location":  item.get("location", ""),
        "trail":     item.get("trail", ""),
    }
    if "latitude" in item and item["latitude"] is not None:
        res["latitude"] = float(item["latitude"])
    if "longitude" in item and item["longitude"] is not None:
        res["longitude"] = float(item["longitude"])
    return res


# ─── GET /parks ───────────────────────────────────────────────────────────────

@router.get("/parks")
def get_all_parks():
    logger.info("Getting all parks")
    try:
        resp = parks_table.scan()
    except Exception as e:
        logger.error(f"Error scanning parks table: {e}")
        return {"statusCode": 500, "body": {"message": "Error scanning parks table"}}

    items = resp.get("Items", [])
    parks = sorted(
        [_to_park(i) for i in items],
        key=lambda p: p["name"].lower()
    )
    return {"statusCode": 200, "body": parks}


# ─── POST /parks ──────────────────────────────────────────────────────────────

@router.post("/parks")
def create_park():
    body = router.current_event.json_body
    
    # Require 4-digit ID, name, location
    required = ("id", "name", "location")
    if not all(body.get(k) for k in required):
        return {"statusCode": 400, "body": {"message": "id, name, and location are required"}}
    
    park_id = str(body["id"])
    if len(park_id) != 4 or not park_id.isdigit():
        return {"statusCode": 400, "body": {"message": "id must be a 4-digit string"}}

    item = {
        "park_id":   park_id,
        "name":      body["name"],
        "location":  body["location"],
        "trail":     body.get("trail", ""),
    }
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

    # Don't overwrite existing park ID
    try:
        parks_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(park_id)"
        )
    except Exception as e:
        if e.__class__.__name__ == "ConditionalCheckFailedException" or getattr(e, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return {"statusCode": 409, "body": {"message": "Park with this ID already exists"}}
        logger.error(f"Error creating park: {e}")
        return {"statusCode": 500, "body": {"message": "Error creating park"}}

    return {"statusCode": 201, "body": _to_park(item)}


# ─── DELETE /parks/{id} ───────────────────────────────────────────────────────

@router.delete("/parks/<id>")
def delete_park(id: str):
    try:
        parks_table.delete_item(Key={"park_id": id})
    except Exception as e:
        logger.error(f"Error deleting park: {e}")
        return {"statusCode": 500, "body": {"message": "Error deleting park"}}
        
    return {"statusCode": 200, "body": {"message": "Park deleted successfully"}}

# ─── PUT /parks/{id} ──────────────────────────────────────────────────────────

@router.put("/parks/<id>")
def update_park(id: str):
    body = router.current_event.json_body
    
    update_expr = []
    expr_attr_names = {}
    expr_attr_values = {}
    
    if "name" in body:
        update_expr.append("#n = :n")
        expr_attr_names["#n"] = "name"
        expr_attr_values[":n"] = body["name"]
    
    if "location" in body:
        update_expr.append("#loc = :loc")
        expr_attr_names["#loc"] = "location"
        expr_attr_values[":loc"] = body["location"]
        
    if "trail" in body:
        update_expr.append("#t = :t")
        expr_attr_names["#t"] = "trail"
        expr_attr_values[":t"] = body["trail"]
        
    if "latitude" in body and body["latitude"] is not None:
        update_expr.append("#lat = :lat")
        expr_attr_names["#lat"] = "latitude"
        try:
            expr_attr_values[":lat"] = Decimal(str(body["latitude"]))
        except Exception:
            pass
            
    if "longitude" in body and body["longitude"] is not None:
        update_expr.append("#lon = :lon")
        expr_attr_names["#lon"] = "longitude"
        try:
            expr_attr_values[":lon"] = Decimal(str(body["longitude"]))
        except Exception:
            pass

    if not update_expr:
        return {"statusCode": 400, "body": {"message": "No fields to update"}}

    try:
        resp = parks_table.update_item(
            Key={"park_id": id},
            UpdateExpression="SET " + ", ".join(update_expr),
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values,
            ConditionExpression="attribute_exists(park_id)",
            ReturnValues="ALL_NEW"
        )
    except Exception as e:
        if getattr(e, "response", {}).get("Error", {}).get("Code") == "ConditionalCheckFailedException" or type(e).__name__ == "ConditionalCheckFailedException":
            return {"statusCode": 404, "body": {"message": "Park not found"}}
        logger.error(f"Error updating park: {e}")
        return {"statusCode": 500, "body": {"message": "Error updating park"}}

    return {"statusCode": 200, "body": _to_park(resp.get("Attributes", {}))}
