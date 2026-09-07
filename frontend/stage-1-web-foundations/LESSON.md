# Frontend Stage 1 — Web Foundations

> **Goal:** understand what a browser actually does, so that every framework you
> meet later looks like a convenience rather than a mystery.

| | |
|---|---|
| **Time** | ~90 minutes |
| **Prerequisites** | None |
| **You will build** | A task board with semantic HTML, a responsive CSS layout, and DOM-driven interactivity — no libraries, no build step |

---

## 1. Why this stage exists

Every frontend framework compiles down to three things:

1. **HTML** — the structure and meaning of the document
2. **CSS** — how that structure is painted
3. **The DOM API** — the JavaScript interface for reading and changing it

React does not replace these. It *automates* them. If you skip this stage you
will spend years treating `useState` as magic. Spend ninety minutes here and
React becomes obvious.

---

## 2. Run it

```bash
npm install                                            # once, from the repo root
npm run dev --workspace frontend-stage-1-web-foundations
```

Open <http://localhost:5100>.

There is no bundler. `src/index.html` is served as-is, and the browser fetches
`styles.css` and `app.js` itself. That is the whole pipeline.

---

## 3. HTML: meaning, not boxes

Compare these two:

```html
<!-- Works visually. Meaningless to a screen reader, to Google, and to you in six months. -->
<div class="header"><div class="title">Task Board</div></div>

<!-- Same pixels. Now the document has structure. -->
<header><h1>Task Board</h1></header>
```

### The landmarks worth knowing

| Element | Use it for |
|---|---|
| `<header>` | Introductory content for the page or a section |
| `<nav>` | A block of navigation links |
| `<main>` | The primary content. **Exactly one per page** |
| `<section>` | A thematic grouping, normally with a heading |
| `<article>` | Something that would still make sense on its own |
| `<aside>` | Tangential content (sidebars, pull quotes) |
| `<footer>` | Closing content for the page or a section |

Screen reader users navigate *by landmark*, the same way you navigate by
scrolling. A page built from `<div>`s gives them nothing to jump to.

### Forms are not optional

`src/index.html` wraps the inputs in a real `<form>`. That single element buys
you:

- Enter submits the form
- The browser can autofill it
- `required` / `minlength` give you free client-side validation
- Password managers recognise it
- Assistive tech announces it as a form

A `<div>` plus an `onClick` throws away all of it.

### Labels

```html
<label for="task-title">Title</label>
<input id="task-title" name="title" />
```

The `for`/`id` pair is what makes clicking the label focus the input, and what
makes a screen reader announce "Title, edit text" instead of "edit text". A
placeholder is **not** a label — it disappears the moment you type.

### Accessibility you get almost free

- `<a class="skip-link" href="#main">` — the first Tab press on any page should
  let a keyboard user skip the navigation.
- `aria-live="polite"` on the error paragraph — errors get announced when they
  appear, without stealing focus mid-typing.
- `aria-pressed` on the filter buttons — the accessible source of truth for
  "this toggle is on". Notice that `styles.css` styles the button *from that
  attribute*, so the visual state and the announced state cannot drift apart.
- `aria-label="Remove Buy milk"` on the delete button — "x" alone tells a
  screen reader user nothing.

---

## 4. CSS: three ideas cover most of it

### 4.1 Custom properties (variables)

```css
:root {
  --accent: #2f5bea;
  --space: 1rem;
}
.button { background: var(--accent); }
```

Name a value once, use it everywhere, change it in one place. This is also how
dark mode is done in `styles.css`: `@media (prefers-color-scheme: dark)`
redefines the *tokens*, and every rule follows automatically.

### 4.2 `box-sizing: border-box`

```css
*, *::before, *::after { box-sizing: border-box; }
```

By default `width: 100%` means "100% *plus* padding *plus* border", which
overflows the parent. This one rule is the fix, and it is in essentially every
production stylesheet ever written.

### 4.3 Flexbox vs Grid

| | Flexbox | Grid |
|---|---|---|
| Axes | One (a row **or** a column) | Two (rows **and** columns) |
| Sizing | Content-driven | Layout-driven |
| Reach for it when | Spacing a toolbar, centring, a wrapping form row | Page shells, card galleries, anything aligned in both directions |

