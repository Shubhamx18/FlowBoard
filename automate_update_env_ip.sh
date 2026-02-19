#!/bin/bash

ENV_FILE=".env"

# Get IMDSv2 token
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Use token to fetch public IP
PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4)

if [ -z "$PUBLIC_IP" ]; then
  echo "ERROR: Could not fetch EC2 public IP"
  exit 1
fi

echo "Detected EC2 Public IP: $PUBLIC_IP"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found!"
  exit 1
fi

sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=http://${PUBLIC_IP}|g" "$ENV_FILE"
sed -i "s|^BACKEND_PUBLIC_URL=.*|BACKEND_PUBLIC_URL=http://${PUBLIC_IP}:5000|g" "$ENV_FILE"
sed -i "s|^SOCKET_PUBLIC_URL=.*|SOCKET_PUBLIC_URL=http://${PUBLIC_IP}:5000|g" "$ENV_FILE"

echo ".env updated successfully!"
