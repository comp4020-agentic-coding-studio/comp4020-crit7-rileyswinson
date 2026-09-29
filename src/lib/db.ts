import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  type Assignment,
  type Attachment,
  type Course,
  type ExtensionRequest,
  type User,
  assignments,
  attachments,
  courseStaff,
  courses,
  requests,
  users,
} from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Assignment, Attachment, Course, ExtensionRequest, User };

// ── users ────────────────────────────────────────────────────────────────

export function getUser(uid: string): User | undefined {
  return db.select().from(users).where(eq(users.uid, uid)).get();
}

export function saveUser(u: {
  uid: string;
  isStudent: boolean;
  isStaff: boolean;
  hasEap: boolean;
}): User {
  return db
    .insert(users)
    .values(u)
    .onConflictDoUpdate({
      target: users.uid,
      set: { isStudent: u.isStudent, isStaff: u.isStaff, hasEap: u.hasEap },
    })
    .returning()
    .get();
}

// ── courses ──────────────────────────────────────────────────────────────

export function listCourses(): Course[] {
  return db.select().from(courses).orderBy(asc(courses.code)).all();
}

export function coursesForStaff(uid: string): Course[] {
  return db
    .select({ id: courses.id, code: courses.code, name: courses.name, createdBy: courses.createdBy })
    .from(courses)
    .innerJoin(courseStaff, eq(courseStaff.courseId, courses.id))
    .where(eq(courseStaff.uid, uid))
    .orderBy(asc(courses.code))
    .all();
}

export function getCourse(id: number): Course | undefined {
  return db.select().from(courses).where(eq(courses.id, id)).get();
}

export function isCourseStaff(courseId: number, uid: string): boolean {
  return !!db
    .select()
    .from(courseStaff)
    .where(and(eq(courseStaff.courseId, courseId), eq(courseStaff.uid, uid)))
    .get();
}

export function createCourse(code: string, name: string, createdBy: string): Course {
  return db.transaction((tx) => {
    const course = tx.insert(courses).values({ code, name, createdBy }).returning().get();
    tx.insert(courseStaff).values({ courseId: course.id, uid: createdBy }).run();
    return course;
  });
}

export function courseCodeTaken(code: string): boolean {
  return !!db.select().from(courses).where(eq(courses.code, code)).get();
}

export function listStaff(courseId: number): string[] {
  return db
    .select({ uid: courseStaff.uid })
    .from(courseStaff)
    .where(eq(courseStaff.courseId, courseId))
    .orderBy(asc(courseStaff.uid))
    .all()
    .map((r) => r.uid);
}

export function addStaff(courseId: number, uid: string): void {
  db.insert(courseStaff).values({ courseId, uid }).onConflictDoNothing().run();
}

export function removeStaff(courseId: number, uid: string): void {
  db.delete(courseStaff)
    .where(and(eq(courseStaff.courseId, courseId), eq(courseStaff.uid, uid)))
    .run();
}

// ── assignments ──────────────────────────────────────────────────────────

export function listAssignments(courseId?: number): Assignment[] {
  const q = db.select().from(assignments);
  return (courseId === undefined ? q : q.where(eq(assignments.courseId, courseId)))
    .orderBy(asc(assignments.dueAt))
    .all();
}

export function getAssignment(id: number): Assignment | undefined {
  return db.select().from(assignments).where(eq(assignments.id, id)).get();
}

export function addAssignment(courseId: number, name: string, dueAt: string): Assignment {
  return db.insert(assignments).values({ courseId, name, dueAt }).returning().get();
}

export function updateAssignment(id: number, name: string, dueAt: string): void {
  db.update(assignments).set({ name, dueAt }).where(eq(assignments.id, id)).run();
}

export function deleteAssignment(id: number): void {
  db.delete(assignments).where(eq(assignments.id, id)).run();
}

// ── requests ─────────────────────────────────────────────────────────────

export type RequestRow = ExtensionRequest & {
  assignmentName: string;
  dueAt: string;
  courseId: number;
  courseCode: string;
  courseName: string;
};

function requestQuery() {
  return db
    .select({
      id: requests.id,
      kind: requests.kind,
      studentUid: requests.studentUid,
      assignmentId: requests.assignmentId,
      workingDays: requests.workingDays,
      newDueAt: requests.newDueAt,
      message: requests.message,
      circumstance: requests.circumstance,
      eapShared: requests.eapShared,
      status: requests.status,
      decisionNote: requests.decisionNote,
      decidedBy: requests.decidedBy,
      createdAt: requests.createdAt,
      assignmentName: assignments.name,
      dueAt: assignments.dueAt,
      courseId: courses.id,
      courseCode: courses.code,
      courseName: courses.name,
    })
    .from(requests)
    .innerJoin(assignments, eq(assignments.id, requests.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId));
}

export function getRequest(id: number): RequestRow | undefined {
  return requestQuery().where(eq(requests.id, id)).get();
}

export function requestsForStudent(uid: string): RequestRow[] {
  return requestQuery().where(eq(requests.studentUid, uid)).orderBy(desc(requests.id)).all();
}

// Course staff see automatic and short extensions for their courses. ECAs
// are never listed here: they may carry confidential medical documents and
// belong to the central team alone.
export function requestsForStaff(uid: string): RequestRow[] {
  const ids = coursesForStaff(uid).map((c) => c.id);
  if (ids.length === 0) return [];
  return requestQuery()
    .where(and(inArray(courses.id, ids), ne(requests.kind, "eca")))
    .orderBy(desc(requests.id))
    .all();
}

export function requestsForCentral(): RequestRow[] {
  return requestQuery().where(eq(requests.kind, "eca")).orderBy(desc(requests.id)).all();
}

export function hasAutoExtension(uid: string, assignmentId: number): boolean {
  return !!db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.studentUid, uid),
        eq(requests.assignmentId, assignmentId),
        eq(requests.kind, "auto"),
      ),
    )
    .get();
}

export function createRequest(
  r: typeof requests.$inferInsert,
  files: { filename: string; mime: string; data: Buffer }[] = [],
): ExtensionRequest {
  return db.transaction((tx) => {
    const row = tx.insert(requests).values(r).returning().get();
    for (const f of files) {
      tx.insert(attachments)
        .values({ requestId: row.id, filename: f.filename, mime: f.mime, size: f.data.length, data: f.data })
        .run();
    }
    return row;
  });
}

export function decideRequest(
  id: number,
  status: "approved" | "declined",
  note: string,
  by: string,
): void {
  db.update(requests).set({ status, decisionNote: note, decidedBy: by }).where(eq(requests.id, id)).run();
}

// ── attachments ──────────────────────────────────────────────────────────

export function listAttachments(requestId: number): Omit<Attachment, "data">[] {
  return db
    .select({
      id: attachments.id,
      requestId: attachments.requestId,
      filename: attachments.filename,
      mime: attachments.mime,
      size: attachments.size,
    })
    .from(attachments)
    .where(eq(attachments.requestId, requestId))
    .all();
}

export function getAttachment(id: number): Attachment | undefined {
  return db.select().from(attachments).where(eq(attachments.id, id)).get();
}
