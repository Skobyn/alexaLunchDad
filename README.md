# Alexa Lunch Dad

An Alexa skill that helps you decide what to eat for lunch with fun, dad-style recommendations.

## Features

- Random lunch recommendations
- Built with Alexa Skills Kit (ASK) SDK
- AWS Lambda backend
- Automated CI/CD with GitHub Actions
- Infrastructure as Code with AWS SAM

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

## Project Structure

```
alexaLunchDad/
├── src/
│   ├── index.js                    # Lambda handler entry point
│   ├── handlers/                   # Request handlers
│   │   ├── LaunchRequestHandler.js
│   │   ├── HelpIntentHandler.js
│   │   ├── CancelAndStopIntentHandler.js
│   │   ├── SessionEndedRequestHandler.js
│   │   └── ErrorHandler.js
│   ├── intents/                    # Intent handlers
│   │   └── GetLunchIntentHandler.js
│   └── utils/                      # Utility functions
│       └── lunchRecommendations.js
├── tests/
│   ├── unit/                       # Unit tests
│   └── integration/                # Integration tests
├── config/
│   ├── skill.json                  # Alexa skill manifest
│   └── interaction-model.json      # Voice interaction model
├── scripts/
│   ├── deploy-dev.sh              # Development deployment
│   └── deploy-prod.sh             # Production deployment
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions CI/CD
├── template.yaml                   # AWS SAM template
└── package.json

```

## Development Workflow

### Claude Code → GitHub → AWS Pipeline

This project uses a complete automation pipeline:

1. **Development with Claude Code**: Write and modify code using Claude Code CLI
2. **Version Control**: Commit changes to GitHub
3. **Automated CI/CD**: GitHub Actions automatically deploys to AWS Lambda
4. **Alexa Integration**: Skill automatically updates on deployment

### Branch Strategy

- `main` - Production environment
- `develop` - Development environment
- `feature/*` - Feature branches

## Documentation

- [Setup Guide](docs/SETUP.md) - Complete setup instructions
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment workflows and troubleshooting
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run linter
npm run lint
```

## Deployment

### Prerequisites

- AWS Account
- Amazon Developer Account (for Alexa)
- AWS CLI configured
- SAM CLI installed
- Node.js 18+

### Deploy to Development

```bash
# Using npm script
npm run deploy:dev

# Or using script
./scripts/deploy-dev.sh
```

### Deploy to Production

```bash
# Using npm script
npm run deploy:prod

# Or using script
./scripts/deploy-prod.sh
```

### Automated Deployment

Push to branches to trigger automatic deployment:

- Push to `develop` → Deploys to development
- Push to `main` → Deploys to production

## GitHub Secrets Required

Configure these in your repository settings:

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `ALEXA_SKILL_ID_DEV` - Development skill ID
- `ALEXA_SKILL_ID_PROD` - Production skill ID

## Alexa Skill Invocation

```
User: "Alexa, open lunch dad"
Alexa: "Welcome to Lunch Dad! Ask me for a lunch recommendation..."

User: "What should I eat for lunch?"
Alexa: "How about a fresh Caesar salad with grilled chicken? That sounds delicious for lunch!"
```

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Alexa     │─────▶│  API Gateway│─────▶│   Lambda    │
│   Device    │      │   (Alexa)   │      │  Function   │
└─────────────┘      └─────────────┘      └─────────────┘
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │ CloudWatch  │
                                          │    Logs     │
                                          └─────────────┘
```

## Built With

- [Alexa Skills Kit SDK](https://github.com/alexa/alexa-skills-kit-sdk-for-nodejs) - Alexa development framework
- [AWS Lambda](https://aws.amazon.com/lambda/) - Serverless compute
- [AWS SAM](https://aws.amazon.com/serverless/sam/) - Infrastructure as Code
- [GitHub Actions](https://github.com/features/actions) - CI/CD automation
- [Jest](https://jestjs.io/) - Testing framework

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT

## Support

For issues and questions:
- Open an issue on GitHub
- Check [Setup Guide](docs/SETUP.md) for common issues

## Roadmap

- [ ] Add user preferences with DynamoDB
- [ ] Implement cuisine type slots
- [ ] Add dietary restriction filtering
- [ ] Multi-language support
- [ ] Location-based recommendations
- [ ] Integration with restaurant APIs

---

Built with Claude Code CLI and automated with GitHub Actions
