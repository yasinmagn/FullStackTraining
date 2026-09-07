import type { ReactNode } from 'react';

/**
 * Composition over configuration.
 *
 * The tempting design is a pile of optional props:
 *
 *   <Card title="Tasks" showFooter footerText="4 items" headerIcon="list"
 *         headerAction={...} collapsible variant="bordered" />
 *
 * Every new requirement adds another prop, and the component slowly becomes a
 * badly-specified framework. The alternative is to accept *slots* - props whose
 * value is JSX - and let the caller decide what goes in them.
 */
interface CardProps {
  title: ReactNode;
  /** A slot. The caller supplies whatever belongs top-right; we never guess. */
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Card({ title, action, children, footer }: CardProps) {
  return (
    <section className="card">
      <header className="card-header">
        {/*
          Rendering a heading here rather than accepting `headingLevel` keeps
          the component simple. If a caller genuinely needs an <h3>, they pass
          one as `title` - it is a ReactNode, so that already works.
        */}
        <h2>{title}</h2>
        {/*
          `&&` is the standard conditional render. Note the trap: with a NUMBER
          on the left, `{count && <X/>}` renders a literal "0" when count is 0.
          `action` is a ReactNode here, so `undefined` renders nothing - safe.
        */}
        {action && <div className="card-action">{action}</div>}
      </header>

      <div className="card-body">{children}</div>

      {footer && <footer className="card-footer">{footer}</footer>}
    </section>
  );
}
