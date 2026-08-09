# Pre-Bid Intelligence MVP — Deployment

**Document:** 07_DEPLOYMENT.md  
**Version:** 0.1  
**Status:** LOCKED FOR PHASE 1  
**Last Updated:** 2026-08-09  
**Owner:** Engineering  
**Repository:** bid-intel

---

# 1. Purpose

This document defines how the Pre-Bid Intelligence MVP moves from local development to production.

The deployment system must be:

- reproducible
- simple
- traceable
- inexpensive
- secure
- easy to debug

---

# 2. Deployment Architecture

The initial deployment pipeline is:

```text
Developer
    ↓
Antigravity
    ↓
Git
    ↓
GitHub
    ↓
Vercel
    ↓
Production
```

---

# 3. Hosting Platform

## Production

**Vercel**

The application is built with Next.js, making Vercel the initial hosting platform.

---

# 4. Source of Truth

GitHub is the source of truth.

Production deployments should originate from the GitHub repository.

The deployment platform must not contain undocumented source-code changes that do not exist in Git.

---

# 5. Branch Strategy

Initial simple strategy:

```text
main
```

represents production-ready code.

Feature development may use branches when useful:

```text
main
 ├── feature/...
 ├── fix/...
 └── chore/...
```

Do not introduce an elaborate Git branching strategy before the team requires it.

---

# 6. Development Workflow

The standard workflow is:

```text
Change Required
      ↓
Decision
      ↓
Documentation
      ↓
Implementation
      ↓
Local Verification
      ↓
Git Commit
      ↓
GitHub
      ↓
Preview
      ↓
Production
```

---

# 7. Local Development

Start the application with:

```bash
npm run dev
```

Expected development URL:

```text
http://localhost:3000
```

Before committing:

```bash
npm run lint
npm run build
```

Both should pass unless a documented exception exists.

---

# 8. Production Build

The production application must successfully execute:

```bash
npm run build
```

The production build must not rely on local-only configuration.

---

# 9. Production Start Test

Where practical, verify:

```bash
npm run start
```

This confirms that the generated production build can actually run.

---

# 10. Vercel Deployment

The intended workflow:

```text
GitHub repository
       ↓
Vercel project
       ↓
Build
       ↓
Deployment
       ↓
Production URL
```

Vercel should automatically build the application using the repository configuration.

---

# 11. Environment Variables

Production environment variables are configured in Vercel.

Do not place production secrets in GitHub.

Initial configuration:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

Additional server-only variables will be introduced only when required.

---

# 12. Preview Deployments

When feature branches or pull requests are used, Vercel may create preview deployments.

Conceptually:

```text
Feature Branch
      ↓
GitHub
      ↓
Vercel Preview
      ↓
Manual Verification
```

A preview should be used to verify significant UI or application changes before production.

---

# 13. Production Deployment Rules

Do not deploy unverified changes simply because the application builds.

Before production:

```text
[ ] Product scope respected
[ ] Documentation updated
[ ] TypeScript passes
[ ] Lint passes
[ ] Build passes
[ ] Local behavior verified
[ ] Relevant tests pass
[ ] Environment variables configured
[ ] No secrets committed
[ ] Known limitations documented
```

---

# 14. Deployment Verification

After deployment, verify:

### Application

* production URL loads
* homepage renders
* navigation works
* no obvious console errors

### Backend foundation

* Supabase configuration works
* expected server/client boundaries work

### Analytics

* GA4 initializes when configured

### Security

* secrets are not visible in browser source
* no environment credentials appear in responses
* no debug information is exposed

---

# 15. Health Verification

At minimum, production verification should confirm:

```text
HTTP response
    ↓
Next.js application
    ↓
Page rendering
    ↓
Required external configuration
```

A formal health endpoint may be added later if it becomes useful.

Do not create infrastructure merely for the appearance of sophistication.

---

# 16. Deployment Failure Process

When deployment fails:

### Step 1

Read the actual build/deployment error.

### Step 2

Determine whether the failure is:

* code
* dependency
* environment variable
* build configuration
* external service
* platform configuration

