export const routes = {
  auth: {
    login: "/login",
    callback: "/auth/callback",
  },
  dashboard: {
    home: "/",
    orders: "/orders",
    menu: "/menu",
    inventory: "/inventory",
    batches: "/batches",
    settlements: "/settlements",
    reviews: "/reviews",
    profile: "/profile",
    settings: "/settings",
  },
} as const;
