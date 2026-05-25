import uuid
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:8000',
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

parks_table = dynamodb.Table("Parks")
meetups_table = dynamodb.Table("Meetups")

print("🧹 Clearing existing data...")
for table in [parks_table, meetups_table]:
    scan = table.scan()
    with table.batch_writer() as batch:
        for item in scan.get('Items', []):
            if table.name == "Parks":
                batch.delete_item(Key={'park_id': item['park_id']})
            else:
                batch.delete_item(Key={'meetup_id': item['meetup_id']})

print("🌲 Seeding new parks...")
parks = [
    {
        "park_id": "1001",
        "name": "Glacier Ridge Metro Park",
        "location": "9801 Hyland-Croy Rd, Plain City, OH 43064",
        "trail": "Marsh Hawk Loop",
        "latitude": Decimal("40.1558"),
        "longitude": Decimal("-83.1961")
    },
    {
        "park_id": "1002",
        "name": "Highbanks Metro Park",
        "location": "9466 Columbus Pike, Lewis Center, OH 43035",
        "trail": "Overlook Trail",
        "latitude": Decimal("40.1479"),
        "longitude": Decimal("-83.0270")
    }
]

for p in parks:
    parks_table.put_item(Item=p)
    print(f"✅ Created Park: {p['name']} (ID: {p['park_id']})")

print("🗓  Seeding new meetups...")
now = datetime.now()
# One meetup in 2 hours
m1_time = (now + timedelta(hours=2)).isoformat()
# One meetup tomorrow
m2_time = (now + timedelta(days=1)).isoformat()

meetups = [
    {
        "meetup_id":      str(uuid.uuid4()),
        "park_id":        "1001",
        "scheduled_time": m1_time,
        "status":         "active",
        "weather_note":   "Meet by the main parking lot.",
        "created_at":     now.isoformat(),
    },
    {
        "meetup_id":      str(uuid.uuid4()),
        "park_id":        "1002",
        "scheduled_time": m2_time,
        "status":         "active",
        "weather_note":   "Bring water!",
        "created_at":     now.isoformat(),
    },
]

for m in meetups:
    meetups_table.put_item(Item=m)
    print(f"✅ Created Meetup: {m['meetup_id']} @ {m['scheduled_time']} for Park {m['park_id']}")

print("\nDone!")
