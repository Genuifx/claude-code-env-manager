# Midnight Sapphire

## Inspiration

Inspired by the deep blue dial of an Audemars Piguet Royal Oak -- the way its "Grande Tapisserie" pattern catches light at oblique angles, revealing layers of blue that shift from near-black to vivid cobalt. This theme channels the restrained luxury of Swiss haute horlogerie: surfaces that appear monochromatic at first glance but reveal subtle depth under attention.

Secondary inspiration comes from deep ocean bioluminescence -- cold, precise points of light against an immense dark field. The interface should feel like looking into deep water where sapphires glow faintly beneath the surface.

## Core Palette

| Role | HEX | HSL | Rationale |
|------|-----|-----|-----------|
| **Primary** | `#3B6EC9` | 222 65% 52% | Deep cobalt sapphire. Not a tech-startup blue, not a sky blue -- a gemstone blue with weight and saturation that reads as precious rather than corporate. Sat at 65% to avoid the "Bootstrap primary" trap. |
| **Accent** | `#9EAABB` | 215 18% 68% | Ice silver / platinum. A desaturated blue-gray that reads as brushed metal under cool light. Deliberately muted (18% sat) so it functions as a cold neutral that still belongs to the blue family. |
| **Background (dark)** | `#0E1420` | 222 22% 7% | Near-black with a perceptible navy undertone. At 7% lightness the blue is felt more than seen -- like the sky 30 minutes after sunset. The 22% saturation prevents it from reading as pure gray. |

## Design Logic

### Dark Mode (Default)

The dark palette is built on a single hue anchor: **222** (cobalt blue). Every neutral in the system lives on this hue, with saturation decreasing as lightness increases:

- **Background (7% L, 22% S)** -- the deepest layer carries the most blue identity
- **Surface (11% L, 18% S)** -- cards and containers, slightly lifted
- **Surface-raised (15% L, 15% S)** -- interactive elements at rest
- **Surface-overlay (19% L, 12% S)** -- popovers and floating UI
- **Surface-peak (25% L, 10% S)** -- the highest elevation, most neutral

This "saturation decay" pattern means deeper layers feel richer and more atmospheric while elevated surfaces become increasingly neutral and readable. It mimics how pigment appears more saturated in shadow and washes out under direct light.

Semantic colors are shifted cold: success uses teal-green (160) rather than pure green, warning stays warm but desaturated (40, 62%), and destructive uses a cool crimson (355) rather than pure red. This keeps the entire UI in a cold register without sacrificing recognizability.

### Light Mode

The light mode mirrors the dark mode's design language by anchoring on hue **220** (slightly warmer than 222 to feel natural under light). The background carries a faint blue tint (18% S at 96% L) that prevents the "clinical white" feeling of pure #fff.

The primary shifts to 60% saturation and 48% lightness in light mode -- darker and slightly less saturated than the dark mode primary. This ensures WCAG AA compliance on white surfaces (contrast ratio ~4.8:1 against the lightest backgrounds).

Cards and surfaces use near-white values with just enough blue hue to maintain family cohesion with the dark theme. The transition between modes should feel like the same room at different times of day rather than two different rooms.

### Chart Colors

The chart palette stays within a cold spectrum to maintain visual coherence:

1. **Sapphire** (222) -- the brand anchor
2. **Cerulean** (195) -- analogous cool blue
3. **Jade** (165) -- cool green for contrast without warmth
4. **Amethyst** (252) -- a muted violet, kept at 40% sat to avoid "gaming" aesthetics
5. **Platinum** (215) -- the accent silver, for baseline/reference data
6. **Indigo** (240) -- deep blue-violet for categorical distinction

No warm colors in the chart palette. This is deliberate: the single-temperature approach creates a cohesive, sophisticated data visualization that reads as one system rather than a rainbow.

## Contrast Verification

Key contrast ratios (dark mode):
- Foreground (93% L) on Background (7% L): **~14:1** (AAA)
- Muted-foreground (48% L) on Surface (11% L): **~5.2:1** (AA)
- Primary (52% L) on Background (7% L): **~6.1:1** (AA)
- Primary-foreground (98% L) on Primary (52% L): **~5.4:1** (AA)

All text pairs meet WCAG AA minimum (4.5:1). Primary interactive elements exceed 3:1 against their backgrounds.
