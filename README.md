# Extension requests

A prototype of the assessment-extension system I wish ANU had. You sign in with
your UID, say once whether you're a student, course staff, or both, and then
there are two things to do: change your details, or ask for more time. There
are three routes to more time, and each one says up front what it needs, who
decides it, and which clause of the ANU procedure it rests on:

- **Automatic Short Extension:** under 3 working days, before the due date.
  Pick the course and assignment and it's granted on the spot, with the new
  due date shown straight away.
- **Short Extension:** under 10 working days, before the due date. A note to
  course staff and supporting documents. Decided by course staff, so it
  warns you not to upload confidential medical documents.
- **Extenuating Circumstances Application:** 10 or more working days, or the
  due date has passed. Goes to a separate `CENTRAL` account only, may hold
  confidential medical evidence, and quotes the procedure's higher bar,
  including that colds and mild illness don't qualify.

**Exams** are split the way ANU splits them: centrally run exams in the exam
block can only go through an ECA, while exams a course, school or college runs
itself go through the normal extensions. Other alternative coursework
arrangements are left to the student and convenor to discuss.

Course staff (for short extensions) and `CENTRAL` (for ECAs) open each request
on its own page. There they see everything the applicant sent and whether the
applicant says they have an EAP, and then **Accept**, **Consider** or **Deny**
it. The status can't change without a written response to the applicant, even
a one-word one. A denial puts an **Appeal** button beside it on the student's
homepage. Course extensions are appealable only alongside final course grades,
while a denied ECA points to the ANU appeal form, which is due within 10
working days of the result.

Course staff create courses, enter assignments, due dates and assessment types
by hand, and add
colleagues by UID. Anyone added that way sees the course when they switch to
the staff side. Ticking "I have an EAP" adds a **Share EAP** button to the
short extension form: a default 5 working day request, with a note that the
EAP has gone to the convenor with a recommendation to approve.

This is a student prototype for COMP4020, not an official ANU system. There
are no passwords: the UID is the whole login, as the brief for it asked.

## What good looks like here

The real problem with extensions isn't the form. It's not knowing which form
to use, what counts as evidence, and who will read what you upload. So good
here means:

- **You never guess the route.** The three options sit side by side with their
  limits, requirements and decider. Past-due assignments can't be picked for a
  short extension, and the ECA form nudges you back when a short extension
  would do.
- **Policy is quoted, not paraphrased.** Every quote comes verbatim from the
  [Student assessment (coursework) procedure](https://policies.anu.edu.au/ppl/document/ANUP_004604)
  (ANUP_004604, effective 25 Nov 2025) and links back to it. Lengths are in
  working days because that's how clause 12 counts them.
- **Confidential documents go only where they should.** Course staff can't list,
  open or download an ECA or its attachments. Only the student and `CENTRAL`
  can. This is enforced on the server, not just hidden in the UI.
- **It works at any window size**, from a phone to a wide desktop, without
  sideways scrolling. Tables fold into cards on narrow screens.

What the tests in `spec/crit7.test.ts` enforce: roles persist across logins,
the automatic extension is granted and dated correctly, past-due short
requests are refused, short requests (with attachments and a shared EAP) reach
course staff and persist, ECAs reach `CENTRAL` and never course staff, no
status changes without a written response, denials show an Appeal button
leading to the right appeal message, centrally run exams are refused as short
extensions while course-run exams aren't, added
staff UIDs see their course, the cold/mild-illness exclusion is quoted, and
every signed-in page passes the axe accessibility floor.

What's left to judgement: whether the wording is clear enough for a stressed
student at 11 pm, and whether the three-way split really matches how people
think about their situation.

Not built: real authentication, email notifications, public holidays in the
working-day count, the "marked assessment return date" limit from clause 12,
and syncing EAPs from Access and Inclusion (the checkbox stands in for it).
