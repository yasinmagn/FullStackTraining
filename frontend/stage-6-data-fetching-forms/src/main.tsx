import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

/**
 * StrictMode is development-only. It deliberately double-invokes your
 * components and effects to surface impure render logic and missing effect
 * cleanup. If something breaks only in StrictMode, the component is the bug -
 * not StrictMode.
 */
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
