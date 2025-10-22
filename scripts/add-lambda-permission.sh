#!/bin/bash
# Add Alexa Skill permission to production Lambda function

echo "This script adds permission for your Alexa Skill to invoke the Lambda function"
echo ""
echo "First, find your Skill ID in the Alexa Developer Console:"
echo "1. Go to: https://developer.amazon.com/alexa/console/ask"
echo "2. Click on your 'Lunch Dad' skill"
echo "3. Look at the URL - it should be: https://developer.amazon.com/alexa/console/ask/build/[SKILL-ID]/..."
echo "4. Or find it under 'Build' tab > 'Endpoint' section"
echo ""
read -p "Enter your Alexa Skill ID (format: amzn1.ask.skill.XXXXXX): " SKILL_ID

if [[ ! $SKILL_ID =~ ^amzn1\.ask\.skill\. ]]; then
    echo "Error: Skill ID should start with 'amzn1.ask.skill.'"
    exit 1
fi

echo ""
echo "Adding permission for Skill ID: $SKILL_ID"
echo ""

# Add permission to production Lambda
aws lambda add-permission \
  --function-name AlexaLunchDad-prod \
  --statement-id AlexaSkillPermission-$(date +%s) \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --event-source-token "$SKILL_ID" \
  --region us-east-1

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Permission added successfully!"
    echo ""
    echo "Now go back to the Alexa Developer Console and save the endpoint:"
    echo "ARN: arn:aws:lambda:us-east-1:491729939648:function:AlexaLunchDad-prod"
else
    echo ""
    echo "❌ Failed to add permission. Please check your AWS credentials."
fi
