# Unit 1 — HTML Skeleton

## Introduction

Every website starts as structure. Before any styling or interactivity, you lay out
the shop with semantic HTML: a header with navigation, a main area for product
cards, and a footer. Semantic markup makes the page accessible and easy to style later.

## Learning objectives

- Write a valid HTML5 document with proper `<head>` metadata.
- Use semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- Build reusable product cards and link multiple pages together.
- Give every image meaningful `alt` text.

## Session brief

Complete every TODO in `starter/index.html`, then create `products.html` with 8
product cards and link it in the nav.

## Tasks

1. Add nav links for **Products**, **Cart (0)**, and **Login**.
2. Add 3 more product cards (your own products & prices).
3. Add a footer with your name and the year.
4. Create `products.html` with 8 cards and link it from the nav.

## Verify

- Open `index.html` in a browser.
- Nav links work (Home ↔ Products).
- Page has a header, main, and footer.
- Every image has `alt` text.

## Solution walkthrough

See [`solution/`](./solution). The home page (`index.html`) shows four featured
products; `products.html` lists eight. The nav is identical on both pages so
navigation feels consistent. Note that images use descriptive `alt` text (e.g.
`alt="Smartphone X200"`) rather than empty or filename-based text.
