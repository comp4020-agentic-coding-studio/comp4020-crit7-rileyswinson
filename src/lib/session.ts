import type { AstroCookies } from "astro";
import { type RequestRow, type User, getUser, isCourseStaff } from "./db";

// There is no passcode: the UID in a cookie is the whole login. That is the
// brief for this prototype, not an oversight to copy into anything real.
export const CENTRAL = "CENTRAL";

const COOKIE = { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 } as const;

export type Side = "student" | "staff";

export type Session =
  | { kind: "central"; uid: typeof CENTRAL }
  | { kind: "new"; uid: string }
  | { kind: "user"; uid: string; user: User; side: Side };

// ANU UIDs are "u" and seven digits; CENTRAL is the one non-UID account.
export function normaliseUid(raw: string): string | null {
  const v = raw.trim();
  if (v.toUpperCase() === CENTRAL) return CENTRAL;
  return /^u\d{7}$/i.test(v) ? v.toLowerCase() : null;
}

export function logIn(cookies: AstroCookies, uid: string): void {
  cookies.set("uid", uid, COOKIE);
  cookies.delete("side", { path: "/" });
}

export function logOut(cookies: AstroCookies): void {
  cookies.delete("uid", { path: "/" });
  cookies.delete("side", { path: "/" });
}

export function setSide(cookies: AstroCookies, side: Side): void {
  cookies.set("side", side, COOKIE);
}

export function getSession(cookies: AstroCookies): Session | null {
  const uid = cookies.get("uid")?.value;
  if (!uid) return null;
  if (uid === CENTRAL) return { kind: "central", uid: CENTRAL };
  const user = getUser(uid);
  if (!user) return { kind: "new", uid };
  const wanted = cookies.get("side")?.value;
  const side: Side =
    user.isStudent && user.isStaff
      ? wanted === "staff"
        ? "staff"
        : "student"
      : user.isStaff
        ? "staff"
        : "student";
  return { kind: "user", uid, user, side };
}

// Who may open a request: the student who made it; course staff for
// automatic and short extensions in their course; CENTRAL for ECAs only.
export function canView(s: Session | null, r: RequestRow): boolean {
  if (!s) return false;
  if (s.kind === "central") return r.kind === "eca";
  if (s.uid === r.studentUid) return true;
  return s.kind === "user" && s.user.isStaff && r.kind !== "eca" && isCourseStaff(r.courseId, s.uid);
}

export function canDecide(s: Session | null, r: RequestRow): boolean {
  if (!s || r.kind === "auto") return false;
  if (s.kind === "central") return r.kind === "eca";
  return (
    s.kind === "user" && s.user.isStaff && s.uid !== r.studentUid && r.kind === "short" &&
    isCourseStaff(r.courseId, s.uid)
  );
}
