import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/*
 * Links from before the router dropped the "#" still work.
 *
 * Verification, password-reset and invite emails carried /#/verify-email?token=… and the tokens in
 * them outlive the change. Under the current router the browser reads that as the path "/" with a
 * fragment, so the message lands on the marketing page and the token is never read — a dead link
 * that looks like a working one. Rewriting before the router mounts means it is never rendered.
 */
const legacy = window.location.hash;
if (legacy.startsWith('#/')) {
  window.history.replaceState(null, '', legacy.slice(1));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
