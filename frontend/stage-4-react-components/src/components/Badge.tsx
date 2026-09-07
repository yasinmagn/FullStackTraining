import type { ReactNode } from 'react';

/**
 * The smallest useful component: a presentational leaf.
 *
 * Two ideas worth naming:
 *
 * 1. `children` is just a prop. `<Badge>Hi</Badge>` is exactly
 *    `<Badge children="Hi" />`. That is the whole basis of composition in React.
 *
 * 2. `ReactNode` is the right type for "anything renderable" - a string, a
 *    number, an element, an array of them, null. Using `string` here would stop
 *    a caller passing `<strong>3</strong>`.
 */
interface BadgeProps {
  children: ReactNode;
  /** Drives the CSS, and stays a closed set so a typo is a compile error. */
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span className="badge" data-tone={tone}>
      {children}
    </span>
  );
}
