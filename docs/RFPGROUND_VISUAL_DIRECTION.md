# RFPground Visual Direction

## 1. Brand Character
RFPground is operational software for procurement professionals handling high-value (e.g., ₹10 crore) tenders. 
- **Professional, Analytical, Credible, Precise, Evidence-Driven.**
- It is **NOT**: Playful, futuristic, AI-themed, consumer-oriented, startup-generic, or marketing-heavy.
- **Identity:** `RFPground` is the product name. "Pre-bid intelligence" is the positioning subtitle. NO robot logos, AI sparkles, or brain vectors.

## 2. Core Visual Idea
The interface is a strict reflection of the operational workflow:
**DOCUMENT → EVIDENCE → RISK → DECISION**

This is communicated through the product surfaces, not through marketing copy. The UI shows real data (Tender names, specific sections, indemnification clauses, exact page numbers).

## 3. Typography
- **Evaluated Fonts:** Geist, Inter, and Roboto.
- **Selected Direction:** **Geist Sans**. It provides a slightly sharper, more technical and engineered aesthetic than Inter, while avoiding the consumer-friendliness of standard geometric sans-serifs.
- **Hierarchy Rules:**
  - *Tender/Context Titles:* Confident, large but tight line-height (`leading-[1.1]`, `tracking-tight`).
  - *Evidence/Quotes:* High readability, serif-like treatment or distinct italics, often indented with a vertical rule.
  - *Metadata (Dates, Pages):* Tabular figures (`tabular-nums`), small, muted (`text-slate-500`).
  - *Risk Labels:* Uppercase, highly tracked (`tracking-widest`), small (`text-[11px]`).

## 4. Color Direction
Color is used as a functional instrument, not decoration.
- **Foundation:** Ink (`#0F172A`) on an Off-White/Calm Background (`#F8FAFC`).
- **Surfaces:** Pure White (`#FFFFFF`) with precise 1px borders (`#E2E8F0`), NEVER large blurred drop-shadows.
- **Semantic System:**
  - *Risk/Critical:* Restrained Red (e.g., `#B91C1C` text on `#FEF2F2` background). Used exclusively for critical exposure (e.g., Uncapped Liability).
  - *Review/Warning:* Restrained Amber/Orange. Used for items needing human verification.
  - *Success/Clear:* Restrained Green.
- **Prohibitions:** NO gradients, NO purple "AI" accents, NO glowing elements.

## 5. Shape Language
- **Engineered, not Decorated.**
- Small, tight border radii. `rounded-sm` (2px-4px) for interactive elements like buttons and inputs.
- Pure sharp corners for major structural layout divisions.
- NO pill-shaped badges unless absolutely necessary for dense inline tagging. NO excessive rounded floating cards.

## 6. Information Density
- High density achieved through strict alignment, not by cramming.
- Subtle horizontal rules (`border-b`) to separate sections rather than wrapping everything in boxes.
- Metadata is small but highly legible due to high contrast against muted backgrounds.

## 7. Authentication Composition
**Decision:** Editorial Asymmetric Composition (Approx. 65/35 optical weight split).
- **Justification:** A 50/50 split creates mathematical symmetry that feels generic and marketing-led. A dominant left plane containing a large, authoritative Document Evidence Object immediately grounds the user in the "Workspace" mindset. The right plane serves as a narrow, hyper-focused utility column for the actual authentication inputs. This mimics the feeling of a sidebar utility panel in a complex CAD or Developer tool.
- The authentication form itself does not sit inside a floating white card. It exists natively on the right-hand canvas.
