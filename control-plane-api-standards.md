# Control Plane API Standards

## Purpose

This document defines the architectural standards for all HTTP APIs in
the SMS Gateway platform. Every service should follow these conventions.

## 1. Response Format

### Success

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

### Collection

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

## 2. Error Format

``` json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "The requested user does not exist.",
    "details": [],
    "path": "/api/users/1"
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

## 3. Validation

Use one global ValidationPipe with: - whitelist=true -
forbidNonWhitelisted=true - transform=true

## 4. Pagination

Offset pagination for administrative endpoints.

Example: `GET /users?page=2&pageSize=25`

Cursor pagination may be introduced later for high-volume resources such
as messages.

## 5. Filtering

Examples:

-   `?status=ACTIVE`
-   `?role=ADMIN`
-   `?provider=vodacom`
-   `?status=ACTIVE,SUSPENDED`

## 6. Sorting

Examples:

-   `?sort=name`
-   `?sort=-createdAt`
-   `?sort=status,-createdAt`

## 7. Searching

Use:

`?search=john`

## 8. Authentication

-   JWT access tokens
-   Refresh token rotation
-   Session tracking
-   HTTP-only cookies for browser clients
-   Bearer tokens for API clients

## 9. Authorization

Permission-based authorization.

Example:

``` ts
@RequirePermissions(Permissions.USERS_READ)
```

Do not authorize directly on roles. Roles map to permissions.

## 10. Caching

Abstract behind a CacheService.

Initial implementation: - In-memory

Future: - Redis

Primary cache candidates: - Permissions - Routing rules - Provider
configuration - Tenant configuration

## 11. Audit Logging

Every mutating endpoint emits an audit event.

Examples: - UserCreated - UserUpdated - RoleAssigned - ProviderUpdated

## 12. API Versioning

All endpoints use:

`/api/v1/...`

## 13. Correlation

Every response includes: - requestId - timestamp

These correlate directly with logs and traces.

## 14. OpenAPI

Generated automatically from DTOs.

## 15. Common Module

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

Business modules reuse these shared components.

# Observability Standards

## Logging

Use the shared telemetry package.

-   `Loggers.app`
-   `Loggers.database`
-   `Loggers.rabbitmq`
-   `Loggers.http`
-   `Loggers.smpp`

Log business events and meaningful state transitions. Avoid logging
sensitive data.

## Tracing

Use the shared Tracer for important business operations.

Create spans around: - Controller entry (when additional context is
useful) - Service operations - Database transactions spanning multiple
operations - RabbitMQ publish/consume - External HTTP calls - SMPP
operations

Annotate spans with: - resource identifiers - provider - tenant - queue
name - message id

Record exceptions on spans before rethrowing.

## Metrics

Use Meter only for measurements that provide operational insight.

Counters: - Messages accepted - Messages rejected - Login attempts -
Authentication failures - Queue publishes - Queue consumes

Histograms: - API latency - Database query duration - Queue publish
duration - SMPP response latency

UpDownCounters: - Active sessions - Connected SMPP sessions - Queue
consumers - Active workers

Avoid high-cardinality metric labels.

## Layering

    Controller
        ↓
    Service
        ↓
    Repository
        ↓
    Prisma

Repositories own all database access. Controllers never access Prisma
directly.
