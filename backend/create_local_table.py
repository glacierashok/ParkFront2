"""
create_local_table.py
Creates all four DynamoDB tables in local DynamoDB and seeds two test meetups.
Run this after starting DynamoDB Local:
    python create_local_table.py
"""
import uuid
import boto3
from datetime import datetime, timezone, timedelta

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:8000',
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

# ─── Table definitions ────────────────────────────────────────────────────────

TABLES = [
    {
        "TableName": "Users",
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "user_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "Meetups",
        "KeySchema": [
            {"AttributeName": "meetup_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "meetup_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "RSVPs",
        "KeySchema": [
            {"AttributeName": "meetup_id", "KeyType": "HASH"},
            {"AttributeName": "user_id",   "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "meetup_id", "AttributeType": "S"},
            {"AttributeName": "user_id",   "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "UserIndex",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "VolunteerLogs",
        "KeySchema": [
            {"AttributeName": "log_id",  "KeyType": "HASH"},
            {"AttributeName": "user_id", "KeyType": "RANGE"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "log_id",  "AttributeType": "S"},
            {"AttributeName": "user_id", "AttributeType": "S"},
            {"AttributeName": "status",  "AttributeType": "S"},
        ],
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "StatusIndex",
                "KeySchema": [
                    {"AttributeName": "status", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "UserIndex",
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "Parks",
        "KeySchema": [
            {"AttributeName": "park_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "park_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    {
        "TableName": "Roles",
        "KeySchema": [
            {"AttributeName": "role_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "role_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
]

# ─── Create tables ────────────────────────────────────────────────────────────

for schema in TABLES:
    try:
        table = dynamodb.create_table(**schema)
        print(f"✅ Created table: {schema['TableName']}")
    except Exception as e:
        if "ResourceInUseException" in str(e):
            print(f"⚠️  Table already exists (skipped): {schema['TableName']}")
        else:
            print(f"❌ Error creating {schema['TableName']}: {e}")

# ─── Seed Meetups ─────────────────────────────────────────────────────────────

meetups_table = dynamodb.Table("Meetups")
now = datetime.now(timezone.utc)

seed_meetups = [
    {
        "meetup_id":      str(uuid.uuid4()),
        "scheduled_time": (now.replace(hour=13, minute=0, second=0, microsecond=0) + timedelta(weeks=1)).isoformat(),
        "location":       "Antrim Park – Main Shelter",
        "status":         "active",
        "weather_note":   "",
        "created_at":     now.isoformat(),
    },
    {
        "meetup_id":      str(uuid.uuid4()),
        "scheduled_time": (now.replace(hour=13, minute=0, second=0, microsecond=0) + timedelta(weeks=2)).isoformat(),
        "location":       "Olentangy Trail – Antrim Park",
        "status":         "active",
        "weather_note":   "",
        "created_at":     now.isoformat(),
    },
]

for m in seed_meetups:
    meetups_table.put_item(Item=m)
    print(f"🗓  Seeded meetup: {m['location']} @ {m['scheduled_time']}")

print("\nDone! All tables ready.")
