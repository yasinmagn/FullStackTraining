/**
 * Stage 1 - the DOM, by hand.
 *
 * Every line here is something React will later do for you. Writing it once
 * yourself is what makes React's value obvious instead of magical:
 *
 *   - you hold state in a plain array
 *   - you re-render by rebuilding the list
 *   - you keep the DOM in sync manually, and it is easy to get wrong
 *
 * Read this file top to bottom. It is deliberately small.
 */

// --- 1. State -------------------------------------------------------------
// One array is the single source of truth. The DOM is only a *projection* of
// it. If you ever find yourself reading state back out of the DOM, you have
// two sources of truth and they will drift.

/** @typedef {{ id: string, title: string, priority: 'low'|'medium'|'high', done: boolean }} Task */

/** @type {Task[]} */
let tasks = [];

/** @type {'all' | 'open' | 'done'} */
let filter = 'all';

// --- 2. Element references ------------------------------------------------
// Query once at startup, not inside every handler. `querySelector` walks the
// tree each time it is called.

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const titleError = document.querySelector('#task-title-error');
const priorityInput = document.querySelector('#task-priority');
const list = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const toolbar = document.querySelector('.toolbar');

// --- 3. Rendering ---------------------------------------------------------

/** Apply the active filter. Derived data - never stored, always computed. */
function visibleTasks() {
  if (filter === 'open') return tasks.filter((t) => !t.done);
  if (filter === 'done') return tasks.filter((t) => t.done);
  return tasks;
}

/**
 * Build one <li>. Note `textContent`, never `innerHTML`: if a task title were
 * `<img src=x onerror=alert(1)>`, innerHTML would execute it. textContent
 * treats it as text. This is XSS prevention in one method call.
 */
function renderTask(task) {
  const li = document.createElement('li');
  li.className = 'task-item';
  li.dataset.id = task.id;
  li.dataset.done = String(task.done);

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.id = `done-${task.id}`;

  const label = document.createElement('label');
  label.className = 'task-title';
  label.htmlFor = checkbox.id;
  label.textContent = task.title;

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.dataset.priority = task.priority;
  badge.textContent = task.priority;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.dataset.action = 'remove';
  // Screen readers read the accessible name, so make it say which task.
  remove.setAttribute('aria-label', `Remove ${task.title}`);
  remove.textContent = 'x';

  li.append(checkbox, label, badge, remove);
  return li;
}

/**
 * Re-render the whole list.
 *
 * Throwing everything away and rebuilding is the simplest correct strategy,
 * and for a list this size it is instant. It is also exactly the problem the
 * virtual DOM solves at scale - remember this when you meet React's keys.
 */
function render() {
  const visible = visibleTasks();

  list.replaceChildren(...visible.map(renderTask));
  emptyState.hidden = visible.length > 0;
  emptyState.textContent =
    tasks.length === 0 ? 'No tasks yet. Add one above.' : `No ${filter} tasks.`;
}

// --- 4. Events ------------------------------------------------------------

form.addEventListener('submit', (event) => {
  // Without this the browser navigates away and your state is gone.
  event.preventDefault();

  const title = titleInput.value.trim();

  if (title.length < 3) {
    titleError.textContent = 'Title needs at least 3 characters.';
    titleInput.setAttribute('aria-invalid', 'true');
    titleInput.focus();
    return;
  }

  titleError.textContent = '';
  titleInput.removeAttribute('aria-invalid');

  tasks = [
    ...tasks,
    {
      id: crypto.randomUUID(), // built into every modern browser
      title,
      priority: priorityInput.value,
      done: false,
    },
  ];

  form.reset();
  titleInput.focus(); // keep the keyboard user where they were
  render();
});

/**
 * One listener on the <ul> handles every row - "event delegation".
 *
 * Events bubble up from the element that was clicked, so the parent can see
 * them. This means rows added later work with no extra wiring, and there is
 * one listener instead of one per row.
 */
list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="remove"]');
  if (!button) return;

  const id = button.closest('.task-item').dataset.id;
  tasks = tasks.filter((task) => task.id !== id);
  render();
});

list.addEventListener('change', (event) => {
  if (event.target.type !== 'checkbox') return;

  const id = event.target.closest('.task-item').dataset.id;
  tasks = tasks.map((task) => (task.id === id ? { ...task, done: event.target.checked } : task));
  render();
});

toolbar.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;

  filter = button.dataset.filter;

  // Keep the accessible state in sync with the visual state. The CSS styles
  // the button off aria-pressed, so these can never disagree.
  for (const b of toolbar.querySelectorAll('button[data-filter]')) {
    b.setAttribute('aria-pressed', String(b === button));
  }

  render();
});

// --- 5. Start -------------------------------------------------------------

tasks = [
  { id: crypto.randomUUID(), title: 'Read the Stage 1 lesson', priority: 'medium', done: true },
  { id: crypto.randomUUID(), title: 'Finish the exercises', priority: 'high', done: false },
];

render();
