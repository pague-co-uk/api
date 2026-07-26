# Control Plane API Standards

## Purpose

This document defines the architectural standards for all HTTP APIs in
the SMS Gateway platform. Every service should follow these conventions
to ensure consistency, maintainability, observability, and long-term
scalability.

------------------------------------------------------------------------

# 1. Response Format

## Success

``` json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

## Collection

``` json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

# 2. Error Format

``` json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The requested user does not exist.",
    "details": [],
    "path": "/api/v1/users/1"
  },
  "meta": {
    "requestId": "...",
    "timestamp": "..."
  }
}
```

A global exception filter is responsible for mapping framework,
validation, Prisma and infrastructure exceptions into this format. Stack
traces are logged, never returned.

# 3. Validation

Use one global ValidationPipe with: - whitelist=true -
forbidNonWhitelisted=true - transform=true

# 4. Pagination

Offset pagination for administrative endpoints.

`GET /api/v1/users?page=2&pageSize=25`

Cursor pagination may be introduced later for high-volume resources.

# 5. Filtering

Examples:

-   `?status=ACTIVE`
-   `?role=ADMIN`
-   `?provider=vodacom`
-   `?status=ACTIVE,SUSPENDED`

# 6. Sorting

-   `?sort=name`
-   `?sort=-createdAt`
-   `?sort=status,-createdAt`

# 7. Searching

`?search=john`

# 8. Authentication

-   JWT access tokens
-   Refresh token rotation
-   Session tracking
-   HTTP-only cookies for browsers
-   Bearer tokens for API clients

# 9. Authorization

Permission-based authorization only.

``` ts
@RequirePermissions(Permissions.USERS_READ)
```

Roles grant permissions; controllers and services authorize against
permissions, never roles.

# 10. Caching

Abstract all caching behind a CacheService.

Initial implementation: - In-memory

Future: - Redis

Primary cache candidates: - Permissions - Routing rules - Provider
configuration - Tenant configuration

# 11. Audit Logging

Every mutating endpoint emits an audit event.

Examples: - UserCreated - UserUpdated - RoleAssigned - ProviderUpdated

# 12. API Versioning

All endpoints use:

`/api/v1/...`

# 13. Correlation

Every response includes: - requestId - timestamp

# 14. OpenAPI

Generated automatically from DTOs.

# 15. Common Module

``` text
common/
    auth/
    cache/
    decorators/
    dto/
    exceptions/
    filters/
    guards/
    interceptors/
    pagination/
    pipes/
    responses/
    types/
    utils/
```

------------------------------------------------------------------------

# 16. Repository Standards

Repositories own persistence.

Responsibilities: - Encapsulate all Prisma access - No business logic -
Hide ORM implementation - Return persistence/domain models

Common methods:

-   findById
-   findMany
-   exists
-   create
-   update
-   delete
-   count
-   upsert

Repositories never throw HTTP exceptions and never publish events.

------------------------------------------------------------------------

# 17. Service Standards

Services own business logic.

Responsibilities: - Business rules - Transactions - Repository
orchestration - External integrations - Queue publishing - Authorization
decisions

Architecture:

``` text
Controller
    ↓
Service
    ↓
Repository
```

------------------------------------------------------------------------

# 18. Transaction Standards

The service layer owns transactions.

Repositories participate in transactions but never start them.

------------------------------------------------------------------------

# 19. DTO Standards

Separate persistence models from API contracts.

``` text
Prisma Entity
      ↓
Mapper
      ↓
Response DTO
```

Use dedicated DTOs for: - Create - Update - Response - List - Search

------------------------------------------------------------------------

# 20. Mapping Standards

Use dedicated mappers.

``` text
UserMapper
    toResponse()
    toSummary()
    toEntity()
```

------------------------------------------------------------------------

# 21. Dependency Injection Standards

Controllers: - Services - Logger

Services: - Repositories - Queue Client - Cache - HTTP clients -
Logger - Metrics - Tracing

Repositories: - Prisma - Logger

------------------------------------------------------------------------

# 22. Logging Standards

Use the shared telemetry package.

Log: - Startup - Shutdown - Business events - State transitions -
Integration events - Errors

Never log: - Passwords - Access tokens - Refresh tokens - SMS message
content - Unmasked phone numbers

Levels: - trace - debug - info - warn - error - fatal

------------------------------------------------------------------------

# 23. Tracing Standards

Create root spans for: - HTTP requests - Queue consumers - Scheduled
jobs

Create child spans for: - Database - RabbitMQ - External HTTP - SMPP

Useful attributes: - tenantId - provider - queue - resourceId -
operation

Never record secrets or message bodies.

------------------------------------------------------------------------

# 24. Metrics Standards

Counters: - messages.accepted - messages.rejected - auth.login.success -
auth.login.failed

Histograms: - api.duration - database.duration -
queue.publish.duration - queue.consume.duration

UpDownCounters: - active.sessions - active.connections -
active.workers - smpp.sessions

Rules: - Create metrics once - Reuse them - Avoid high-cardinality
labels

------------------------------------------------------------------------

# 25. Event Publishing Standards

Only services publish events.

Each event should include: - eventId - occurredAt - correlationId -
tenantId - version

------------------------------------------------------------------------

# 26. Error Handling Standards

Controllers: - Never catch business exceptions.

Services: - Throw domain exceptions.

Repositories: - Throw persistence exceptions only.

Global exception filter maps all exceptions to the standard API
response.

------------------------------------------------------------------------

# 27. Testing Standards

Unit tests: - Services - Repositories - Mappers - Utilities

Integration tests: - Database - RabbitMQ - Cache

End-to-end tests: - Authentication - HTTP APIs - Full request lifecycle

------------------------------------------------------------------------

# 28. Module Structure

``` text
feature/
├── controllers/
├── services/
├── repositories/
├── dto/
├── mappers/
├── entities/
├── exceptions/
├── constants/
├── interfaces/
├── responses/
├── feature.module.ts
└── index.ts
```

------------------------------------------------------------------------

# 29. Configuration Standards

Never access `process.env` outside the configuration layer.

Use `AppConfigService` throughout the application.

------------------------------------------------------------------------

# 30. Security Standards

-   Validate all input
-   Least privilege authorization
-   Rate limit sensitive endpoints
-   Never log secrets
-   Hash passwords
-   Use parameterized queries
-   Return sanitized error messages

------------------------------------------------------------------------

# Observability Standards

## Logging

Use: - Loggers.app - Loggers.database - Loggers.rabbitmq -
Loggers.http - Loggers.smpp

## Tracing

Use spans around: - Controllers (when useful) - Services -
Transactions - Queue publish/consume - External HTTP - SMPP

## Metrics

Use counters, histograms and UpDownCounters only for operational
insight. Avoid high-cardinality labels.

------------------------------------------------------------------------

# Layering

``` text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
```

Controllers never access Prisma directly.

------------------------------------------------------------------------

# Engineering Principles

1.  Simplicity over cleverness.
2.  Convention over configuration.
3.  Composition over inheritance.
4.  Explicit over implicit.
5.  Business logic belongs in services.
6.  Persistence belongs in repositories.
7.  Controllers coordinate HTTP only.
8.  Observability is built in, not added later.
9.  Every operation should be testable.
10. Public APIs should remain stable and backward compatible.
