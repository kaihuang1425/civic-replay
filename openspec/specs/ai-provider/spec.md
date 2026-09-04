# AI Provider Specification

## Purpose

A provider-agnostic AI interface used by sandbox generation and the AI Engine, so
the product can run against a local Ollama model now and swap to a different
provider (e.g. OpenAI API) later without changing engine or generation code.

## Requirements

### Requirement: Provider-agnostic AI interface

The system SHALL define a single internal AI interface exposing at least:
`generateStructured(schema, prompt, options)` returning an object validated
against the given schema, and `complete(prompt, options)` returning text. All
sandbox-generation and AI-Engine code SHALL depend only on this interface, never
on a concrete provider SDK.

#### Scenario: Engine code is provider-independent

- **WHEN** the replay engine or sandbox generator needs an AI decision
- **THEN** it calls the AI interface only, and no provider-specific type or client
  appears outside the provider implementation module

### Requirement: Ollama default provider

The system SHALL ship an Ollama-backed provider as the default, targeting model
`gpt-oss:120b-cloud`, with host and model name configurable via environment
(`OLLAMA_HOST`, `OLLAMA_MODEL`). It SHALL request JSON-formatted output for
`generateStructured` and parse/validate it against the requested schema.

#### Scenario: Structured call against Ollama

- **WHEN** `generateStructured` is called with a schema for a `StepOutcome`
- **THEN** the provider queries the configured Ollama model and returns an object
  that conforms to the schema

#### Scenario: Configurable model and host

- **WHEN** `OLLAMA_HOST` and `OLLAMA_MODEL` are set
- **THEN** the provider uses those values instead of the defaults

### Requirement: Provider selection

The system SHALL select the active provider from an environment variable (e.g.
`AI_PROVIDER=ollama`) with `ollama` as the default, and SHALL be structured so
that adding a new provider is limited to implementing the AI interface and
registering it — no changes to callers.

#### Scenario: Default provider

- **WHEN** no `AI_PROVIDER` is set
- **THEN** the Ollama provider is used

#### Scenario: Unknown provider is rejected at startup

- **WHEN** `AI_PROVIDER` names a provider that is not registered
- **THEN** the server fails fast at startup with a clear error naming the
  available providers

### Requirement: Structured-output validation and repair

`generateStructured` SHALL validate the model response against the schema and,
on a validation failure, retry once with a repair prompt that includes the
validation error. If it still fails, it SHALL raise a typed error the caller can
handle (used by the engine's safe-degradation path).

#### Scenario: Invalid JSON is repaired

- **WHEN** the model returns text that is not valid JSON for the schema
- **THEN** the provider retries once with a repair prompt and returns the valid
  result if the retry succeeds

#### Scenario: Persistent failure raises a typed error

- **WHEN** the model output still fails validation after one repair attempt
- **THEN** the provider throws a typed `AIStructuredOutputError` rather than
  returning malformed data

### Requirement: Availability check and graceful degradation

The system SHALL provide a health check for the active provider, and callers
SHALL treat provider unavailability as a recoverable condition (fallback sandbox
generation; `NEED_HELP` + `requiresHumanValidation` for engine steps) rather than
a fatal error.

#### Scenario: Health check reports provider status

- **WHEN** the provider health check runs and Ollama is unreachable
- **THEN** it reports the provider as unavailable with a reason, and the console
  can surface a degraded-mode indicator
