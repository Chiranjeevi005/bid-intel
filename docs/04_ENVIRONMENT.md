# Pre-Bid Intelligence MVP — Environment Configuration

**Document:** 04_ENVIRONMENT.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document defines how the application is configured across development, preview, and production environments.

The primary goals are:

- keep secrets out of source control
- make environments reproducible
- clearly distinguish public configuration from secrets
- prevent accidental production configuration in local development
- make deployment configuration traceable

---

# 2. Environment Model

The application uses three conceptual environments:

```text
Local Development
       ↓
Preview / Testing
       ↓
Production
```

## Local Development

Used by developers and Antigravity during implementation.

Typical command:

```bash
npm run dev
```

## Preview

Used to test changes before production deployment.

The exact preview workflow is managed by Vercel/GitHub.

## Production

The live application deployed through Vercel.

---

# 3. Environment Variable Principle

Environment variables are configuration.

They are NOT source code.

Secrets must never be committed to GitHub.

The repository contains:

```text
.env.example
```

The actual local configuration is stored in:

```text
.env.local
```

`.env.local` must remain ignored by Git.

---

# 4. Phase 1 Environment Variables

## Supabase

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

These identify the Supabase project and provide the browser-safe client key.

---

## Google Analytics

```text
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

This identifies the GA4 property used by the application.

If this value is missing:

> The application must continue working normally.

---

# 5. Future Environment Variables

The following are NOT required in Phase 1.

They are listed only to establish a clear boundary.

## AI

Possible future variables:

```text
AI_API_KEY
AI_MODEL
```

The exact provider and variable names will be decided when AI integration is implemented.

---

## Payment

Possible future variables:

```text
PAYMENT_API_KEY
PAYMENT_WEBHOOK_SECRET
```

The actual provider and names are intentionally not locked.

---

## Server-side Supabase

A service-role credential may eventually be required for trusted server-side operations.

It must NEVER be exposed to client-side code.

The exact variable name and implementation will be decided when server-side privileged operations become necessary.

---

# 6. Public vs Secret Configuration

## Public configuration

A value may use the `NEXT_PUBLIC_` prefix only when it is intentionally safe to expose to browser code.

Examples:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

The use of a public Supabase client key does NOT mean database security can be ignored.

Database authorization must be enforced through appropriate Supabase policies when data tables are introduced.

---

# 7. Secrets

Examples of secrets:

* service-role keys
* AI API keys
* payment API secrets
* webhook signing secrets
* database passwords
* private credentials

These must:

* remain outside source code
* remain outside GitHub
* be configured through the deployment environment
* never be logged to the browser
* never be included in screenshots or documentation

---

# 8. `.env.example`

The repository must contain a template similar to:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

The file contains names only.

It must not contain real credentials.

---

# 9. `.gitignore`

The repository must ignore:

```text
.env
.env.local
.env.*.local
```

while allowing:

```text
.env.example
```

to remain committed.

The exact `.gitignore` syntax may follow the framework's generated defaults.

---

# 10. Local Setup

A new developer should be able to:

```bash
git clone <repository>
cd <repository>
npm install
```

Then create:

```text
.env.local
```

from:

```text
.env.example
```

and populate the required values.

Then:

```bash
npm run dev
```

---

# 11. Configuration Validation

The application should fail clearly when a required server-side configuration value is genuinely necessary.

It should NOT expose secret values in error messages.

Example of acceptable error:

```text
Required environment configuration is missing.
```

Example of unacceptable error:

```text
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

# 12. Local vs Production

Local configuration and production configuration must be independent.

Example:

```text
Local
  ↓
Local environment variables
  ↓
Development Supabase resources

Production
  ↓
Vercel environment variables
  ↓
Production Supabase resources
```

Do not assume that local and production credentials are interchangeable.

---

# 13. Vercel Configuration

Production environment variables will be configured through Vercel.

Do not commit production secrets to GitHub.

The deployment pipeline should retrieve environment configuration from Vercel.

---

# 14. Environment Safety Rules

Never:

* hard-code credentials
* commit `.env.local`
* print secrets in logs
* return secrets through API responses
* place server-only secrets in client components
* expose payment/webhook secrets
* expose AI API keys
* copy production credentials into documentation

---

# 15. Client/Server Boundary

The application must distinguish between:

```text
Browser-safe configuration
```

and:

```text
Server-only configuration
```

A server-only secret must never be imported into a client component.

When server-side services are introduced, their implementation should live behind an appropriate server-only boundary.

---

# 16. Environment Change Process

If a new environment variable becomes necessary:

1. Explain why it is needed.
2. Determine whether it is public or secret.
3. Add the variable name to `.env.example`.
4. Document it here.
5. Configure it locally where required.
6. Configure it in Vercel where required.
7. Verify the application.
8. Record the decision if it represents a significant architectural dependency.

---

# 17. Phase 1 Required Configuration

Before Phase 1 is considered complete:

```text
[ ] .env.example exists
[ ] .env.local is ignored
[ ] Supabase configuration is documented
[ ] GA4 configuration is documented
[ ] No secrets are committed
[ ] Local application starts
[ ] Production application starts
[ ] Missing optional analytics configuration does not break the application
```

---

# 18. Troubleshooting Principle

When an environment-related error occurs:

Do NOT immediately add another package or workaround.

First determine:

1. Is the variable missing?
2. Is the variable incorrectly named?
3. Is the variable configured for the correct environment?
4. Is the code reading it from the correct server/client context?
5. Is the external service configured correctly?

Only then modify the implementation.

---

# 19. Cost Principle

Environment configuration should not introduce unnecessary paid services.

Phase 1 should remain compatible with:

* Supabase Free
* Vercel Free
* GitHub Free
* Google Analytics

unless actual requirements demonstrate otherwise.

---

# 20. Current Status

**PHASE 1 — ENVIRONMENT FOUNDATION**

Status:

**IN PROGRESS**

No production secrets should exist in this document.

---

# 21. Core Principle

> **Configuration should be explicit, reproducible, environment-specific, and never hidden inside application code.**
