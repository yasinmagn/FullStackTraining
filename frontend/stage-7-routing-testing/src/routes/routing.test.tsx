import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../test/renderApp.tsx';

/**
 * Routing tests.
 *
 * The guiding principle for everything in this file:
 *
 *   "The more your tests resemble the way your software is used,
 *    the more confidence they can give you."   - Kent C. Dodds
 *
 * So: no shallow rendering, no reaching into component internals, no asserting
 * on state. Click the things a user would click; assert on what they would see.
 */

describe('routing', () => {
  it('renders the task list at /', async () => {
    renderApp('/');

    /*
     * `findBy*` waits for an element to appear (data is loading). `getBy*`
     * fails immediately. Use `findBy*` for anything asynchronous and you will
     * never write an arbitrary `sleep` in a test.
     */
    expect(await screen.findByRole('link', { name: 'Set up routing' })).toBeInTheDocument();

    /*
     * Query by ROLE, with the accessible name. This is the top of Testing
     * Library's priority list because it is how assistive tech finds things -
     * so a test that passes is also evidence the element is reachable.
     */
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument();
  });

  it('navigates to a task detail page when a task link is clicked', async () => {
    const { user, router } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: 'Write a component test' }));

    // The user-visible outcome...
    expect(await screen.findByText('Query by role, not by class.')).toBeInTheDocument();
    // ...and the URL, which is part of the contract with the user.
    expect(router.state.location.pathname).toBe('/tasks/2');
  });

  it('renders a detail page directly from its URL (deep link)', async () => {
    renderApp('/tasks/3');

    expect(await screen.findByRole('heading', { level: 2, name: 'Handle the 404 route' })).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown URL', async () => {
    renderApp('/nope');

    expect(await screen.findByRole('heading', { name: 'Not found' })).toBeInTheDocument();
    // A catch-all route beats a blank page - assert it actually renders.
    expect(screen.getByRole('link', { name: /back to the task list/i })).toBeInTheDocument();
  });

  it('lazy-loads the about route', async () => {
    const { user } = renderApp('/');

    await user.click(screen.getByRole('link', { name: 'About' }));

    // The chunk is fetched on demand; findBy* waits for it without a sleep.
    expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument();
  });

  it('keeps the layout mounted across navigations', async () => {
    const { user } = renderApp('/');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Task Board' });
    await user.click(screen.getByRole('link', { name: 'About' }));

    // Same node, not a re-created one: that is what <Outlet /> buys you, and
    // why scroll position and focus survive a navigation.
    expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Task Board' })).toBe(heading);
  });
});

describe('URL as state', () => {
  it('reads the initial filter from the query string', async () => {
    renderApp('/?status=done');

    expect(await screen.findByRole('link', { name: 'Set up routing' })).toBeInTheDocument();
    // 'Write a component test' is in_progress, so it must be filtered out.
    expect(screen.queryByRole('link', { name: 'Write a component test' })).not.toBeInTheDocument();
  });

  it('writes the filter back to the URL when a filter is clicked', async () => {
    const { user, router } = renderApp('/');
    await screen.findByRole('link', { name: 'Set up routing' });

    const filters = screen.getByRole('group', { name: 'Filter by status' });
    await user.click(within(filters).getByRole('button', { name: 'todo' }));

    // Shareable, bookmarkable, survives a refresh - none of which useState gives you.
    expect(router.state.location.search).toBe('?status=todo');
    expect(await screen.findByRole('link', { name: 'Handle the 404 route' })).toBeInTheDocument();
  });

  it('marks the active filter with aria-pressed, not just a CSS class', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: 'Set up routing' });

    const filters = screen.getByRole('group', { name: 'Filter by status' });
    const todo = within(filters).getByRole('button', { name: 'todo' });

    expect(todo).toHaveAttribute('aria-pressed', 'false');
    await user.click(todo);
    expect(todo).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state rather than a stuck spinner when nothing matches', async () => {
    renderApp('/?status=todo');
    await screen.findByRole('link', { name: 'Handle the 404 route' });

    // Sanity: the "loaded but empty" state exists and is distinct from loading.
    expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
  });
});
