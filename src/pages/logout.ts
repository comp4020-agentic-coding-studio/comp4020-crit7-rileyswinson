import type { APIRoute } from "astro";
import { logOut } from "../lib/session";

export const POST: APIRoute = ({ cookies, redirect }) => {
  logOut(cookies);
  return redirect("/", 303);
};
