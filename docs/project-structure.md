# Project Structure

## 📁 Organized Directory Layout

```
chatBETO-listener/                    # Project root
├── 📄 README.md                     # Quick start guide
├── 📄 package.json                  # Dependencies and scripts
├── 📄 server.js                     # Application entry point
├── 📄 Dockerfile                    # Container definition
├── 🔧 .env                         # Environment variables (local)
├── 🔧 .env.example                 # Environment template
├── 📄 .gitignore                   # Git exclusions
│
├── 📁 src/                         # Application source code
│   ├── 📁 controllers/             # Request handlers
│   │   └── webhook.js              # Webhook event handlers
│   ├── 📁 middleware/              # Express middleware
│   │   └── auth.js                 # Authentication & security
│   ├── 📁 routes/                  # Route definitions
│   │   └── webhook.js              # Webhook routes
│   ├── 📁 services/                # Business logic
│   │   ├── database.js             # Database connection & queries
│   │   └── logger.js               # Logging service
│   ├── 📁 utils/                   # Helper utilities
│   │   └── validation.js           # Data validation
│   └── 📁 models/                  # Data models (empty for now)
│
├── 📁 config/                      # Configuration files
│   └── config.js                   # Environment configuration
│
├── 📁 docs/                        # Documentation
│   ├── api.md                      # API reference
│   ├── deployment.md               # Deployment guide
│   └── detailed-documentation.md   # Complete documentation
│
├── 📁 scripts/                     # Utility scripts
│   ├── 📁 deployment/              # Production deployment
│   │   ├── deploy.sh               # Automated deployment
│   │   └── docker-compose.yml      # Container orchestration
│   └── 📁 utils/                   # Development utilities
│       ├── dev-start.sh            # Development startup
│       └── health-check.sh         # Health monitoring
│
├── 📁 tests/                       # Test files
│   └── server.test.js              # API tests
│
└── 📁 logs/                        # Application logs
    ├── app.log                     # All logs
    └── error.log                   # Error logs only
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- Controllers handle HTTP requests
- Services contain business logic
- Middleware handles cross-cutting concerns
- Utils provide helper functions

### 2. **Clean Architecture**
- Clear folder structure
- Logical grouping of files
- Easy to navigate and maintain

### 3. **Production Ready**
- Proper error handling
- Security middleware
- Logging and monitoring
- Docker containerization

### 4. **Developer Experience**
- Comprehensive documentation
- Utility scripts
- Clear configuration
- Testing framework

## 📋 File Purposes

### Core Application
- **server.js**: Main application entry point with Express setup
- **config/config.js**: Centralized configuration management

### Source Code Organization
- **src/controllers/**: Handle incoming HTTP requests
- **src/middleware/**: Express middleware for auth, validation, etc.
- **src/services/**: Business logic and external service integrations
- **src/routes/**: API route definitions and organization
- **src/utils/**: Pure utility functions and helpers

### Development & Operations
- **scripts/deployment/**: Production deployment automation
- **scripts/utils/**: Development and maintenance utilities
- **docs/**: Comprehensive project documentation
- **tests/**: Test suites for reliability

### Configuration & Deployment
- **Dockerfile**: Container image definition
- **docker-compose.yml**: Multi-service orchestration
- **.env**: Environment-specific configuration

## 🚀 Usage Patterns

### Development Workflow
```bash
npm run dev:start     # Start with checks
npm run dev          # Start normally
npm run test         # Run tests
npm run health:check # Check service health
```

### Production Deployment
```bash
npm run deploy:prod  # Full automated deployment
npm run docker:deploy # Docker only
```

### Monitoring & Maintenance
```bash
npm run docker:logs  # View container logs
npm run health:check # Health check
```

This structure ensures maintainability, scalability, and professional development practices.