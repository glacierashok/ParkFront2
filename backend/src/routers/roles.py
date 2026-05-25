"""
routers/roles.py
Endpoints:
  GET    /roles            — list all roles
  POST   /roles            — create a new role (admin)
  DELETE /roles/{id}       — delete a role (admin)

Table: Roles
  PK: role_id (S)
"""
import uuid
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler.router import APIGatewayRouter
from db.client import roles_table

logger = Logger()
router = APIGatewayRouter()


# ─── Helper: DynamoDB item → Role dict ───────────────────────────────────────

def _to_role(item: dict) -> dict:
    return {
        "id":   item["role_id"],
        "name": item.get("name", "Unknown Role"),
    }


# ─── GET /roles ───────────────────────────────────────────────────────────────

@router.get("/roles")
def get_all_roles():
    logger.info("Getting all roles")
    try:
        resp = roles_table.scan()
    except Exception as e:
        logger.error(f"Error scanning roles table: {e}")
        return {"statusCode": 500, "body": {"message": "Error scanning roles table"}}

    items = resp.get("Items", [])
    roles = sorted(
        [_to_role(i) for i in items],
        key=lambda r: r["name"].lower()
    )
    return {"statusCode": 200, "body": roles}


# ─── POST /roles ──────────────────────────────────────────────────────────────

@router.post("/roles")
def create_role():
    body = router.current_event.json_body
    
    # Require name
    if "name" not in body:
        return {"statusCode": 400, "body": {"message": "name is required"}}
    
    role_id = str(uuid.uuid4())
    item = {
        "role_id": role_id,
        "name":    body["name"],
    }

    try:
        roles_table.put_item(Item=item)
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        return {"statusCode": 500, "body": {"message": "Error creating role"}}

    return {"statusCode": 201, "body": _to_role(item)}


# ─── DELETE /roles/{id} ───────────────────────────────────────────────────────

@router.delete("/roles/<id>")
def delete_role(id: str):
    try:
        roles_table.delete_item(Key={"role_id": id})
    except Exception as e:
        logger.error(f"Error deleting role: {e}")
        return {"statusCode": 500, "body": {"message": "Error deleting role"}}
        
    return {"statusCode": 200, "body": {"message": "Role deleted successfully"}}
