import { type Assignment, getAssignment } from "./db";
import { isPast } from "./dates";
import { MAX_UPLOAD_BYTES } from "./policy";

// The checks every request form shares: a real assignment in the chosen
// course, a day count within the form's range, and uploads under the cap.

export type Picked =
  | { ok: true; assignment: Assignment; days: number }
  | { ok: false; error: string };

export function readPick(
  form: FormData,
  min: number,
  max: number,
  allowPast: boolean,
): Picked {
  const assignment = getAssignment(Number(form.get("assignmentId")));
  const courseId = Number(form.get("courseId"));
  if (!assignment || (courseId && courseId !== assignment.courseId)) {
    return { ok: false, error: "Choose a course and one of its assignments." };
  }
  const days = Number(form.get("days"));
  if (!Number.isInteger(days) || days < min || days > max) {
    return { ok: false, error: `Choose between ${min} and ${max} working days.` };
  }
  if (!allowPast && isPast(assignment.dueAt)) {
    return {
      ok: false,
      error:
        "That assignment's due date has passed. Extensions here must be requested on or before the due date, so use an Extenuating Circumstances Application instead.",
    };
  }
  return { ok: true, assignment, days };
}

export async function readFiles(
  form: FormData,
): Promise<{ ok: true; files: { filename: string; mime: string; data: Buffer }[] } | { ok: false; error: string }> {
  const entries = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const total = entries.reduce((n, f) => n + f.size, 0);
  if (total > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Attachments must total 10 MB or less." };
  }
  const files = await Promise.all(
    entries.slice(0, 10).map(async (f) => ({
      filename: f.name.slice(0, 200) || "attachment",
      mime: f.type || "application/octet-stream",
      data: Buffer.from(await f.arrayBuffer()),
    })),
  );
  return { ok: true, files };
}
