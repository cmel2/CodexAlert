# CodexAlert homepage visual system

The homepage is a single-screen, light notification surface. It uses a quiet white-to-cool-blue field, restrained navy typography, one vivid blue action, and a compact channel control. The design should feel closer to OpenAI/Codex than to a generic SaaS dashboard.

## Layout

- Lightweight header with the CodexAlert mark at left and `How it works`, `Channels`, `FAQ`, and `Get Notified` at right.
- Centered two-line hero: `We watch the tracker. / You get notified instantly.` with only `instantly.` in blue.
- Muted two-line explanation below the headline.
- One horizontal white notification control: label, divider, channel dropdown, and `Add Webhook →` action.
- Faint elliptical radar lines and three blue dots sit behind the control.
- Footer is visually anchored to the bottom edge with source attribution left and `Privacy · Terms · Github` right.
- The homepage has no vertical scrolling, lower sections, feature grid, chart, or backend explanation. Longer content remains on navbar subpages.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#ffffff` → `#eef5ff` |
| Primary text | `#10244d` |
| Supporting text | `#667694` |
| CodexAlert blue | `#1267f5` |
| Control border | `#d6deed` |
| Radar stroke | `rgb(64 125 241 / 16%)` |

## Typography and controls

- Use Arial, Nimbus Sans L, and the platform sans-serif fallback stack for body copy and controls; keep page titles in the existing Helvetica title treatment. Subpage section headings use Helvetica at 500 weight and 38px.
- Keep the headline large but realistic (`clamp(3rem, 5vw, 4.65rem)`) with moderate negative tracking.
- Use medium rounded corners: roughly 14–16px for buttons and triggers, 26px for the notification container.
- The channel dropdown contains exactly Discord, Telegram, and Slack. The selected row has a checkmark and the trigger ring follows the selected app color.
- Discord uses a dark/blurple icon; Telegram uses cyan; Slack uses four recognizable brand colors.
- `Add Webhook →` is blue with white text and matches the dropdown height.

## Product truth

Reset data comes from the third-party community tracker [hascodexratelimitreset.today](https://hascodexratelimitreset.today/), created by [@jskoiz](https://x.com/jskoiz). It may be delayed or inaccurate. Discord is the only live delivery route; Telegram and Slack are presented as coming soon until their backends are implemented.
