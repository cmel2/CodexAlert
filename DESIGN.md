---
name: Codex Reset Alerts
description: An ASCII signal field for a sourced, one-step Discord reset alert.
colors:
  void: "#07110d"
  void-lift: "#0b1913"
  signal: "#a7f3c7"
  signal-soft: "#6eb995"
  paper: "#e7ffe9"
  dim: "#6f9980"
  line: "#315540"
  line-bright: "#6f9f7c"
  action: "#ffb74d"
  danger: "#ff8370"
typography:
  display:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    fontSize: "clamp(2.6rem, 6vw, 6.2rem)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-0.055em"
  headline:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    fontSize: "clamp(2rem, 4.8vw, 4.7rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.07em"
  title:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    fontSize: "clamp(1.7rem, 3.4vw, 3.3rem)"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-0.06em"
  body:
    fontFamily: '"Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
    fontSize: "0.68rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  micro: "2px"
  node: "50%"
spacing:
  xs: "8px"
  sm: "13px"
  md: "18px"
  lg: "24px"
  xl: "42px"
  section: "104px"
components:
  action-command:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "57px"
  action-command-hover:
    backgroundColor: "{colors.action}"
    textColor: "{colors.void}"
    rounded: "{rounded.none}"
  webhook-field:
    backgroundColor: "{colors.void-lift}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 10px 0 15px"
    height: "56px"
  copy-control:
    backgroundColor: "transparent"
    textColor: "{colors.signal}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 14px"
    height: "41px"
  status-field:
    backgroundColor: "{colors.void}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "107px 42px 48px"
  privacy-panel:
    backgroundColor: "{colors.void-lift}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "28px 24px"
  route-row:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "22px 0"
  faq-disclosure:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "19px 28px 19px 0"
  unsubscribe-action:
    backgroundColor: "transparent"
    textColor: "{colors.action}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "54px"
---

# Design System: Codex Reset Alerts

## Overview

**Creative North Star: "ASCII Signal Field"**

Codex Reset Alerts treats a reset as a live, sourced signal rather than a marketing moment. The interface is a near-black phosphor field: character density gathers around the current status and the route into Discord, while the copy stays direct, calm, technical, and transparent. The glyphs are structural semantic `pre` content, not a generic texture behind a SaaS card stack.

The first view is a split handoff. `P100 / CURRENT SIGNAL` owns the dominant status and source field; `P200 / SUBSCRIBE` is a quiet command-line rail with one native webhook input and one amber action. The same ruled terminal grammar continues through provenance, the three handoffs, the privacy notice, field notes, footer, and the private unsubscribe route. Desktop and mobile keep the same reading order and vocabulary, with the rail stacking below the status on narrow screens.

**Key Characteristics:**

- Sparse near-black green field with dense ASCII glyphs around meaningful status and route content.
- Strict system monospace for signal vocabulary, labels, fields, and actions; self-hosted Roboto Condensed for supporting prose.
- Pale green is the live signal; amber is reserved for an actionable or attention state; dashed and hairline rules do the structural work.
- Source attribution and the third-party caveat are visible before any subscription decision.
- Native semantic controls, visible focus, text-readable states, and reduced-motion support are part of the visual system.

## Colors

The palette is a restrained phosphor register: green carries signal and provenance, pale paper carries primary reading, and amber appears only where a visitor can act or needs explicit attention.

### Primary

- **Phosphor Signal** (`{colors.signal}`): Positive/live state text, active source links, route marks, and the primary signal fill.

### Secondary

- **Soft Signal** (`{colors.signal-soft}`): Supporting copy, quiet labels, secondary metadata, and the readable falloff around the phosphor foreground.

### Tertiary

- **Command Amber** (`{colors.action}`): The one visitor action, cursor marker, explicit attention state, and focus ring.
- **Fault Coral** (`{colors.danger}`): Error messaging only; it is not a decorative accent.

