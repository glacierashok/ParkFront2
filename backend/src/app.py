"""
app.py
Lambda entry point. Wires all routers into a single API Gateway resolver.
"""
import json

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

from routers import auth, meetups, rsvps, volunteers, parks, roles

logger = Logger()
tracer = Tracer()

app = APIGatewayRestResolver()

# ── Register all domain routers ───────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(meetups.router)
app.include_router(rsvps.router) 
app.include_router(volunteers.router)
app.include_router(parks.router)
app.include_router(roles.router)


# ── CORS headers added to every response ─────────────────────────────────────
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-User-Id",
}


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    # Handle OPTIONS pre-flight requests from the browser
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {**CORS_HEADERS, "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"},
            "body": "",
        }

    try:
        result = app.resolve(event, context)
        # Unpack the inner response if our routers returned {"statusCode": X, "body": Y}
        if isinstance(result, dict):
            raw_body = result.get("body", "null")
            try:
                inner = json.loads(raw_body)
                if isinstance(inner, dict) and "statusCode" in inner and "body" in inner:
                    # It's our custom pattern! Extract and format
                    return {
                        "statusCode": inner["statusCode"],
                        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
                        "body": json.dumps(inner["body"]),
                    }
            except Exception:
                pass
            
            # Fallback for Powertools native responses (e.g. 404 Not found)
            return {
                "statusCode": result.get("statusCode", 200),
                "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
                "body": raw_body, # raw_body is already stringified by powertools!
            }
        return result
    except Exception as e:
        logger.exception("Unhandled error")
        return {
            "statusCode": 500,
            "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
            "body": json.dumps({"message": "Internal server error", "detail": str(e)}),
        }
