import axe from "axe-core";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

// Crit 7's checkable contract, driven over HTTP against the built server:
// "the core flow persists across a reload" plus the promises this app makes
// about who handles what. Each role gets its own cookie jar, the way separate
// browsers would.
const baseUrl = inject("baseUrl");

class Browser {
  cookies = new Map<string, string>();

  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, v] = pair.split("=");
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.delete(k);
      else this.cookies.set(k, v);
    }
  }

  private header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async get(path: string) {
    const res = await fetch(new URL(path, baseUrl), { headers: { cookie: this.header() }, redirect: "manual" });
    this.store(res);
    return res;
  }

  async html(path: string) {
    const res = await this.get(path);
    expect(res.status, `GET ${path}`).toBe(200);
    return res.text();
  }

  // Astro rejects form POSTs without a same-origin Origin header (CSRF);
  // browsers send it automatically, a bare fetch doesn't.
  async post(path: string, fields: Record<string, string> | FormData) {
    const body = fields instanceof FormData ? fields : new URLSearchParams(fields);
    const res = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { origin: baseUrl, cookie: this.header() },
      body,
      redirect: "manual",
    });
    this.store(res);
    return res;
  }

  async login(uid: string, roles: { student?: boolean; staff?: boolean; eap?: boolean } = {}) {
    await this.post("/", { action: "login", uid });
    const home = await this.get("/");
    if (home.headers.get("location") === "/setup/") {
      const f: Record<string, string> = {};
      if (roles.student) f.student = "on";
      if (roles.staff) f.staff = "on";
      if (roles.eap) f.eap = "on";
      expect((await this.post("/setup/", f)).status).toBe(303);
    }
  }
}

