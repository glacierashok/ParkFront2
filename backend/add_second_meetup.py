"""
add_second_meetup.py
Inserts a second upcoming meetup into the local DynamoDB table so the
dashboard can display it in the "Also Coming Up" section.
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

table = dynamodb.Table('NeighborhoodTable')

# Two weeks from now at 9:00 AM UTC
two_weeks = datetime.now(timezone.utc).replace(hour=13, minute=0, second=0, microsecond=0) + timedelta(weeks=2)
scheduled_time = two_weeks.isoformat()

meetup_id = str(uuid.uuid4())
item = {
    "PK": f"MEETUP#{meetup_id}",
    "SK": "#METADATA",
    "meetup_id": meetup_id,
    "scheduled_time": scheduled_time,
    "location": "Olentangy Trail – Antrim Park",
    "status": "active",
    "weather_note": "",
    "created_at": datetime.now(timezone.utc).isoformat(),
}

table.put_item(Item=item)
print(f"✅ Second meetup inserted!")
print(f"   ID:   {meetup_id}")
print(f"   Time: {scheduled_time}")
print(f"   Loc:  {item['location']}")
