# Architectural decisions

Although the challenge has only three endpoints, the implementation was structured to show how a small API can remain testable, predictable, and evolvable without coupling business rules to the HTTP framework or the database.

The goal was not to reproduce the full complexity of an enterprise system, but to apply architectural boundaries only where they solve concrete problems.

## Separation of domain, application, and infrastructure

Menu-related rules do not depend directly on Express, Mongoose, or MongoDB.

This separation allows:

* testing use cases without starting a server or database;
* replacing persistence details without changing business rules;
* preventing framework specifics from leaking into the application;
* keeping controllers responsible only for the HTTP protocol.

The main flow is:

```text
HTTP → Controller → Use Case → Repository Port → MongoDB Adapter
```

## Explicit use cases

Each API operation is represented by a specific use case:

* item creation;
* item deletion;
* full tree retrieval.

This split avoids generic services with multiple responsibilities and makes each operation's rules easier to locate, test, and change.

## Repository as a port

Use cases depend on a repository contract, not directly on Mongoose.

This decision enables unit tests with in-memory implementations and keeps details such as schemas, queries, and MongoDB operators confined to the infrastructure layer.

The abstraction was not created to anticipate multiple databases, but to prevent application logic from depending on the persistence technology.

## Public identifier separate from ObjectId

MongoDB uses `ObjectId` internally, but the challenge contract works with numeric identifiers and the `relatedId` field.

Therefore, the application keeps a numeric public identifier separate from MongoDB's internal identifier.

This decision:

* preserves the external contract;
* avoids exposing database details;
* keeps references between items consistent;
* allows changing persistence without modifying the API.

## Atomic identifier generation

Identifier generation uses an atomic MongoDB operation.

Computing the next identifier from the current maximum value could produce collisions when two requests are processed concurrently.

The atomic counter ensures each creation receives a unique identifier even under concurrency.

## Hierarchical representation via adjacency list

Each item stores only a reference to its parent.

This representation was chosen because it:

* simplifies item creation;
* allows arbitrary depth;
* avoids duplicating the entire tree in every document;
* keeps changes local and predictable;
* maps directly to the `relatedId` field defined by the challenge.

## In-memory tree construction

The query loads all items in a single operation and builds the tree using maps indexed by identifier.

This process is O(n) and avoids:

* one database query per level;
* recursive persistence access;
* N+1 behavior;
* aggregation pipelines tightly coupled to MongoDB.

Tree assembly remains a pure domain function, enabling tests independent of infrastructure.

## Subtree deletion

When an item is deleted, its descendants must also be removed to avoid orphaned records.

The model keeps enough information to identify the subtree without relying on multiple recursive queries in the application.

This decision preserves hierarchical integrity and makes the deletion semantics explicit.

## Typed errors

Domain and application errors are represented by dedicated types, such as:

* missing parent item;
* item not found;
* duplicate name;
* hierarchical inconsistency.

The controller does not interpret MongoDB internal codes or know details such as duplicate-index errors. Infrastructure converts technical failures into errors understood by the application, and the HTTP layer maps those errors to appropriate status codes.

## Validation at the edge

Data received by the API is validated before reaching the use cases.

HTTP validation guarantees format and basic types. Use cases remain responsible for business rules, such as parent existence and name uniqueness.

This separation avoids mixing transport validation with domain validation.

## Explicit dependency composition

Dependencies are instantiated in the application's main composition layer.

Controllers and use cases do not create repositories, models, or connections directly. This makes the dependency graph visible and avoids service locators or hidden dependencies.

## Testing strategy

The number of tests is not tied to the number of endpoints, but to the behaviors and risks involved.

The suite is split by purpose:

* unit tests for domain rules and use cases;
* integration tests for MongoDB adapters;
* HTTP tests for API contract validation;
* concurrency tests for identifier generation;
* architecture tests to preserve layer boundaries;
* documentation tests to keep OpenAPI aligned with the implementation.

Each test level protects a different responsibility. The goal is not to test the same implementation multiple times, but to catch failures at the level closest to their origin.

## Quality gates

Linting, type checking, tests, and documentation validation run automatically.

These checks prevent seemingly small changes from introducing:

* typing errors;
* architectural boundary violations;
* divergence between code and OpenAPI;
* HTTP contract regressions;
* MongoDB integration failures.

## Trade-offs

This architecture has more files and concepts than an implementation based only on routes, controllers, and models.

The accepted cost is a larger initial structure. In return, the solution offers:

* rules isolated from frameworks;
* faster, more focused tests;
* explicit dependencies;
* lower coupling to MongoDB;
* predictable error handling;
* greater safety for evolution.

For a throwaway API, this structure would likely be unnecessary. For this challenge, it was adopted deliberately to demonstrate code organization, concurrency, testability, data integrity, and evolvability.

## What was not abstracted

The architecture does not try to abstract every detail or anticipate nonexistent requirements.

No generalizations were created for multiple databases, multiple protocols, or features outside the challenge.

Existing abstractions correspond to real boundaries:

* HTTP entry;
* use case execution;
* persistence;
* identifier generation;
* hierarchy assembly.

The goal is to keep structural complexity justifiable, not to maximize the number of patterns used.