const idFrom = (res: Response) => Number(res.headers.get("location")?.match(/\/requests\/(\d+)\//)?.[1]);
const futureDue = "2099-03-13T23:59"; // a Friday, so working days skip a weekend
const pastDue = "2000-01-03T09:00";

describe("crit 7: extension requests", () => {
  const staff = new Browser();
  const student = new Browser();
  const central = new Browser();
  const code = `TEST${String(Date.now()).slice(-4)}`;
  let courseId: number;
  let openId: number;
  let pastId: number;

  beforeAll(async () => {
    await staff.login("u1000001", { staff: true });
    const created = await staff.post("/courses/", { code, name: "Spec course" });
    courseId = Number(created.headers.get("location")?.match(/\/courses\/(\d+)\//)?.[1]);
    await staff.post(`/courses/${courseId}/`, { action: "add-assignment", name: "Open task", dueAt: futureDue });
    await staff.post(`/courses/${courseId}/`, { action: "add-assignment", name: "Closed task", dueAt: pastDue });
    const page = await staff.html(`/courses/${courseId}/`);
    // each assignment's edit form sits in its own <details>
    const idOf = (name: string) =>
      Number(page.split("<details").find((chunk) => chunk.includes(`value="${name}"`))?.match(/name="assignmentId" value="(\d+)"/)?.[1]);
    openId = idOf("Open task");
    pastId = idOf("Closed task");
    await student.login("u2000002", { student: true, eap: true });
    await central.login("CENTRAL");
  });

  it("asks a new UID for student or staff once, then remembers it", async () => {
    const b = new Browser();
    await b.post("/", { action: "login", uid: "u3000003" });
    expect((await b.get("/")).headers.get("location")).toBe("/setup/");
    await b.post("/setup/", { student: "on", staff: "on" });
    const again = new Browser();
    await again.post("/", { action: "login", uid: "u3000003" });
    const home = await again.html("/");
    expect(home).toContain("Student side");
    expect(home).toContain("Staff side");
  });

  it("rejects something that isn't a UID", async () => {
    expect((await new Browser().post("/", { action: "login", uid: "bob" })).status).toBe(400);
  });

  it("shows the student the two homepage actions", async () => {
    const home = await student.html("/");
    expect(home).toContain("Change my data");
    expect(home).toContain("Submit an extension request");
  });

  it("grants an automatic extension on submission and states the new date", async () => {
    const res = await student.post("/request/auto/", { courseId: String(courseId), assignmentId: String(openId), days: "2" });
    expect(res.status).toBe(303);
    const page = await student.html(`/requests/${idFrom(res)}/`);
    expect(page).toContain("Granted.");
    expect(page).toContain("Tue, 17 Mar 2099"); // Fri + 2 working days
  });

  it("refuses an automatic or short extension once the due date has passed", async () => {
    const auto = await student.post("/request/auto/", { courseId: String(courseId), assignmentId: String(pastId), days: "1" });
    expect(auto.status).toBe(400);
    const short = await student.post("/request/short/", { courseId: String(courseId), assignmentId: String(pastId), days: "3", message: "x" });
    expect(short.status).toBe(400);
  });

  it("sends a short extension with an attachment to course staff, and it persists", async () => {
    const f = new FormData();
    f.set("courseId", String(courseId));
    f.set("assignmentId", String(openId));
    f.set("days", "5");
    f.set("eap", "1");
    f.set("message", "short spec probe");
    f.append("files", new File(["certificate"], "cert.txt", { type: "text/plain" }));
    const res = await student.post("/request/short/", f);
    expect(res.status).toBe(303);
    const id = idFrom(res);

    const mine = await student.html(`/requests/${id}/`);
    expect(mine).toContain("short spec probe");
    expect(mine).toContain("your EAP has been shared with the course convenor");
    expect(mine).toContain("cert.txt");

    expect(await staff.html("/")).toContain(`/requests/${id}/`);
    const staffView = await staff.html(`/requests/${id}/`);
    expect(staffView).toContain("short spec probe");
    expect(staffView).toContain("cert.txt");
    expect(staffView).toContain("EAP indicated");
  });

  it("won't change a status without a written response, from staff or CENTRAL", async () => {
    const res = await student.post("/request/short/", {
      courseId: String(courseId), assignmentId: String(openId), days: "3", message: "needs a reply",
    });
    const id = idFrom(res);
    for (const decision of ["approved", "considering", "declined"]) {
      expect((await staff.post(`/requests/${id}/`, { decision, response: "  " })).status).toBe(400);
    }
    expect((await staff.post(`/requests/${id}/`, { decision: "considering", response: "Checking" })).status).toBe(303);
    expect((await staff.post(`/requests/${id}/`, { decision: "approved", response: "Ok" })).status).toBe(303);
    const page = await student.html(`/requests/${id}/`);
    expect(page).toContain("Accepted.");
    expect(page).toContain("Checking");
    expect(page).toContain("Under consideration");
  });

  it("puts an Appeal button next to a denial; a course appeal waits for end-of-semester grades", async () => {
    const res = await student.post("/request/short/", {
      courseId: String(courseId), assignmentId: String(openId), days: "4", message: "deny me",
    });
    const id = idFrom(res);
    await staff.post(`/requests/${id}/`, { decision: "declined", response: "No evidence" });
    expect(await student.html("/")).toContain(`/appeal/${id}/`);
    expect(await student.html(`/appeal/${id}/`)).toContain(
      "This is only appealable alongside all course grades at the end of the semester.",
    );
    expect((await staff.get(`/appeal/${id}/`)).status).toBe(404);
  });

  it("sends centrally run exams to an ECA, while course-run exams use normal extensions", async () => {
    await staff.post(`/courses/${courseId}/`, { action: "add-assignment", name: "Final exam", dueAt: futureDue, kind: "central_exam" });
    await staff.post(`/courses/${courseId}/`, { action: "add-assignment", name: "Class test", dueAt: futureDue, kind: "local_exam" });
    const page = await staff.html(`/courses/${courseId}/`);
    const idOf = (name: string) =>
      Number(page.split("<details").find((c) => c.includes(`value="${name}"`))?.match(/name="assignmentId" value="(\d+)"/)?.[1]);
    const short = (assignmentId: number) =>
      student.post("/request/short/", { courseId: String(courseId), assignmentId: String(assignmentId), days: "2", message: "exam" });
    expect((await short(idOf("Final exam"))).status).toBe(400);
    expect((await short(idOf("Class test"))).status).toBe(303);
    expect(await student.html("/")).toContain("Centrally run exams");
    expect(await student.html("/")).toContain("discussion between you and your course convenor");
  });

  it("routes an ECA to CENTRAL and never to course staff", async () => {
    const f = new FormData();
    f.set("courseId", String(courseId));
    f.set("assignmentId", String(pastId));
    f.set("days", "12");
    f.set("circumstance", "Hospitalisation");
    f.set("message", "eca spec probe");
    f.set("declare", "on");
    f.append("files", new File(["discharge summary"], "hospital.pdf", { type: "application/pdf" }));
    const res = await student.post("/request/eca/", f);
    expect(res.status).toBe(303);
    const id = idFrom(res);

    expect(await central.html("/central/")).toContain(`/requests/${id}/`);
    expect((await staff.get(`/requests/${id}/`)).status).toBe(404);
    expect(await staff.html("/")).not.toContain(`/requests/${id}/`);
    const file = (await central.html(`/requests/${id}/`)).match(/\/attachments\/(\d+)/)?.[1];
    expect((await central.get(`/attachments/${file}`)).status).toBe(200);
    expect((await staff.get(`/attachments/${file}`)).status).toBe(404);

    expect((await central.post(`/requests/${id}/`, { decision: "declined", response: "" })).status).toBe(400);
    expect((await central.post(`/requests/${id}/`, { decision: "declined", response: "Insufficient evidence" })).status).toBe(303);
    expect(await student.html(`/appeal/${id}/`)).toContain("This will be a link to the ANU appeal form.");
  });

  it("gives a UID added as course staff that course on their staff side", async () => {
    await staff.post(`/courses/${courseId}/`, { action: "add-staff", uid: "u4000004" });
    const colleague = new Browser();
    await colleague.login("u4000004", { staff: true });
    expect(await colleague.html("/courses/")).toContain(code);
  });

  it("quotes the policy: colds are not grounds for an ECA, with a link to it", async () => {
    const page = await student.html("/request/eca/");
    expect(page).toContain("Mild illness – a cold");
    expect(page).toContain("https://policies.anu.edu.au/ppl/document/ANUP_004604");
  });

  // The shipped invariants only reach signed-out routes; hold the signed-in
  // pages to the same accessibility floor.
  const pages: [string, () => Browser][] = [
    ["/", () => student],
    ["/profile/", () => student],
    ["/request/", () => student],
    ["/request/auto/", () => student],
    ["/request/short/", () => student],
    ["/request/eca/", () => student],
    ["/", () => staff],
    ["/courses/", () => staff],
    ["/central/", () => central],
  ];
  it("the request page (staff view) and the appeal page pass the same floor", async () => {
    const home = await student.html("/");
    const appeal = home.match(/\/appeal\/(\d+)\//)?.[0];
    expect(appeal).toBeTruthy();
    await floor(student, appeal!);
    const any = (await staff.html("/")).match(/\/requests\/(\d+)\//)?.[0];
    await floor(staff, any!);
  });

  for (const [path, who] of pages) {
    it(`signed-in ${path} has one h1, a nav, and no axe violations`, () => floor(who(), path));
  }
});

async function floor(b: Browser, path: string) {
  const dom = new JSDOM(await b.html(path), { url: new URL(path, baseUrl).href, runScripts: "outside-only" });
  const doc = dom.window.document;
  expect(doc.querySelectorAll("h1").length).toBe(1);
  expect(doc.querySelector("nav")).toBeTruthy();
  const w = dom.window as unknown as { eval: (s: string) => void; axe: typeof axe };
  w.eval(axe.source);
  const results = await w.axe.run(doc, {
    rules: { "color-contrast": { enabled: false }, "link-in-text-block": { enabled: false } },
  });
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`)).toEqual([]);
}
