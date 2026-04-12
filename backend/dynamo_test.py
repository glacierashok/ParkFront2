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

tables = list(dynamodb.tables.all())
print(f"Found {len(tables)} tables:")
for table in tables:
    print("*"*100)
    print(f"\n--- Table: {table.name} ---")
    response = table.scan()
    items = response.get('Items', [])
    print(f"Items count: {len(items)}")
    for i, item in enumerate(items, 1):
        print(f"  Item {i}: {item}")







