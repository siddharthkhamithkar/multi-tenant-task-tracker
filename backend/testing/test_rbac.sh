#!/bin/bash

# =========================
# CONFIGURATION
# =========================
BASE_URL="http://localhost:3000"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1ODU1ODU0OCwiZXhwIjoxNzU4NTYyMTQ4fQ.T_IYF-wOYfby69TpmP_NIwK85XQT3Dbb3O5FWqhoSoU"  # replace with your admin JWT

# New user details
USER_NAME="Member User3"
USER_EMAIL="member@example.com"
USER_PASSWORD="password123"
USER_ID=2  # replace with a valid user ID after creation
ORG_ID=1   # replace with a valid organization ID
PROJECT_ID=1  # replace with a valid project ID

# =========================
# 2️⃣ LOGIN TO GET JWT
# =========================
echo "Logging in new user..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}")

MEMBER_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Member JWT: $MEMBER_TOKEN"

# =========================
# 4️⃣ ADMIN CREATES TASK ASSIGNED TO MEMBER
# =========================
TASK_TITLE="Test Task for Member"
echo "Admin creating task for member..."
TASK_RESPONSE=$(curl -s -X POST $BASE_URL/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"projectId\":$PROJECT_ID,\"title\":\"$TASK_TITLE\",\"assignee\":$USER_ID}")

TASK_ID=$(echo $TASK_RESPONSE | jq '.task.id')
echo "Created task ID: $TASK_ID"

# =========================
# 5️⃣ MEMBER UPDATES THEIR OWN TASK STATUS
# =========================
echo "Member updating their own task status..."
curl -s -X PATCH $BASE_URL/api/tasks/$TASK_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -d '{"status":"in-progress"}' | jq

# =========================
# 6️⃣ MEMBER ATTEMPTS TO CREATE TASK (should fail)
# =========================
echo "Member attempting to create a task (should fail)..."
curl -s -X POST $BASE_URL/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MEMBER_TOKEN" \
  -d "{\"projectId\":$PROJECT_ID,\"title\":\"Member Task Attempt\"}" | jq

# =========================
# 7️⃣ FETCH ACTIVITY FEED
# =========================
echo "Fetching activity feed..."
curl -s -X GET $BASE_URL/api/activity/$ORG_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
