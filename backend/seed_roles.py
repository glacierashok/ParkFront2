import boto3
import uuid

dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url='http://localhost:8000',
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

roles_table = dynamodb.Table("Roles")

# Clear existing
scan = roles_table.scan()
with roles_table.batch_writer() as batch:
    for item in scan.get('Items', []):
        batch.delete_item(Key={'role_id': item['role_id']})

# Seed default roles
roles = ['Route Marshal', 'Registration Desk', 'First Aid', 'Water Station', 'Photography', 'Sweeper']
print("Seeding roles...")
for r in roles:
    item = {"role_id": str(uuid.uuid4()), "name": r}
    roles_table.put_item(Item=item)
    print(f"Added role: {r}")

print("Done!")
