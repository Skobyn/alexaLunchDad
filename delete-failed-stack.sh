#!/bin/bash
# Delete the failed CloudFormation stack

echo "Deleting failed production stack..."
aws cloudformation delete-stack \
  --stack-name alexa-lunch-dad-prod \
  --region us-east-1 2>&1 || echo "AWS CLI not available, please delete manually"

echo ""
echo "To delete manually via AWS Console:"
echo "1. Go to: https://console.aws.amazon.com/cloudformation"
echo "2. Find stack: alexa-lunch-dad-prod"
echo "3. Click Delete"
echo ""
echo "After deletion completes, push to main again to redeploy."
