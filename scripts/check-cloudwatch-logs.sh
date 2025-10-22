#!/bin/bash

echo "Checking recent CloudWatch logs for Lambda errors..."
echo ""
echo "To view logs manually, go to:"
echo "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/\$252Faws\$252Flambda\$252FAlexaLunchDad-prod"
echo ""
echo "Or run this command if AWS CLI is available:"
echo "aws logs tail /aws/lambda/AlexaLunchDad-prod --region us-east-1 --follow"
