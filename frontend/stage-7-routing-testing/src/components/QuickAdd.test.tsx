import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { QuickAdd } from './QuickAdd.tsx';
import { renderWithProviders } from '../test/renderApp.tsx';

/**
 * Component tests, and a tour of the query priority ladder.
 *
 * Testing Library orders its queries by how closely they resemble how a person
 * finds things on screen. Work down this list and stop at the first that fits:
 *
 *   1. getByRole        - by accessible role + name. ALWAYS TRY THIS FIRST.
 *   2. getByLabelText   - form fields
 *   3. getByPlaceholderText
 *   4. getByText        - non-interactive content
 *   5. getByDisplayValue
 *   6. getByTestId      - the escape hatch, not the default
 *
 * A test written with roles is also an accessibility check: if `getByRole`
 * cannot find your button, neither can a screen reader.
 */

describe('QuickAdd', () => {
  it('submits a valid title', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    // getByLabelText: the <label for> / <input id> pairing does real work here.
    await user.type(screen.getByLabelText('New task'), 'Write a component test');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith('Write a component test');
    // The field clears on success - a user-visible outcome, not internal state.
    await waitFor(() => expect(screen.getByLabelText('New task')).toHaveValue(''));
  });

  it('trims whitespace before submitting', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.type(screen.getByLabelText('New task'), '   Ship it   ');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(onAdd).toHaveBeenCalledWith('Ship it');
  });

  it('rejects a short title and never calls the callback', async () => {
    const onAdd = vi.fn();
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.type(screen.getByLabelText('New task'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Title needs at least 3 characters')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('links the error to the input so a screen reader announces it', async () => {
    const { user } = renderWithProviders(<QuickAdd onAdd={vi.fn()} />);

    await user.type(screen.getByLabelText('New task'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    const input = screen.getByLabelText('New task');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    /*
     * toHaveAccessibleDescription resolves aria-describedby for you. This
     * asserts the thing that actually matters - that the message reaches an
     * assistive-tech user - rather than that a CSS class is present.
     */
    expect(input).toHaveAccessibleDescription('Title needs at least 3 characters');
  });

  it('disables the button while saving, then re-enables it', async () => {
    // A promise we control, so we can inspect the in-flight state.
    let resolveAdd: () => void = () => {};
    const onAdd = vi.fn(() => new Promise<void>((resolve) => { resolveAdd = resolve; }));

    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.type(screen.getByLabelText('New task'), 'Slow save');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    // Mid-flight: the label changed and the button is disabled, which is what
    // stops a double submit.
    const button = await screen.findByRole('button', { name: 'Saving...' });
    expect(button).toBeDisabled();

    resolveAdd();
    expect(await screen.findByRole('button', { name: 'Add task' })).toBeEnabled();
  });

  it('re-enables the button after a FAILED save', async () => {
    // The regression this guards: a `finally`-less handler leaves the form
    // locked forever after one failure.
    const onAdd = vi.fn().mockRejectedValue(new Error('Server said no'));
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.type(screen.getByLabelText('New task'), 'Doomed task');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Server said no')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add task' })).toBeEnabled();
  });

  it('announces the success count with role="status"', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.type(screen.getByLabelText('New task'), 'First task');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    // role="status" is a polite live region: announced without stealing focus.
    expect(await screen.findByRole('status')).toHaveTextContent('1 added');
  });

  it('can be completed with the keyboard alone', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const { user } = renderWithProviders(<QuickAdd onAdd={onAdd} />);

    await user.tab();
    expect(screen.getByLabelText('New task')).toHaveFocus();

    // Enter inside a form submits it - one of the things you lose the moment
    // you replace <form> with a <div> and a click handler.
    await user.keyboard('Keyboard only{Enter}');

    expect(onAdd).toHaveBeenCalledWith('Keyboard only');
  });
});
