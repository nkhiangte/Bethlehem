import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as ReactDOM from 'react-dom';
// @ts-ignore
import DefaultReactDOM from 'react-dom';
import App from './App.tsx';
import './index.css';

// Polyfill findDOMNode for React 19 compatibility with older libraries like react-quill
if (typeof window !== 'undefined') {
  const findDOMNodePolyfill = (el: any) => {
    if (el === null) return null;
    if (el instanceof HTMLElement) return el;
    return el.current || el;
  };

  // @ts-ignore
  ReactDOM.findDOMNode = ReactDOM.findDOMNode || findDOMNodePolyfill;
  // @ts-ignore
  if (DefaultReactDOM) {
    // @ts-ignore
    DefaultReactDOM.findDOMNode = DefaultReactDOM.findDOMNode || findDOMNodePolyfill;
  }
  // @ts-ignore
  window.ReactDOM = window.ReactDOM || DefaultReactDOM || ReactDOM;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
