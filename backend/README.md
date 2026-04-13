# Neighborhood Stride — Backend

Python REST API built with AWS SAM (Lambda + API Gateway + DynamoDB).

## Structure

```
backend/
├── template.yaml          # SAM Infrastructure definition
├── requirements.txt       # Python dependencies
└── src/
    ├── app.py             # Lambda entry point & API router
    ├── db/
    │   └── client.py      # Shared boto3 DynamoDB client
    └── routers/
        ├── auth.py        # POST /auth/login, PUT /users/{id}/waiver, GET /users
        ├── meetups.py     # GET/POST /meetups, GET /meetups/upcoming, PATCH cancel
        ├── rsvps.py       # GET+POST /rsvps, PATCH /rsvps/{id}/attendance
        └── volunteers.py  # Volunteer log CRUD
```


## Local Development

### Prerequisites
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Docker](https://www.docker.com/) (for `sam local`)
- Python 3.11

### Run locally

```bash
cd backend

# Build the Lambda package
sam build

# Start a local API Gateway mock (requires Docker)
sam local start-api

# The API is now available at http://127.0.0.1:3000
```

### Test an endpoint

```bash
# Get all meetups
curl http://127.0.0.1:3000/meetups

# Login
curl -X POST http://127.0.0.1:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "email": "test@example.com"}'
```

## Deploy to AWS

Deployment is fully automated via GitHub Actions (`/.github/workflows/deploy-backend.yml`).
Push any change inside `backend/` to the `main` branch and it deploys automatically.

Manual deploy:
```bash
sam build
sam deploy --guided   # first time only — saves config to samconfig.toml
sam deploy            # subsequent deploys
```

## Authentication

All requests should pass the caller's user ID in the `X-User-Id` header. Role-based access control is enforced per endpoint.

> **Note:** This is a simplified auth mechanism suitable for development. Replace with JWT validation before going to production.
