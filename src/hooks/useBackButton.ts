import { useEffect, useRef } from 'react';

const backButtonStack: { id: number; close: () => void }[] = [];
let nextId = 0;

/**
 * A hook that pushes a state to the browser history when a sub-page or modal opens,
 * and intercepts the back button to close the sub-page instead of navigating away.
 * If the sub-page is closed programmatically (e.g. by a close button), it pops the history.
 */
export function useBackButton(isOpen: boolean, onClose: () => void) {
  const isPopStateTriggered = useRef(false);
  const didPushState = useRef(false);
  const onCloseRef = useRef(onClose);
  const idRef = useRef(nextId++);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ isSubPage: true }, '');
      didPushState.current = true;
      isPopStateTriggered.current = false;
      backButtonStack.push({ id: idRef.current, close: () => onCloseRef.current() });
    } else {
      if (didPushState.current && !isPopStateTriggered.current) {
         window.history.back();
      }
      didPushState.current = false;
      isPopStateTriggered.current = false;
      
      const index = backButtonStack.findIndex(item => item.id === idRef.current);
      if (index > -1) {
        backButtonStack.splice(index, 1);
      }
    }

    return () => {
      const index = backButtonStack.findIndex(item => item.id === idRef.current);
      if (index > -1) {
        backButtonStack.splice(index, 1);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        const isTop = backButtonStack.length > 0 && backButtonStack[backButtonStack.length - 1].id === idRef.current;
        if (isTop) {
          isPopStateTriggered.current = true;
          onCloseRef.current();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);
}
