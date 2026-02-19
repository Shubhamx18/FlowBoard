#!/bin/bash

# ==============================
# CONFIGURATION
# ==============================

INSTANCE_ID="i-030da7d31a1dbbffc"
ENV_FILE="env"   # because your env file is at root

# ==============================
# GET EC2 PUBLIC IP
# ==============================

ipv4_address=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

if [ -z "$ipv4_address" ]; then
  echo "ERROR: Could not fetch EC2 IP"
  exit 1
fi

echo "EC2 Public IP: $ipv4_address"

# ==============================
# CHECK IF ENV FILE EXISTS
# ==============================

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found!"
  exit 1
fi

# ==============================
# UPDATE VARIABLES
# ==============================

sed -i -e "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://${ipv4_address}|g" $ENV_FILE
sed -i -e "s|BACKEND_PUBLIC_URL=.*|BACKEND_PUBLIC_URL=http://${ipv4_address}:5000|g" $ENV_FILE
sed -i -e "s|SOCKET_PUBLIC_URL=.*|SOCKET_PUBLIC_URL=http://${ipv4_address}:5000|g" $ENV_FILE

echo "env file updated successfully with EC2 IP: $ipv4_address"
