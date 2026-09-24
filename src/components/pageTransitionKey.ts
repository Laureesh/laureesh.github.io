export function pageTransitionKey(pathname: string): string {
  const persistentWorkspaces = [
    "/admin-dashboard/private-pages/notebook",
    "/admin-dashboard/private-pages/flashbolt",
    "/flashbolt",
  ];
  return persistentWorkspaces.find(base => pathname === base || pathname.startsWith(`${base}/`)) ?? pathname;
}
