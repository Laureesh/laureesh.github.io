export type AdminPrivateResourceKey =
  | "food-routine"
  | "face-routine"
  | "fn-leaderboard"
  | "ps99-inventory";
export type AdminPrivateResourceKind = "structured-page" | "standalone-tool";

export interface AdminPrivateResource {
  key: AdminPrivateResourceKey;
  label: string;
  route: string;
  description: string;
  kind: AdminPrivateResourceKind;
}

export const adminPrivateResources: AdminPrivateResource[] = [
  {
    key: "food-routine",
    label: "Food Routine",
    route: "/admin-dashboard/private-pages/food-routine",
    description: "Admin-only nutrition, meal-prep, and daily eating-flow notes.",
    kind: "structured-page",
  },
  {
    key: "face-routine",
    label: "Face Routine",
    route: "/admin-dashboard/private-pages/face-routine",
    description: "Admin-only skincare, product order, and weekly maintenance notes.",
    kind: "structured-page",
  },
  {
    key: "fn-leaderboard",
    label: "UEFN Leaderboard Manager",
    route: "/admin-dashboard/private-pages/fn-leaderboard",
    description: "Admin-only standalone leaderboard manager imported from the supplied HTML tool.",
    kind: "standalone-tool",
  },
  {
    key: "ps99-inventory",
    label: "Pet Simulator 99 Inventory",
    route: "/admin-dashboard/private-pages/ps99-inventory",
    description: "Admin-only tracker for Pet Simulator 99 item rarity, category, and diamond worth.",
    kind: "structured-page",
  },
];

export function getAdminPrivateResource(key: AdminPrivateResourceKey) {
  return adminPrivateResources.find((resource) => resource.key === key) ?? adminPrivateResources[0];
}
