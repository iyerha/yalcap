# YALCAP

YALCAP is a minimalist, developer-first framework for building enterprise applications and workflows without traditional CRUD boilerplate or relational data modeling.

Instead of forcing teams into proprietary low-code tools or heavy visual modeling black boxes, YALCAP introduces a text-based, code-first alternative driven by pure HTML (htmx), human-readable YAML configurations, and search-first document indexing.

## Vision

Enterprise applications are often weighed down by repetitive data-mapping layers, rigid database schemas, and fragile synchronization loops. YALCAP eliminates this heavy lifting by providing a composable foundation where:
- Document-Envelope Architecture: Workflows are treated as evolving folders containing independent, form-specific JSON documents.
- Zero Database Migrations: Data is captured dynamically into an append-only ledger via standard HTML input names.
- No Intermediate JSON UI Schemas: Visual interfaces are written in native, semantic HTML/Thymeleaf templates using standard htmx for real-time behavior.
- Unified Search-First Indexing: All workflow documents are automatically structured into single root flow indexes with nested child document segments in Apache Solr, Elasticsearch, or OpenSearch.
- Version Control Harmony: Every form template, business validation rule, and routing path is a flat text file, guaranteeing clean Git diffs and zero visual merge conflicts.

## Guiding Principles

- Minimal core, strong extension points
- Convention over boilerplate
- Human-readable definitions and rules
- Production-minded defaults for data, validation, and operations
- Keep business logic close to the domain model

## Current Structure

- [yalcap-core](yalcap-core): Spring Boot module with workflow, form, designer, persistence, and web layers
- [docker-compose.yaml](docker-compose.yaml): local infrastructure for Postgres, Solr, and browser automation

## Quick Start

### Prerequisites

- Java 25
- Maven 3.9+
- Docker (optional, for local infrastructure)

### Start local dependencies

```bash
docker compose up -d
```

### Run the app

```bash
mvn -pl yalcap-core spring-boot:run
```

### Run tests

```bash
mvn -pl yalcap-core test
```

## Plugin API: Form Load Data

YALCAP now includes a server-side plugin API for form-load data hydration.

Purpose:

- fetch data from internal or external systems at form load time
- keep credentials and integration logic on the server
- merge provider output into the rule evaluation context

Core types:

- [FormLoadDataProvider.java](yalcap-core/src/main/java/com/yalcap/definition/form/load/FormLoadDataProvider.java)
- [FormLoadDataContext.java](yalcap-core/src/main/java/com/yalcap/definition/form/load/FormLoadDataContext.java)
- [FormLoadDataHydrationService.java](yalcap-core/src/main/java/com/yalcap/definition/form/load/FormLoadDataHydrationService.java)

To add a provider:

1. Implement `FormLoadDataProvider`.
2. Register it as a Spring bean.
3. Return an `ObjectNode` containing fields to merge into form-load data.

Providers are executed in order (`order()` then `id()`), and their output is merged before workflow rules are evaluated.

## Collaboration

If you want to help build YALCAP as an open source project, start here:

- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow, coding expectations, and PR checklist
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): collaboration standards for community participation

## Near-Term Collaboration Goals

- Keep the framework surface minimal while expanding enterprise capabilities
- Improve developer experience in the designer and runtime APIs
- Strengthen test coverage around rule evaluation and workflow behavior
- Document clear extension patterns for domain modules
