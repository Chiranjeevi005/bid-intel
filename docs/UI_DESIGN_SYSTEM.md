# RFPground UI Design System (UI-005 LOCKED)

## 1. Core Principle: Evidence Operations
RFPground visually feels like a combination of:
**procurement workspace + document review system + financial-risk terminal.**

The governing visual principle is:
*The interface is a working instrument, not a presentation.*

**Core Visual Metaphor:**
`SOURCE → EVIDENCE → EXPOSURE → DECISION`

The UI must make the user feel: "I am reviewing a tender," not "I am using an AI application."

## 2. Brand Identity
- **Product Name:** `RFPground`
- **Wordmark Styling:** `RFP` (semibold) `ground` (regular)
- **Positioning:** "Pre-bid intelligence" is secondary product language, never the brand.
- **Prohibited:** No icon required. No AI symbol, no sparkle, no shield, no abstract logo. The typography itself becomes the identity.

## 3. Typography System ("Paper + Instrument")
RFPground operates in two worlds: the Instrument (RFPground application) and the Paper (The Tender).

- **Primary (Instrument):** `Geist Sans`
  - Used everywhere for the application UI.
- **Evidence Text (Paper):** `Source Serif 4`
  - Used **ONLY** for quoted tender language, extracted evidence, and document excerpts.
  - *Rationale:* This small typographic distinction makes RFPground feel authentic.

**Hierarchy Scale:**
- Application title: `28–32px / 600`
- Workspace title: `20–24px / 600`
- Section heading: `14–16px / 600`
- Body: `14px / 400`
- Evidence: `15–16px / Source Serif 4`
- Metadata: `11–12px / 500`
- Status: `10–11px / 600 uppercase`
- **Prohibited:** Giant 64px SaaS hero typography inside the application.

## 4. Color System (LOCKED)
80–90% of the interface must visually remain ink / grey / white. Color communicates meaning; it does not decorate the page.

**Foundation:**
- **Ink:** `#111827`
- **Canvas:** `#F5F6F4`
- **Surface:** `#FFFFFF`
- **Rule:** `#D9DEE5`
- **Muted:** `#667085`
- **Faint:** `#98A2B3`

**Product Accent:**
- **Signal Blue:** `#3157D5`
- *Usage:* Sparingly. Active navigation, links, focused controls, selected states, primary action. It must never become a "blue-filled-everything" interface.

**Risk Semantics:**
- **Critical:** `#B42318` (Text) / `#FEF3F2` (BG)
- **Review:** `#B54708` (Text) / `#FFFAEB` (BG)
- **Clear:** `#027A48` (Text) / `#ECFDF3` (BG)

## 5. Shape & Structure Language
This design is engineered geometry.
- **Primary Structure:** Sharp. No giant rounded containers.
- **Controls:** `4px` radius (`rounded-sm`).
- **Small status elements:** `3–4px` radius.
- **Cards:** Avoid wherever possible. When a boundary is necessary, use a **1px rule** (`border-[#D9DEE5]`) rather than `rounded-xl + shadow + white background`.

## 6. Layout Language
- **Operational Canvas:** The interface relies on horizontal and vertical rules to create utility rails and workspaces, not overlapping floating cards.
- **Authentication/Entry:** 
  - Left: A believable piece of the product (Document Evidence Object).
  - Right: A precise authentication instrument (Utility Rail).
  - Separator: A vertical rule (`border-r`).

## 7. Microinteraction & Motion (Intensity 2)
Very restrained interaction.
- **Input Focus:** 1px Signal Blue border + subtle 2px focus ring.
- **Button Hover:** Slightly darker Signal Blue.
- **Button Active:** `translateY(1px)`. No dramatic scale animation.
- **Loading:** Small inline progress treatment. No giant spinner.
- **Error:** Inline red message. No toast explosion.

## 8. Anti-Slop Strict Bans
Antigravity must reject any implementation introducing:
- ❌ Purple gradients or blue gradient backgrounds
- ❌ AI sparkles, decorative illustrations, glowing borders
- ❌ Glassmorphism, excessive shadows
- ❌ Giant rounded cards, floating dashboard mockups, 3-column feature cards
- ❌ Fake statistics, customer logos, meaningless charts
- ❌ "AI-powered" marketing language
- ❌ Oversized hero typography
- ❌ Excessive pills
- ❌ Generic centered login card