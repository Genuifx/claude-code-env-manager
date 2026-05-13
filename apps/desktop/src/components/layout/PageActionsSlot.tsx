import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into the titlebar's #page-actions-slot via portal.
 * Use this from any page component to place action buttons in the page header.
 */
export function PageActionsSlot({ children }: { children: ReactNode }) {
  const target = document.getElementById('page-actions-slot');
  if (!target) return null;
  return createPortal(children, target);
}
