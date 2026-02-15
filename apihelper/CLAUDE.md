# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `@churchapps/apihelper` package - a Node.js/Express.js server-side utility library that provides common functionality for ChurchApps API projects. It serves as a foundation layer for building REST APIs with authentication, database access, AWS integration, and error handling.

## Key Dependencies

- **Core**: Express.js with Inversify for dependency injection
- **AWS SDK v3**: S3, SES, CloudWatch Logs, SSM Parameter Store
- **Database**: MySQL2 with connection pooling
- **Authentication**: JSON Web Tokens (JWT)
- **Depends on**: `@churchapps/helpers` (base utilities package)

## Common Development Commands

```bash
# Build the package
npm run clean      # Remove dist folder
npm run tsc        # TypeScript compilation only  
npm run build      # Full build (clean + tsc + copy-assets)

# Code quality
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix lint issues
npm run format     # Format code with Prettier
npm run format:check # Check formatting

# Local development
npm run build
npm link

# In consuming project
npm link @churchapps/apihelper

# Publishing
npm run build
npm publish --access=public
```

## Architecture Overview

### Core Components

1. **Authentication System** (`/auth`)
   - `CustomAuthProvider`: Inversify-based authentication provider
   - `AuthenticatedUser`: User session management with JWT
   - `Principal`: Security principal for authorization checks

2. **Base Controllers** (`/controllers`)
   - `CustomBaseController`: Extends Inversify's BaseHttpController
     - Provides error handling (`internalServerError`, `notFound`, `conflict`)
     - Authentication helpers (`loadUser`, `checkAccess`)
     - Request utilities (`getNumber`, `getBoolean`, `getDate`)
   - `ErrorController`: Centralized error logging to database

3. **AWS Integration** (`/helpers`)
   - `AwsHelper`: S3 operations, SSM parameter reading, presigned URLs
   - `FileStorageHelper`: Abstraction for file storage operations
   - `EmailHelper`: Dual support for SMTP and AWS SES
   - `LoggingHelper`: Winston logging with CloudWatch integration

4. **Database Layer** (`/helpers`)
   - `DB`: Promise-based MySQL query wrapper
   - `Pool`: MySQL connection pooling management
   - `MySqlHelper`: MySQL-specific utilities
   - `DBCreator`: Database schema creation utilities

### Key Technical Details

- **Inversify Decorators**: Controllers use `@controller`, `@httpGet`, etc.
- **Environment Configuration**: `EnvironmentBase` class handles env vars with SSM fallback
- **Email Templates**: HTML templates copied to dist/templates during build
- **TypeScript**: Targets ES2020 with decorators enabled, declaration files generated

### Important Notes

- **Build Process Issue**: The copy-assets script references `src/apiBase/tools/templates/*` but the actual path is `src/tools/templates/*`
- **No Test Suite**: Currently no tests configured in package.json
- **Environment Variables**: Expects `CONNECTION_STRING`, `ENCRYPTION_KEY`, `JWT_SECRET`, `SMTP_*` configs

## Usage Pattern

This package is designed to be extended by API projects:

```typescript
// Example controller
import { controller, httpGet } from "inversify-express-utils";
import { CustomBaseController } from "@churchapps/apihelper";

@controller("/api/example")
export class ExampleController extends CustomBaseController {
    @httpGet("/")
    public async getAll(req: express.Request, res: express.Response): Promise<any> {
        return this.actionWrapper(req, res, async () => {
            // Implementation
        });
    }
}
```

## Development Workflow

1. Controllers extend `CustomBaseController` for built-in error handling and utilities
2. Use `EnvironmentBase` for configuration management
3. Database queries through `DB.query()` or `DB.queryOne()`
4. AWS operations via `AwsHelper` static methods
5. Logging through `LoggingHelper.getInstance()` singleton