### Neutral

- **The Void** (`{colors.void}`): Page canvas and flat status surface.
- **Lifted Void** (`{colors.void-lift}`): Recessed input, privacy, and unsubscribe surfaces.
- **Paper Green** (`{colors.paper}`): Primary headings and readable values.
- **Dim Green** (`{colors.dim}`): Low-priority labels, helper copy, and muted metadata.
- **Signal Line** (`{colors.line}`): Dashed separators and quiet field rules.
- **Bright Line** (`{colors.line-bright}`): Input borders, structural dividers, and route edges that must stay legible.

**The One Voice Rule.** Green is the signal voice. Amber is scarce: reserve it for the action, explicit attention, cursor markers, and focus so that it remains a reliable instruction rather than ambient decoration.

**The Provenance Rule.** Keep the exact reset source URL and `@jskoiz` credit visible in the first view and the footer. Describe the source as third-party and unofficial; never turn it into an implied official feed.

## Typography

**Display Font:** `SFMono-Regular`, Consolas, `Liberation Mono`, Menlo, monospace

**Body Font:** self-hosted `Roboto Condensed` with `Arial Narrow`, `Helvetica Neue`, and sans-serif fallbacks

**Label/Mono Font:** the display monospace stack

**Character:** The monospace voice makes the signal feel addressable and inspectable: page codes, source registers, elapsed seconds, URLs, and route labels all share one instrument-like grid. Roboto Condensed carries the explanatory sentences without softening the system into a generic developer landing page.

### Hierarchy

- **Display** (500, `clamp(2.6rem, 6vw, 6.2rem)`, `0.96` line-height, `-0.055em` tracking): The two-line `CODEX RESET / ALERTS` masthead.
- **Headline** (500, `clamp(2rem, 4.8vw, 4.7rem)`, `0.98` line-height, `-0.07em` tracking): Section headings such as “The route is the product.” and “Before you plug in.”
- **Title** (400, `clamp(1.7rem, 3.4vw, 3.3rem)`, `1.03` line-height, `-0.06em` tracking): The command rail’s “SEND THE NEXT SIGNAL / TO DISCORD” instruction.
- **Body** (400, `1rem`, `1.5` line-height): Explanatory copy, generally kept between 58ch and 70ch where the source CSS establishes a readable measure.
- **Label** (400 or 600, `0.68rem`, `1.5` line-height, `0.08em` tracking, uppercase when used as a field label): P100/P200 codes, source register labels, buttons, metadata, and field notes.

At 600px and below, the display, title, and label roles tighten to the mobile clamps in the implementation: the masthead drops to `clamp(2.1rem, 12vw, 3.5rem)`, command copy to `clamp(1.55rem, 9vw, 2.55rem)`, and compact field labels to `0.56rem`.

**The Terminal Type Rule.** Use monospace for signal vocabulary, identifiers, controls, status values, and provenance. Use Roboto Condensed for sentences. Do not introduce a serif or a generic display family into this world.

## Layout

The direction contract describes the desktop surface as a 12-column character field. The shipped CSS expresses that intent as a centered `1440px` maximum and a `715px`-minimum split grid: at desktop widths, the header, main content, and footer use `min(1440px, calc(100% - 48px))`; the masthead and footer carry `21px` inline padding; the status/source side is `1.65fr` and the command rail is `1fr`, separated by a dashed vertical rule. The top glyph field is absolutely placed across the stage, while the status route glyphs and command glyphs sit low in their owning fields so density is attached to meaning.

The main rhythm is deliberately open: route and FAQ sections use `104px` block padding on large screens; their headings cap at `710px`, and explanatory measures stay below roughly `70ch`. The source register uses a two-column label/content grid; route rows use a `54px` index column, a flexible description, and a right-aligned code. The privacy band uses a lock mark, copy, and security-model link in one line. The footer stays a two-part row until narrow screens.

