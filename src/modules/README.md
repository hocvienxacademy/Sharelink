# Backend module boundaries

Each feature under `src/modules` owns its domain behavior. Add code to a
module only when the corresponding API behavior is implemented:

```text
<module>/
  domain/          Entities, value objects, and business rules
  application/     Use cases, services, ports, and safe output DTOs
  infrastructure/ Prisma repositories and external adapters
  presentation/    HTTP validation and route/controller adapters
  index.ts         The module's public exports only
```

Cross-cutting primitives belong under `src/shared`:

- `errors`: stable application errors and public error codes.
- `http`: framework-independent API response envelopes.
- `http/next`: Next.js request/response adapters. Feature handlers remain in
  their owning module's `presentation/http` directory.
- `infrastructure/database/prisma`: the Prisma singleton and database-error
  mapping.
- `validation`: validation contracts and issue types. A future Zod adapter
  should implement `Validator<T>` here; feature schemas remain in the owning
  module's application validation boundary.

`src/composition` is the only place that constructs Prisma repositories and
wires them into application services. Next.js Route Handlers import completed
services from this composition root and never import Prisma directly.

Route handlers must only parse the request, invoke feature validation and an
application service, then convert its result to an HTTP response. Prisma
queries stay in a module's `infrastructure` layer and must select only the
fields needed by the service's output DTO.

No geographic catalog module is defined yet because the current Prisma schema
has no province, district, or ward models.
