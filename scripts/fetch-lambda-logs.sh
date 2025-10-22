#!/bin/bash

echo "Fetching recent CloudWatch logs for AlexaLunchDad-prod Lambda..."
echo ""

# Get the latest log stream
LOG_GROUP="/aws/lambda/AlexaLunchDad-prod"

echo "Recent log events (last 50 lines):"
echo "=================================================="
aws logs tail "$LOG_GROUP" \
  --region us-east-1 \
  --since 10m \
  --format short \
  --follow=false

echo ""
echo "=================================================="
echo ""
echo "To watch logs in real-time, run:"
echo "aws logs tail /aws/lambda/AlexaLunchDad-prod --region us-east-1 --follow"
