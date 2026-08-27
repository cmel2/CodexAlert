# CodexAlert visual system

CodexAlert is a calm, dark notification utility. The reference direction is a near-black signal room: a bright lime alert mark, quiet gray copy, and one clear action. It should feel useful at a glance, not like a dashboard full of widgets.

## Direction

- Use a dark charcoal canvas with a restrained green glow around the alert bell.
- Keep the first view sparse: one statement, two actions, and one unmistakable notification object.
- Use regular system sans for all interface text. Avoid condensed or decorative faces.
- Use lime for the signal and primary action. Use Discord blue only for Discord setup.
- Use square-ish soft corners (14–16px) on controls; avoid pills except small status tags.
- Keep the homepage scrollable with a visible “Scroll to choose a channel” cue.
- Use subpages for explanation, channel routes, FAQ, and unsubscribe instead of one dense page.

## Pages

- `/` — hero, live source status, channel chooser, and a short next-step strip.
- `/how-it-works/` — three-step source → dedupe → delivery explanation.
- `/channels/` — Discord live, Telegram and Slack clearly marked coming soon.
- `/channels/discord/` — the only active webhook setup form.
- `/faq/` — short native disclosures.
- `/unsubscribe/` — private-link removal flow.

Every page uses the same header, mobile navigation, and footer. The footer keeps `DATA: HASCODEXRATELIMITRESET.TODAY / @JSKOIZ` on the left and a GitHub source link on the right. The page itself does not display the MIT license.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#090d0e` |
| Raised surface | `#101619` |
| Soft surface | `#151d20` |
| Primary text | `#f2f6f3` |
| Supporting text | `#9aa8a7` |
| Signal lime | `#caff4a` |
| Discord blue | `#2a5ddd` |
| Error coral | `#ff8e80` |
| Structural line | `#273437` |

## Components

- The lime primary CTA uses a 15px radius and generous horizontal padding.
- The Discord CTA is a wide blue button with the Discord mark, 16px radius, and a restrained blue glow.
- The alert tile is an authored inline SVG bell inside a lightly rotated dark square with a soft lime halo.
- Channel choices are three simple selectable rows/cards: Discord is active; Telegram and Slack are honest about their future status.
- Forms use native labels, visible focus rings, explicit text errors, and a copyable private unsubscribe link.

## Responsive behavior

At desktop widths the hero uses a two-column composition. Below 900px it stacks text before the alert tile and form columns. Below 760px the navbar becomes a keyboard-accessible menu, channel cards stack, buttons can fill the available width, and the footer becomes two rows.

## Product truth

Reset data comes from the third-party community tracker [hascodexratelimitreset.today](https://hascodexratelimitreset.today/), created by [@jskoiz](https://x.com/jskoiz). It may be delayed or inaccurate. Discord is the only live delivery route; Telegram and Slack are presentation-only coming-soon options until their backends are implemented.
