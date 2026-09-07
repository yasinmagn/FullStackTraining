# Unit 2 — CSS Styling

## Introduction

A structured page becomes a shop with CSS. You'll turn the plain HTML from Unit 1
into a branded, responsive storefront: a Flexbox navbar and a CSS Grid product
catalog that reflows from four columns on desktop to one on a phone.

## Learning objectives

- Use CSS custom properties (variables) for a consistent brand palette.
- Lay out a navbar with **Flexbox**.
- Lay out a product catalog with **CSS Grid**.
- Make the layout responsive with media queries — no horizontal scroll on mobile.

## Session brief

Starter = Unit 1 solution. Complete every TODO in `starter/styles.css`.

## Tasks

1. Make the header a flex row: `space-between`, centered items, brand background, white text.
2. Lay out the nav links in a row with a gap; remove underlines; make them white.
3. Turn `.product-grid` into a 4-column CSS Grid with a gap.
4. Style `.product-card` (white background, rounded corners, padding, subtle shadow)
   and `.price` (brand color, bold).
5. Style buttons (brand background, white text, full width) and a disabled state.
6. Add media queries: 2 columns at ≤900px, 1 column at ≤500px.

## Verify

- The navbar uses Flexbox.
- The catalog uses Grid.
- At 375px width there is **no** horizontal scroll and the grid is 1 column.

## Solution walkthrough

See [`solution/styles.css`](./solution/styles.css). The `:root` block defines the
brand palette so colors live in one place. The grid uses
`grid-template-columns: repeat(4, 1fr)` and two media-query breakpoints step it
down to 2 then 1 column. `box-sizing: border-box` on every element keeps padding
from causing overflow — the key to a scroll-free mobile layout.