### Step 3

Fix the smallest underlying problem.

### Step 4

Verify locally where possible.

### Step 5

Deploy again.

### Step 6

Document significant failures if they changed architecture or configuration.

Do NOT blindly modify multiple unrelated files.

---

# 17. Rollback Principle

If a production deployment introduces a serious regression:

```text
Current production
       ↓
Identify bad deployment
       ↓
Rollback/revert
       ↓
Restore stable version
       ↓
Investigate
       ↓
Fix
       ↓
Re-deploy
```

Do not attempt risky production repairs without understanding the failure.

---

# 18. Database Deployment

Database changes must be treated separately from application deployment.

Future workflow:

```text
Schema Decision
      ↓
Migration
      ↓
Test
      ↓
Application Compatibility
      ↓
Production Migration
```

Do not manually modify production schema without recording the change.

---

# 19. Migration Safety

When database migrations are introduced:

* review SQL
* understand affected tables
* understand existing data
* consider rollback implications
* test against the appropriate environment

A database migration may be irreversible.

Therefore:

> Never run a destructive production migration casually.

---

# 20. Deployment Secrets

Never place secrets in:

* source code
* README
* documentation
* Git commit messages
* browser code
* screenshots
* analytics events

Examples:

* service-role keys
* AI keys
* payment secrets
* webhook secrets
* database passwords

---

# 21. Custom Domain

The final commercial domain is not yet selected.

Therefore:

**Do NOT configure the production custom domain yet.**

The initial production URL provided by Vercel is sufficient for Phase 1.

A custom domain will be added after product naming is validated.

---

# 22. Deployment Cost Strategy

Initial objective:

> Keep deployment cost at zero or near zero while validating the product.

Preferred initial infrastructure:

```text
GitHub Free
      +
Vercel Free
      +
Supabase Free
```

Upgrade only when actual usage or technical requirements justify it.

---

# 23. Performance Principles

Initial production priorities:

1. Application loads quickly.
2. Avoid unnecessary client-side JavaScript.
3. Avoid unnecessary third-party scripts.
4. Avoid expensive work during page rendering.
5. Keep dependencies minimal.

Document processing and AI analysis will be handled separately when implemented.

---

# 24. Production Observability

Phase 1 does not require a large observability stack.

Initial visibility:

* Vercel deployment/build logs
* browser errors
* GA4
* Supabase logs where relevant

Additional observability tooling may be introduced when real product complexity requires it.

---

# 25. Release Versioning

The MVP may use semantic-style versions for meaningful releases.

Example:

```text
v0.1.0
```

Interpretation:

```text
0 = pre-1.0 product
1 = first meaningful MVP release
0 = initial patch state
```

Exact release cadence is not yet fixed.

---

# 26. Release Notes

Meaningful production releases should update:

```text
docs/10_CHANGELOG.md
```

The changelog should describe:

* added functionality
* changed functionality
* fixed issues
* known limitations

Do not copy raw Git commit history into the changelog.

---

# 27. Deployment Documentation

Whenever deployment architecture changes, update:

* `07_DEPLOYMENT.md`
* `03_DECISION_LOG.md` when the change is significant
* `09_BUILD_LOG.md`
* `10_CHANGELOG.md` when user-facing

---

# 28. Phase 1 Deployment Definition of Done

```text
[ ] GitHub repository exists
[ ] Main branch contains the production-ready foundation
[ ] Vercel project exists
[ ] Production build succeeds
[ ] Production deployment succeeds
[ ] Production URL loads
[ ] Required environment variables are configured
[ ] No secrets are committed
[ ] Supabase connection works where required
[ ] GA4 works when configured
[ ] Local build succeeds
[ ] Documentation reflects actual deployment state
```

---

# 29. Current Deployment Status

**PHASE 1 — PRODUCTION FOUNDATION**

Status:

**IN PROGRESS**

Current target:

> Deploy the minimal production foundation successfully before implementing product intelligence.

---

# 30. Core Principle

> **A deployment is not complete because the code compiled. It is complete when the production system has been deployed and verified.**
