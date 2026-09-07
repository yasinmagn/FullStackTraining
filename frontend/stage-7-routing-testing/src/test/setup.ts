/**
 * Runs before every test file.
 *
 * `@testing-library/jest-dom` adds DOM-aware matchers to `expect`:
 *   toBeInTheDocument, toBeVisible, toBeDisabled, toHaveAccessibleName,
 *   toHaveValue, toHaveAttribute ...
 *
 * They produce far better failure messages than poking at properties by hand.
 * Compare:
 *   expect(button.disabled).toBe(true)   -> "expected false to be true"
 *   expect(button).toBeDisabled()        -> prints the actual element
 */
import '@testing-library/jest-dom/vitest';
