import { lazy } from 'react';

type WorkspaceReviewDrawerModule = typeof import('./WorkspaceReviewDrawer');

let workspaceReviewDrawerPreload: Promise<WorkspaceReviewDrawerModule> | null = null;

export function preloadWorkspaceReviewDrawer(): Promise<WorkspaceReviewDrawerModule> {
  workspaceReviewDrawerPreload ??= import('./WorkspaceReviewDrawer');
  return workspaceReviewDrawerPreload;
}

export const LazyWorkspaceReviewDrawer = lazy(async () => {
  const module = await preloadWorkspaceReviewDrawer();
  return { default: module.WorkspaceReviewDrawer };
});
