# Deployment Guide - Alexa Lunch Dad Skill

Complete guide for deploying the Alexa Lunch Dad skill to AWS using SAM (Serverless Application Model).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deploy to Development](#deploy-to-development)
5. [Testing Deployment](#testing-deployment)
6. [Deploy to Production](#deploy-to-production)
7. [Monitoring and Logs](#monitoring-and-logs)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [CI/CD Integration](#cicd-integration)

---

## Prerequisites

### Required Software

1. **AWS CLI** (v2.x or later)
   ```bash
   # Install AWS CLI
   # macOS
   brew install awscli

   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Windows
   # Download from https://awscli.amazonaws.com/AWSCLIV2.msi

   # Verify installation
   aws --version
   ```

2. **SAM CLI** (v1.90.0 or later)
   ```bash
   # Install SAM CLI
   # macOS
   brew tap aws/tap
   brew install aws-sam-cli

   # Linux/Windows
   # Follow instructions at https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

   # Verify installation
   sam --version
   ```

3. **Node.js** (v18.x or later)
   ```bash
   # Verify installation
   node --version
   npm --version
   ```

4. **Git**
   ```bash
   git --version
   ```

### AWS Account Setup

1. **IAM User/Role** with the following permissions:
   - CloudFormation (full access)
   - Lambda (full access)
   - IAM (limited to role creation)
   - S3 (for deployment artifacts)
   - CloudWatch Logs
   - CloudWatch Alarms
   - X-Ray (for tracing)

2. **Configure AWS Credentials**
   ```bash
   aws configure
   # AWS Access Key ID: [your-access-key]
   # AWS Secret Access Key: [your-secret-key]
   # Default region name: us-east-1
   # Default output format: json
   ```

3. **Verify AWS Access**
   ```bash
   aws sts get-caller-identity
   ```

### Alexa Developer Account

1. Create an Alexa skill at https://developer.amazon.com/alexa/console/ask
2. Note your Skill ID (format: `amzn1.ask.skill.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. Configure skill manifest (interaction model, invocation name, etc.)

---

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd alexaLunchDad

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

### 2. Validate SAM Template

```bash
# Validate template syntax
npm run validate

# Or use SAM directly
sam validate --lint
```

### 3. Build Application

```bash
# Build the application
npm run build

# Or build with tests
npm run build:test
```

This creates a `.aws-sam` directory with the packaged application.

---

## Environment Configuration

### Configuration Files

1. **template.yaml** - Main SAM template with resource definitions
2. **samconfig.toml** - Environment-specific deployment configurations

### Environment Variables

The following parameters can be customized per environment:

| Parameter | Description | Default | Dev | Prod |
|-----------|-------------|---------|-----|------|
| `Environment` | Deployment environment | dev | dev | prod |
| `SkillId` | Alexa Skill ID | "" | (set via CLI) | (set via CLI) |
| `NutrisliceBaseUrl` | Menu API base URL | https://d45.nutrislice.com/menu | same | same |
| `NutrisliceSchoolId` | School identifier | westmore-elementary-school-2 | same | same |
| `WeatherLat` | Weather latitude | 39.0997 | same | same |
| `WeatherLon` | Weather longitude | -77.0941 | same | same |
| `SchoolTimezone` | School timezone | America/New_York | same | same |
| `CacheTTLMenu` | Menu cache TTL (sec) | 86400 | 86400 | 86400 |
| `CacheTTLWeather` | Weather cache TTL (sec) | 600 | 600 | 600 |
| `SchoolHolidays` | Holiday dates (CSV) | 2025-12-23,... | same | same |
| `LogLevel` | CloudWatch log level | info | debug | info |
| `LogRetentionDays` | Log retention days | 7 | 7 | 30 |

### Customize Configuration

Edit `samconfig.toml` to update environment-specific parameters:

```toml
[dev.deploy.parameters]
parameter_overrides = [
  "Environment=dev",
  "SkillId=amzn1.ask.skill.YOUR-DEV-SKILL-ID",
  "NutrisliceSchoolId=your-school-id",
  # ... other parameters
]
```

---

## Deploy to Development

### First-Time Deployment (Guided)

For the first deployment to dev, use guided mode:

```bash
npm run deploy:dev:guided
```

This will prompt you for:
- Stack name (default: `alexa-lunch-dad-dev`)
- AWS Region (recommend: `us-east-1`)
- Parameter values (use defaults or customize)
- Confirm changes before deploy
- Save configuration to samconfig.toml

**Important**: When prompted for `SkillId`, enter your Alexa Development Skill ID.

### Subsequent Deployments

```bash
# Quick deployment (no confirmation)
npm run deploy:dev

# Or with SAM directly
sam deploy --config-env dev --no-confirm-changeset
```

### Deployment Process

1. **Build** - SAM builds the application (if not already built)
2. **Package** - Code and dependencies are packaged
3. **Upload** - Artifacts uploaded to S3 (auto-created bucket)
4. **Create Change Set** - CloudFormation analyzes changes
5. **Deploy** - Resources are created/updated
6. **Outputs** - Function ARN and other outputs displayed

### Expected Output

```
CloudFormation outputs from deployed stack
-------------------------------------------------------------------------------
Outputs
-------------------------------------------------------------------------------
Key                 AlexaLunchDadFunctionArn
Description         Lambda Function ARN
Value               arn:aws:lambda:us-east-1:123456789012:function:AlexaLunchDad-dev

Key                 AlexaLunchDadFunctionName
Description         Lambda Function Name
Value               AlexaLunchDad-dev

Key                 DeploymentEnvironment
Description         Deployment environment
Value               dev
-------------------------------------------------------------------------------
```

### Update Alexa Skill Endpoint

1. Go to Alexa Developer Console
2. Navigate to your skill → Endpoint
3. Select "AWS Lambda ARN"
4. Enter the Function ARN from deployment output
5. Save and build your skill

---

## Testing Deployment

### 1. Verify Lambda Function

```bash
# Describe function
aws lambda get-function \
  --function-name AlexaLunchDad-dev \
  --region us-east-1

# Test function directly
aws lambda invoke \
  --function-name AlexaLunchDad-dev \
  --payload file://events/launch.json \
  response.json

# View response
cat response.json
```

### 2. Local Testing with SAM

```bash
# Test locally (before deployment)
npm run local:invoke

# With specific event
sam local invoke AlexaLunchDadFunction \
  --event events/get-lunch.json \
  --parameter-overrides Environment=dev
```

### 3. Test via Alexa Developer Console

1. Go to "Test" tab in Alexa Developer Console
2. Enable testing for "Development"
3. Type or speak: "Open lunch dad"
4. Test intents:
   - "What's for lunch today?"
   - "What's for lunch tomorrow?"
   - "Should I bring lunch?"

### 4. Monitor CloudWatch Logs

```bash
# Tail logs in real-time
npm run logs:dev

# Filter logs
npm run logs:dev:filter "ERROR"

# View specific time range
sam logs -n AlexaLunchDad-dev \
  --stack-name alexa-lunch-dad-dev \
  --start-time '10min ago' \
  --end-time 'now'
```

### 5. Check CloudWatch Alarms

```bash
# List alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix "AlexaLunchDad-dev"

# View alarm history
aws cloudwatch describe-alarm-history \
  --alarm-name AlexaLunchDad-dev-Errors \
  --max-records 10
```

---

## Deploy to Production

### Pre-Production Checklist

- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and approved
- [ ] Dev environment thoroughly tested
- [ ] Production Skill ID obtained
- [ ] Monitoring and alerting configured
- [ ] Rollback plan documented

### Production Deployment

```bash
# First-time guided deployment
npm run deploy:prod:guided

# Subsequent deployments (requires confirmation)
npm run deploy:prod
```

**Note**: Production deployments always require manual confirmation of changes.

### Production-Specific Configuration

Update `samconfig.toml` for production:

```toml
[prod.deploy.parameters]
parameter_overrides = [
  "Environment=prod",
  "SkillId=amzn1.ask.skill.YOUR-PROD-SKILL-ID",
  "LogLevel=info",
  "LogRetentionDays=30"
]
```

### Post-Deployment Verification

1. **Functional Testing**
   ```bash
   # Test production function
   aws lambda invoke \
     --function-name AlexaLunchDad-prod \
     --payload file://events/launch.json \
     response.json
   ```

2. **Monitor Initial Traffic**
   ```bash
   npm run logs:prod
   ```

3. **Check Error Rates**
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=AlexaLunchDad-prod \
     --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Sum
   ```

4. **Test via Alexa App**
   - Use your Alexa device or app
   - Invoke skill by name
   - Test all major intents
   - Verify APL displays (if applicable)

---

## Monitoring and Logs

### CloudWatch Logs

```bash
# Development logs (tail)
npm run logs:dev

# Production logs (tail)
npm run logs:prod

# Filter by pattern
sam logs -n AlexaLunchDad-prod \
  --stack-name alexa-lunch-dad-prod \
  --filter "ERROR" \
  --tail

# Specific time range
sam logs -n AlexaLunchDad-prod \
  --stack-name alexa-lunch-dad-prod \
  --start-time '2025-10-22T10:00:00' \
  --end-time '2025-10-22T11:00:00'
```

### Metrics and Alarms

```bash
# View Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=AlexaLunchDad-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Check alarm state
aws cloudwatch describe-alarms \
  --alarm-names AlexaLunchDad-prod-Errors
```

### X-Ray Tracing

View traces in AWS Console:
1. Go to X-Ray Console
2. Select "Service Map"
3. View "Traces" for detailed request flow
4. Analyze performance bottlenecks

### Log Insights Queries

```bash
# Top error messages
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by @message
| sort count desc
| limit 20

# Average duration
fields @timestamp, @duration
| stats avg(@duration), max(@duration), min(@duration)

# Requests by intent
fields @timestamp, requestContext.requestId, request.type, request.intent.name
| filter request.type = "IntentRequest"
| stats count() by request.intent.name
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails - "No Changes to Deploy"

```bash
# Force deployment with no changes
sam deploy --config-env dev --no-confirm-changeset --no-fail-on-empty-changeset
```

#### 2. Permission Denied - S3 Bucket

```bash
# SAM will auto-create S3 bucket
# Ensure IAM user has s3:CreateBucket permission
# Or manually create bucket:
aws s3 mb s3://your-sam-deployment-bucket-dev --region us-east-1

# Update samconfig.toml
s3_bucket = "your-sam-deployment-bucket-dev"
```

#### 3. Lambda Function Not Triggered by Alexa

**Verify Skill ID:**
```bash
# Check deployed skill ID
aws lambda get-function \
  --function-name AlexaLunchDad-dev \
  --query 'Configuration.Environment.Variables'
```

**Update Alexa Endpoint:**
- Ensure Lambda ARN is set in Alexa Developer Console
- Skill ID must match the one in parameter overrides

#### 4. High Error Rate

```bash
# Check recent errors
npm run logs:dev:filter "ERROR"

# Common causes:
# - API timeouts (Nutrislice, Weather.gov)
# - Invalid menu data parsing
# - Date/timezone issues
# - Missing environment variables
```

#### 5. Template Validation Errors

```bash
# Validate template
sam validate --lint

# Common issues:
# - YAML syntax errors (indentation)
# - Invalid resource properties
# - Missing required parameters
```

### Debug Commands

```bash
# Validate template
npm run validate

# Build with debug output
sam build --debug

# Deploy with debug output
sam deploy --config-env dev --debug

# Test function locally
sam local invoke AlexaLunchDadFunction \
  --event events/launch.json \
  --debug

# View CloudFormation stack events
aws cloudformation describe-stack-events \
  --stack-name alexa-lunch-dad-dev \
  --max-items 20
```

---

## Rollback Procedures

### Automatic Rollback

SAM deployments include automatic rollback on failure. If deployment fails, CloudFormation automatically reverts changes.

### Manual Rollback

#### Option 1: Redeploy Previous Version

```bash
# Checkout previous commit
git checkout <previous-commit-hash>

# Deploy previous version
npm run deploy:dev

# Return to current branch
git checkout main
```

#### Option 2: Update Stack to Previous Version

```bash
# List stack change sets
aws cloudformation list-change-sets \
  --stack-name alexa-lunch-dad-dev

# Execute rollback to specific change set
aws cloudformation execute-change-set \
  --change-set-name <change-set-name>
```

#### Option 3: Delete and Recreate Stack

```bash
# Delete stack (USE WITH CAUTION)
npm run delete:dev

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name alexa-lunch-dad-dev

# Redeploy from scratch
npm run deploy:dev:guided
```

### Rollback Verification

1. **Test Function**
   ```bash
   aws lambda invoke \
     --function-name AlexaLunchDad-dev \
     --payload file://events/launch.json \
     response.json
   ```

2. **Check Logs**
   ```bash
   npm run logs:dev
   ```

3. **Verify Version**
   ```bash
   aws lambda get-function \
     --function-name AlexaLunchDad-dev \
     --query 'Configuration.Description'
   ```

---

## CI/CD Integration

### GitHub Actions (Example Workflow)

The project includes `.github/workflows/deploy.yml` for automated deployments.

#### Workflow Triggers

- **Push to `develop`** → Deploy to dev environment
- **Push to `main`** → Deploy to prod environment (manual approval)

#### Required GitHub Secrets

Set the following secrets in GitHub repository settings:

```
AWS_ACCESS_KEY_ID          # AWS access key
AWS_SECRET_ACCESS_KEY      # AWS secret key
ALEXA_SKILL_ID_DEV         # Dev skill ID
ALEXA_SKILL_ID_PROD        # Prod skill ID
```

#### Manual Deployment via GitHub Actions

1. Go to "Actions" tab in GitHub
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
4. Select branch and environment
5. Click "Run workflow"

### Local CI Simulation

```bash
# Run full CI build process locally
npm run ci:build

# Deploy via CI process
npm run ci:deploy
```

---

## Best Practices

### 1. Pre-Deployment Checks

```bash
# Run all checks before deployment
npm test                    # Run tests
npm run lint               # Check code style
npm run validate           # Validate SAM template
npm run build              # Build application
```

### 2. Environment Separation

- Always test in dev before deploying to prod
- Use different Skill IDs for dev and prod
- Keep parameter configurations separate
- Monitor both environments independently

### 3. Version Control

- Tag production releases
  ```bash
  git tag -a v1.0.0 -m "Production release v1.0.0"
  git push origin v1.0.0
  ```
- Keep deployment history in Git
- Document changes in commit messages

### 4. Security

- Never commit AWS credentials
- Use IAM roles with least privilege
- Rotate access keys regularly
- Enable CloudTrail for audit logs
- Review IAM policies periodically

### 5. Cost Optimization

- Set appropriate log retention (7 days for dev, 30 for prod)
- Monitor Lambda invocations
- Use caching to reduce API calls
- Review CloudWatch costs monthly

---

## Additional Resources

### AWS Documentation

- [SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

### Alexa Documentation

- [Alexa Skills Kit](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/what-is-the-alexa-skills-kit.html)
- [ASK SDK for Node.js](https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/overview.html)

### Project Documentation

- [README.md](../README.md) - Project overview
- [TESTING.md](./TESTING.md) - Testing guide
- [API.md](./API.md) - API documentation (if available)

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review CloudWatch logs
3. Consult AWS/Alexa documentation
4. Open GitHub issue with details

---

**Last Updated**: 2025-10-22
**Version**: 1.0.0
