# Alexa Lunch Dad - Setup Guide

## Prerequisites

1. **AWS Account** with Lambda and CloudFormation access
2. **Amazon Developer Account** for Alexa Skills
3. **AWS CLI** installed and configured
4. **SAM CLI** installed ([installation guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html))
5. **Node.js 18+** and npm

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Set region to us-east-1 (recommended for Alexa)
```

### 3. Create Alexa Skill

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click "Create Skill"
3. Name: "Lunch Dad"
4. Choose "Custom" model and "Provision your own" backend
5. Click "Create skill"
6. Copy your **Skill ID** (format: amzn1.ask.skill.xxxxxxxx)

### 4. Deploy Lambda Function

```bash
# For development
npm run build
sam deploy --guided

# Follow prompts:
# - Stack Name: alexa-lunch-dad-dev
# - AWS Region: us-east-1
# - Parameter SkillId: [paste your Skill ID]
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Save arguments to configuration file: Y
```

### 5. Configure Alexa Skill Endpoint

1. In Alexa Developer Console, go to your skill
2. Click "Endpoint" in left sidebar
3. Select "AWS Lambda ARN"
4. Paste Lambda ARN from SAM deployment output
5. Click "Save Endpoints"

### 6. Upload Interaction Model

1. In Alexa Developer Console, click "Build" tab
2. Click "JSON Editor" in left sidebar
3. Copy content from `config/interaction-model.json`
4. Paste into editor and click "Save Model"
5. Click "Build Model"

### 7. Test Your Skill

In Alexa Developer Console:
1. Click "Test" tab
2. Enable testing for "Development"
3. Type or say: "open lunch dad"

## GitHub Setup

### 1. Create GitHub Repository

```bash
# Initialize if not already done
git init
git add .
git commit -m "Initial commit: Alexa Lunch Dad skill setup"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/alexaLunchDad.git
git branch -M main
git push -u origin main
```

### 2. Configure GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - `ALEXA_SKILL_ID_DEV`: Your development skill ID
   - `ALEXA_SKILL_ID_PROD`: Your production skill ID (if different)

### 3. Create Development Branch

```bash
git checkout -b develop
git push -u origin develop
```

## Development Workflow

### Local Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Test Lambda locally
sam local start-api
```

### Deploy to Development

```bash
# Push to develop branch
git checkout develop
git add .
git commit -m "Your changes"
git push

# GitHub Actions will automatically deploy
```

### Deploy to Production

```bash
# Merge to main branch
git checkout main
git merge develop
git push

# GitHub Actions will automatically deploy to production
```

## Continuous Integration/Deployment

The project uses GitHub Actions for CI/CD:

- **On push to `develop`**: Runs tests and deploys to development
- **On push to `main`**: Runs tests and deploys to production
- **On pull requests**: Runs tests only

## Troubleshooting

### Lambda Deployment Issues

```bash
# View CloudFormation stack events
aws cloudformation describe-stack-events --stack-name alexa-lunch-dad-dev

# View Lambda logs
sam logs -n AlexaLunchDadFunction --stack-name alexa-lunch-dad-dev --tail
```

### Alexa Skill Testing

- Use CloudWatch Logs to debug Lambda execution
- Check Alexa Developer Console for utterance resolution issues
- Verify skill endpoint matches Lambda ARN

## Next Steps

1. Add more lunch recommendations in `src/utils/lunchRecommendations.js`
2. Implement user preferences with DynamoDB
3. Add slot types for cuisine preferences
4. Create custom intents for dietary restrictions
5. Add session attributes for conversation flow

## Resources

- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Ask SDK for Node.js](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs)
