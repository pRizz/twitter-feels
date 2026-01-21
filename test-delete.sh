#!/bin/bash

# Get CSRF token and session cookie
echo "Step 1: Getting CSRF token..."
RESPONSE=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token)
CSRF=$(echo $RESPONSE | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo "CSRF Token: $CSRF"

# Login
echo "Step 2: Logging in..."
curl -s -c cookies.txt -b cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username":"admin","password":"admin"}' \
  http://localhost:3001/api/admin/login
echo ""

# Get users
echo "Step 3: Getting users..."
curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/admin/users
echo ""

# Try to delete a user
echo "Step 4: Deleting user 47..."
curl -s -c cookies.txt -b cookies.txt -X DELETE \
  -H "X-CSRF-Token: $CSRF" \
  http://localhost:3001/api/admin/users/47
echo ""
