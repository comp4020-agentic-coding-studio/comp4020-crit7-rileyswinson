// What each stored value is called on screen.

export const STATUS_LABEL = {
  pending: "Submitted",
  considering: "Under consideration",
  approved: "Accepted",
  declined: "Denied",
} as const;

export const ASSIGNMENT_KIND_LABEL = {
  coursework: "Coursework",
  local_exam: "Exam run by the course, school or college",
  central_exam: "Centrally run exam (exam block)",
} as const;
