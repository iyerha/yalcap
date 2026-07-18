# Contributing to YALCAP

Thanks for helping build YALCAP.

This project is focused on a minimalist enterprise workflow framework where business logic stays central and platform code stays small.

## Before You Start

- Read [readme.md](readme.md) for project vision and setup
- Check open issues and discussions for ongoing work
- Prefer small, focused pull requests

## Local Setup

1. Start local dependencies if needed:

```bash
docker compose up -d
```

2. Run the core module:

```bash
mvn -pl yalcap-core spring-boot:run
```

3. Run tests before opening a pull request:

```bash
mvn -pl yalcap-core test
```

## Contribution Guidelines

- Keep changes aligned with the minimalist framework vision
- Avoid introducing unnecessary abstraction or framework complexity
- Prefer explicit domain behavior over hidden magic
- Add or update tests for behavior changes
- Keep UI and runtime rule behavior readable for business users and developers

## Pull Request Checklist

- Code compiles and tests pass locally
- New behavior is covered by tests
- Docs are updated for user-facing or contributor-facing changes
- PR description explains why the change matters for business-logic-first development

## Suggested Areas to Contribute

- Workflow and rule engine reliability
- Form designer usability and maintainability
- Documentation and examples for extension patterns
- Performance and operational hardening

## Communication

Be respectful, direct, and constructive.

For conduct expectations, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).