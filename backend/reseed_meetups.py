import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:8000',
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

meetups_table = dynamodb.Table("Meetups")

# Clear existing meetups
print("🧹 Clearing existing meetups...")
scan = meetups_table.scan()
with meetups_table.batch_writer() as batch:
    for item in scan.get('Items', []):
        batch.delete_item(Key={'meetup_id': item['meetup_id']})

# New meetups
now = datetime.now().isoformat()
new_meetups = [
    {
        "meetup_id":      str(uuid.uuid4()),
        "scheduled_time": "2026-04-18T08:00:00-04:00",
        "location":       "Glazier Ridge Park",
        "status":         "active",
        "weather_note":   "Meet by the main parking lot.",
        "created_at":     now,
    },
    {
        "meetup_id":      str(uuid.uuid4()),
        "scheduled_time": "2026-04-19T08:00:00-04:00",
        "location":       "Sunday Stride Site",
        "status":         "active",
        "weather_note":   "Second next walk!",
        "created_at":     now,
    },
]

print("🗓  Seeding new meetups...")
for m in new_meetups:
    meetups_table.put_item(Item=m)
    print(f"✅ Created: {m['location']} @ {m['scheduled_time']}")

print("\nDone!")
