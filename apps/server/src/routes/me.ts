import { Hono } from "hono";
import type { AppContext } from "../types";

const meRoute = new Hono<AppContext>();

meRoute.get("/me", (c) => {
  return c.json(c.get("profile"));
});

export default meRoute;
