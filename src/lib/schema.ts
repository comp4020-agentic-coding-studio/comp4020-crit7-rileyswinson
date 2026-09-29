import { sql } from "drizzle-orm";
import { blob, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// The starter's guestbook table stays so its migration trail is intact; the
// app no longer reads or writes it.
export const messages = sqliteTable("messages", {
  id: int().primaryKey({ autoIncrement: true }),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// A person, keyed by ANU UID. There is no passcode: the UID *is* the login.
// Roles are flags rather than one enum because a person can be both.
export const users = sqliteTable("users", {
  uid: text().primaryKey(),
  isStudent: int("is_student", { mode: "boolean" }).notNull().default(false),
  isStaff: int("is_staff", { mode: "boolean" }).notNull().default(false),
  hasEap: int("has_eap", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  code: text().notNull().unique(),
  name: text().notNull(),
  createdBy: text("created_by").notNull(),
});

// Staff are attached by UID, not by user row: a UID can be added before that
// person has ever logged in, and the course appears on their staff side the
// first time they open it.
export const courseStaff = sqliteTable(
  "course_staff",
  {
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    uid: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.uid] })],
);

export const assignments = sqliteTable("assignments", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  name: text().notNull(),
  // local Canberra wall-clock time, "YYYY-MM-DDTHH:mm"
  dueAt: text("due_at").notNull(),
  // coursework and exams the course/school/college runs itself go through
  // ordinary extensions; centrally run exams (the exam block) need an ECA
  kind: text({ enum: ["coursework", "local_exam", "central_exam"] })
    .notNull()
    .default("coursework"),
});

// auto  — automatic short extension, granted on submission, course staff see it
// short — short extension, decided by course staff
// eca   — extenuating circumstances application, decided by CENTRAL only
export const requests = sqliteTable("requests", {
  id: int().primaryKey({ autoIncrement: true }),
  kind: text({ enum: ["auto", "short", "eca"] }).notNull(),
  studentUid: text("student_uid").notNull(),
  assignmentId: int("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  workingDays: int("working_days").notNull(),
  newDueAt: text("new_due_at").notNull(),
  message: text().notNull().default(""),
  circumstance: text().notNull().default(""),
  eapShared: int("eap_shared", { mode: "boolean" }).notNull().default(false),
  // pending: nobody has responded yet; the rest are set by a response
  status: text({ enum: ["pending", "considering", "approved", "declined"] }).notNull(),
  decisionNote: text("decision_note").notNull().default(""),
  decidedBy: text("decided_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const attachments = sqliteTable("attachments", {
  id: int().primaryKey({ autoIncrement: true }),
  requestId: int("request_id")
    .notNull()
    .references(() => requests.id, { onDelete: "cascade" }),
  filename: text().notNull(),
  mime: text().notNull(),
  size: int().notNull(),
  data: blob({ mode: "buffer" }).notNull(),
});

// Every status change by staff or CENTRAL carries a written response to the
// applicant, kept as a thread so "under consideration" then "accepted" both
// stay on the record.
export const responses = sqliteTable("responses", {
  id: int().primaryKey({ autoIncrement: true }),
  requestId: int("request_id")
    .notNull()
    .references(() => requests.id, { onDelete: "cascade" }),
  author: text().notNull(),
  status: text({ enum: ["considering", "approved", "declined"] }).notNull(),
  body: text().notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Message = typeof messages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type ExtensionRequest = typeof requests.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type Response = typeof responses.$inferSelect;
