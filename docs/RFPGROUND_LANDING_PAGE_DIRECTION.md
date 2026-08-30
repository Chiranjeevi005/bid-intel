# RFPground Landing Page Direction (LP-001)

## 1. Mission: Evidence Operations Marketing Experience
The RFPground homepage must look like a premium, human-designed B2B procurement intelligence product, NOT a generic SaaS marketing website. It tells one specific workflow story:
**TENDER → UNDERSTAND → EXPOSE → VERIFY → DECIDE**

## 2. Brand & Visual Concept
- **The Core Concept:** *The Bid Decision Desk*. The page acts as a public-facing version of a professional bid desk.
- **Vibe:** Authoritative, analytical, calm, precise, editorial. 
- **Strictly Banned:** "AI-generated" aesthetics, glowing orbs, mesh gradients, glass cards, "10x faster" claims, floating UI, giant rounded containers.

## 3. Typography & Shape Language
- **Geist Sans:** Primary font for the application interface, navigation, metadata, and marketing copy.
- **Source Serif 4:** Used strictly for source evidence (tender excerpts). This "Paper + Instrument" dual identity is non-negotiable.
- **Shape Language:** Maximum 4px radius. Prefer straight structural divisions and 1px rules over heavy shadow-based "cards".

## 4. The 4-Section Architecture

### Section 01: Navbar
- **Height:** ~64-72px, bottom rule.
- **Left:** RFPground wordmark (semibold/regular). Small "PRE-BID INTELLIGENCE" eyebrow optional.
- **Right:** "Sign in", and a restrained `Signal Blue` CTA: "Analyse a tender →".

### Section 02: Welcome Board & Hero Product Surface
- **Layout:** Editorial off-grid composition. NO generic left-text/right-image layout.
- **Headline:** "Before your team bids, know what it's committing to."
- **Hero Asset (TenderEvidenceSurface):** A highly realistic, fictional tender review interface for "Ministry of Transport / Infrastructure RFP". It must visually flow: *HEADLINE ↓ TENDER ↓ DOCUMENT ↓ EVIDENCE ↓ RISK ↓ COVERAGE*. It uses Source Serif 4 for evidence and Red/Amber semantic tags for Risk.

### Section 03: "What Happens Before The Bid"
- An asymmetric, 3-stage editorial sequence (Workflow, not just features).
- **01 / UNDERSTAND:** Surface conditions. Focuses on extraction metrics.
- **02 / EXPOSE:** Inverted composition (visual left, text right). Focuses on risk identification (Liquidated damages, Termination).
- **03 / VERIFY:** Asymmetric return. Focuses on human verification vs. AI claims. "No verified finding ≠ no requirement."

### Section 04: Footer
- Restrained, bottom rule, simple navigation matrix. No oversized newsletter blocks.

## 5. Motion & Micro-interactions
- **Motion Dial:** 4 (restrained, purposeful).
- **Staggered Entry:** Subtle `opacity: 0 -> 1`, `translateY: 8px -> 0` over 400-500ms on load.
- **Product Choreography:** The hero asset reveals step-by-step (Document → Analysis → Decision) to narrate the value proposition without screaming it.

## 6. Development Rules
- Next.js Server Components by default.
- Motion isolated to client components (`'use client'`).
- Fully responsive without simply "squeezing" the desktop layout. Mobile must preserve the story order: Nav → Copy → Hero Asset → Features → Footer.