Both use `gap`. Stop adding margins to children to create spacing — `gap`
spaces *between* items and never leaves a stray margin on the last one.

### 4.4 Never delete focus outlines

```css
/* Please don't. This makes your site unusable by keyboard. */
:focus { outline: none; }

/* Do this instead. */
:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
```

`:focus-visible` shows the ring for keyboard users and hides it for mouse
clicks, which is what people actually wanted when they wrote `outline: none`.

---

## 5. The DOM: state, render, events

Open `src/app.js`. It has exactly four parts, and this shape recurs in every UI
framework you will ever use.

### 5.1 State

```js
let tasks = [];
let filter = 'all';
```

One array is the **single source of truth**. The DOM is only a projection of
it.

> **The rule:** never read application state back out of the DOM. If the answer
> to "is this task done?" is `checkbox.checked`, you have two sources of truth
> and they *will* drift.

### 5.2 Derived state is computed, never stored

```js
function visibleTasks() {
  if (filter === 'open') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks;
}
```

There is no `visibleTasks` variable to keep in sync — it is a function of
`tasks` and `filter`. Remember this; Stage 5 makes it a formal rule.

### 5.3 Render

```js
list.replaceChildren(...visible.map(renderTask));
```

Throw the list away and rebuild it. Crude, always correct, and instant at this
size. When the list is 10,000 rows it is no longer instant — **that is the
problem the virtual DOM exists to solve.**

### 5.4 `textContent`, not `innerHTML`

```js
label.textContent = task.title;   // safe
label.innerHTML  = task.title;    // XSS
```

If a title is `<img src=x onerror=alert(1)>`, `innerHTML` runs it.
`textContent` displays it as text. This is your first security lesson and it is
one method call.

### 5.5 Event delegation

```js
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="remove"]');
  if (!button) return;
  ...
});
```

Events **bubble** from the clicked element up through its ancestors, so one
listener on the `<ul>` handles every row — including rows added later. One
listener instead of a hundred, and no rewiring after a re-render.

---

## 6. Exercises

Work in `src/`. Each builds on the last.

### Exercise 1 — Task count *(warm-up)*
Show `3 tasks, 1 done` under the list heading. Update it on every render.
*Hint: it is derived state — compute it inside `render()`, don't store it.*

### Exercise 2 — Edit a title
Double-clicking a task title should swap it for an `<input>`. Enter saves,
Escape cancels, blur saves.
*Watch how much bookkeeping this takes. Stage 4 will hand it to you for free.*

### Exercise 3 — Persist to `localStorage`
Save `tasks` on every change, load them on startup.
*`JSON.parse` on corrupt data throws — wrap it in `try/catch` and fall back to
`[]`. Never trust stored input.*

### Exercise 4 — Sort by priority
Add a `<select>` that sorts high → low or low → high.
*`Array.prototype.sort` mutates in place. Copy first: `[...tasks].sort(...)`.*

### Exercise 5 — Make it keyboard-complete
Tab through the whole page using only the keyboard. Can you add, toggle, filter
and remove a task without a mouse? Fix whatever you cannot reach.

---

## 7. Checklist

Before moving on, you should be able to explain:

- [ ] Why `<button>` beats `<div onclick>` (keyboard, focus, screen readers, Enter/Space)
- [ ] What `box-sizing: border-box` fixes
- [ ] When to reach for flexbox and when for grid
- [ ] Why `textContent` is safer than `innerHTML`
- [ ] What event bubbling is, and why delegation depends on it
- [ ] Why derived state should be computed rather than stored

---

## 8. Further reading

- [MDN — HTML elements reference](https://developer.mozilla.org/docs/Web/HTML/Element)
- [MDN — CSS Flexbox guide](https://developer.mozilla.org/docs/Web/CSS/CSS_flexible_box_layout)
- [MDN — CSS Grid guide](https://developer.mozilla.org/docs/Web/CSS/CSS_grid_layout)
- [WAI — ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

**Next:** [Stage 2 — JavaScript Essentials](../stage-2-javascript-essentials/LESSON.md)
