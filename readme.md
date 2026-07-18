# YALCAP

YALCAP is a minimalist framework for developers who build enterprise applications and workflows.

The goal is to remove boilerplate and heavy lifting so teams can focus on business logic, domain rules, and delivery speed.

## Vision

Enterprise workflow systems are often weighed down by repetitive platform code.

YALCAP aims to provide a clean, composable foundation where:

- workflow and form behavior are explicit and versioned
- runtime rules are first-class and testable
- infrastructure concerns are pre-wired with practical defaults
- developers stay in control of code, rather than being locked into opaque tooling

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

## Collaboration

If you want to help build YALCAP as an open source project, start here:

- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow, coding expectations, and PR checklist
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): collaboration standards for community participation

## Near-Term Collaboration Goals

- Keep the framework surface minimal while expanding enterprise capabilities
- Improve developer experience in the designer and runtime APIs
- Strengthen test coverage around rule evaluation and workflow behavior
- Document clear extension patterns for domain modules