At `900px` and below, the stage becomes one column: the status field comes first with a bottom rule, then the command field. The privacy link moves below the copy. At `600px` and below, the outer width becomes `calc(100% - 24px)`, the header shortens to `63px`, status and command fields use `22px` inline padding, status details become one column, source-register content becomes one column, route row codes move under their descriptions, and the footer stacks. The unsubscribe copy row also stacks its input and copy control. This is a reflow of the same signal grammar, not a second visual identity.

## Elevation & Depth

This system is flat by default. Depth comes from the two near-black tones, opacity changes in the glyph fields, dashed and solid rules, and the density of characters around the signal—not from floating cards or ambient shadows. The only visible shadow treatment is the one-pixel amber focus emphasis on the focused webhook field (`0 0 0 1px` in the implementation). The primary action, input, and unsubscribe surfaces stay square and close to the field plane.

### Shadow Vocabulary

- **Focused command field** (`box-shadow: 0 0 0 1px {colors.action}`): A crisp keyboard/pointer focus emphasis paired with an amber border shift; never a decorative glow at rest.

**The Flat-by-Default Rule.** Do not add card shadows, gradients, glass effects, or lifted app chrome. Use tonal layering, rules, and state-driven focus to express depth.

## Shapes

The form language is square, ruled, and slightly imperfect in the terminal sense: primary containers and controls use no radius (`0px`), borders are generally `1px` and dashed, and nested boxes are avoided. The route’s two small terminals are circular (`50%`) against a thin line; the arrow is a rotated pair of hairlines. The privacy lock sits in a square `52px` frame on desktop, and the unsubscribe surface uses a dashed outer border with a second inset rule `11px` inside it. The scrollbar thumb is the only micro-rounded surface (`2px`).

Clip dense `pre` glyph fields to their owning region so they do not become horizontal overflow. Keep route lines thin, terminals square or explicitly circular, and icons inline and geometric; never substitute emoji or stock iconography.

## Components

The component vocabulary is intentionally small: native controls and semantic field patterns carry the system, while rules, spacing, and text labels do the branding.

### Buttons

- **Shape:** Square terminal edges with no radius (`0px`); `1px` outline at rest.
- **Primary command:** Full-width transparent button with Command Amber text, a `57px` minimum height, `18px` horizontal padding, and a monospace label: `>_ Test & subscribe`.
- **Hover / Focus:** Hover fills the button with amber and switches text to The Void. All buttons and links use a visible `2px` amber outline with `4px` offset on `:focus-visible`.
- **Disabled / in-flight:** Keep the outline language, lower opacity to about `0.52` for the subscribe action (`0.55` for unsubscribe), and use a wait/not-allowed cursor while the request is in flight.
- **Secondary / ghost:** The copy control is a compact transparent, bright-line control with signal text; its hover changes border and text to amber. There is no rounded secondary button family.

### Cards / Containers

- **Status console:** The left P100 field is a flat `The Void` surface with a dashed top/route field and a solid status-detail rule; it is a field, not a card.
- **Command rail:** The right P200 field is a quiet field plane with a command input, route line, and one amber action. Do not nest it in a rounded panel.
- **Privacy band:** A `Lifted Void` strip with a square lock frame, explanatory copy, and a security-model link, bounded by bright dashed rules.
- **Unsubscribe route:** The centered route uses a `Lifted Void` panel with a bright dashed border and an inset `Signal Line` rule; it is the only contained page-level surface.

### Inputs / Fields

- **Style:** Use a native labeled URL input, `56px` high, `Lifted Void` background, `Bright Line` dashed border, and monospace text. The prompt mark is a separate signal-colored `>` at the left. Placeholder text uses Dim Green.
- **Focus:** `:focus-within` shifts the border to amber and adds the one-pixel amber ring; preserve the global focus outline for keyboard users.
- **Success / error:** The success panel is a live, text-readable `ROUTE ARMED` state with a read-only private unsubscribe URL and copy control. Error messages use a solid border and Fault Coral text; never rely on color without the message text.
- **Credential posture:** The webhook field disables autocomplete and spellcheck and caps input at 500 characters. The unsubscribe link is read-only and private-link copy must explain that anyone with the link can remove the subscription.

