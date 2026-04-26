import { createPortal } from 'react-dom';

const MODAL_ROOT_ID = 'modal-root';

function getOrCreateModalRoot() {
  let root = document.getElementById(MODAL_ROOT_ID);

  if (!root) {
    root = document.createElement('div');
    root.setAttribute('id', MODAL_ROOT_ID);
    document.body.appendChild(root);
  }

  return root;
}

export default function ModalPortal({ children }) {
  if (typeof document === 'undefined') {
    return null;
  }

  const portalRoot = getOrCreateModalRoot();

  if (!portalRoot) {
    return null;
  }

  return createPortal(children, portalRoot);
}
