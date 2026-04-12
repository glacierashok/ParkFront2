"""
db/client.py
Four separate DynamoDB table handles — one per entity type.
Table names are read from environment variables (set in template.yaml).
"""
import os
import boto3

if os.environ.get("AWS_SAM_LOCAL"):
    # When running in SAM Local (Docker), the DynamoDB Local container is on
    # On Mac/Windows, host.docker.internal reaches the host's mapped ports.
    # Fall back to the bridge IP if that's not available.
    dynamo_endpoint = os.environ.get("DYNAMODB_ENDPOINT", "http://host.docker.internal:8000")
    
    _dynamodb = boto3.resource(
        "dynamodb",
        endpoint_url=dynamo_endpoint,
        region_name="us-east-1",
        aws_access_key_id="dummy",
        aws_secret_access_key="dummy",
        aws_session_token="dummy",
    )
    
    # Simple diagnostic: log names of tables we actually see on this endpoint
    try:
        from aws_lambda_powertools import Logger
        diagnostic_logger = Logger()
        all_tables = [t.name for t in _dynamodb.tables.all()]
        diagnostic_logger.info(f"DynamoDB Local connected to: {dynamo_endpoint}")
        diagnostic_logger.info(f"Tables found: {all_tables}")
    except Exception as e:
        pass

    # Override environment variables locally, because SAM local resolves 
    # !Ref ResourceName to the logical ID (e.g. "MeetupsTable") instead
    # of the expected exact physical name ("Meetups").
    os.environ["USERS_TABLE"]   = "Users"
    os.environ["MEETUPS_TABLE"] = "Meetups"
    os.environ["RSVPS_TABLE"]   = "RSVPs"
    os.environ["VLOGS_TABLE"]   = "VolunteerLogs"

else:
    _dynamodb = boto3.resource("dynamodb")

users_table    = _dynamodb.Table(os.environ.get("USERS_TABLE",    "Users"))
meetups_table  = _dynamodb.Table(os.environ.get("MEETUPS_TABLE",  "Meetups"))
rsvps_table    = _dynamodb.Table(os.environ.get("RSVPS_TABLE",    "RSVPs"))
vlogs_table    = _dynamodb.Table(os.environ.get("VLOGS_TABLE",    "VolunteerLogs"))