### Navigation

The header is a two-item masthead: the `>_` brand/home link on the left and a small `[src] View source ↗` link on the right. It is not a full navigation bar. The source link and all provenance/security links keep explicit destinations, underline on hover, and amber `:focus-visible` outlines. On mobile, the source link collapses its label to the outbound arrow glyph while retaining the link. A fixed skip link exposes “Skip to signal console” when focused.

### Status Console

The status console combines the source register, `P100 / CURRENT SIGNAL`, a live-feed cursor, seven-character signal glyph, state label, subline, minute sweep, and last-checked/last-reset details. State text is always explicit: `Reset reported`, `No reset reported`, `Waiting for first check`, or `Status unavailable`; the subline supplies a second textual cue. A reported reset uses amber emphasis, ordinary/unknown state uses the green register, and unavailable state remains legible as copy.

The minute sweep maps the current seconds to a 0–60 track with a phosphor fill and pointer. It is informative motion, not a loading guarantee: keep the textual timestamps and labels visible when motion is reduced or the panel check is unavailable.

### Source Register and Route Rows

The source register repeats the exact third-party URL and creator credit in a compact ruled row, followed by the explicit caveat that source data may be delayed or inaccurate. The three route rows are numbered `01`–`03` and explain source, dedupe, and Discord handoffs in short sentences. Keep the labels factual: one public tracker request per minute, one stable reset identity, one delivery per active subscription.

### FAQ Disclosure

Use native `details`/`summary` for the three field notes. The plus/minus marker is amber, the summary is monospace, and the answer remains body copy. Preserve keyboard focus and the open/closed state; do not replace this with a custom accordion that hides the semantic disclosure.

## Do's and Don'ts

### Do:

- **Do** keep the ASCII Signal Field recognizable: near-black green void, strict monospace cells, pale green signal text, and a single amber action state.
- **Do** make the current signal, exact reset source, and `@jskoiz` provenance readable in the first viewport and footer.
- **Do** preserve semantic HTML and the visible interaction grammar: a labeled native URL input, text-readable `yes`/`no`/`unknown`/unavailable states, `role="status"` feedback, a skip link, keyboard focus, and reduced-motion support.
- **Do** state the source limitation plainly: it is a third-party community signal that may be delayed or inaccurate, and user-facing notifications say limits “appear” to have reset.
- **Do** treat Discord webhook URLs and private unsubscribe links as credentials. Keep the existing private-link, no-account, no-OAuth, and credential-erasure language accurate and non-promotional.
- **Do** let glyph density gather around the live status and route; every decorative character field should have an owning semantic region and be hidden from assistive technology when it is purely visual.

### Don't:

- **Don't** imply affiliation with or endorsement by OpenAI or Discord, or describe the community source as an official or guaranteed feed.
- **Don't** promise Telegram, Slack, accounts, Discord OAuth, names, or emails; those are not part of the shipped surface.
- **Don't** expose, echo, log, or put a real Discord webhook URL or unsubscribe credential into public source, browser responses, screenshots, examples, or decorative copy.
- **Don't** use color alone to communicate status or error; retain the explicit state labels, sublines, timestamps, and messages.
- **Don't** drift into generic AI-SaaS styling: no serif hierarchy, gradient text, rounded app chrome, ambient card shadows, glass surfaces, emoji, stock icons, testimonials, logos, adoption numbers, or unsupported security claims.
- **Don't** turn the glyph field into a background-only texture or add motion that competes with the one-minute signal; honor `prefers-reduced-motion` by removing the sweep, blink, smooth scroll, and transitions.
