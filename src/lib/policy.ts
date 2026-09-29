// Every policy quote in the app comes from here, verbatim, so a reader can
// check it against the source. Source: Procedure: Student assessment
// (coursework), ANUP_004604, effective 25 Nov 2025.

export const LINKS = {
  procedure: "https://policies.anu.edu.au/ppl/document/ANUP_004604",
  policy: "https://policies.anu.edu.au/ppl/document/ANUP_004603",
  disability: "https://policies.anu.edu.au/ppl/document/ANUP_002604",
  accessInclusion: "https://www.anu.edu.au/students/wellbeing/access-inclusion",
};

export const AUTO_MAX_DAYS = 2; // "< 3 working days"
export const SHORT_MAX_DAYS = 9; // "< 10 working days", cl. 12
export const EAP_DEFAULT_DAYS = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const EAP_NOTE =
  "While this request still needs to be approved by the course, your EAP has been shared with the course convenor alongside the recommendation for approving the extension.";

export const QUOTES = {
  cl12:
    "Applications for an extension or adjustment are submitted in writing to the Course Convenor when both: the extension period requested is less than 10 working days from the published due date in the class summary; and the new due date falls before the return of the marked assessment, as specified in the class summary.",
  cl13:
    "An Extenuating Circumstances Application (ECA) is submitted when either: the extension or adjustment is for 10 or more working days from the published due date in the class summary; and/or the new due date falls on or after the return of the marked assessment, as specified in the class summary.",
  cl14:
    "An application for an extension of the due date for an assessment task is submitted on or before the assessment due date. The only exception is where the student could not reasonably be expected to have applied by the appropriate date due to a significant and unforeseen event.",
  cl15:
    "Appropriate supporting documentation is provided with a request for an extension to allow the claims to be verified.",
  cl19:
    "Where an extension is granted on medical grounds and is on the basis of a non-chronic condition, an extension of the due date for an assessment task is normally limited to the number of days (calculated to the nearest business day) the student is suffering from the medical condition as indicated on the medical certificate.",
  cl20:
    "Students who have a chronic condition and require an extension because of that condition are encouraged to initially follow the Adjustments for students who disclose a disability procedure to request an Education Access Plan that will detail appropriate adjustments to the due date for assessment tasks.",
  cl21:
    "The Course Convenor or nominee notifies the student of the outcome of their application for an extension within three working days of the decision. This advice is in writing via the ANU student email address.",
  cl27:
    "To make an Extenuating Circumstances Application (ECA), a student submits a complete application form to the Division of Student Administration and Academic Services (DSAAS) no later than five working days after the original due date for the relevant assessment. The only exception is where the student could not reasonably be expected to have applied by the appropriate due date due to significant, unforeseeable circumstances beyond their control.",
  cl28:
    "Unless otherwise approved by a nominee of the Registrar, an application is not considered complete if: any key information is missing and has not been provided within five working days from the date of the application's submission, so long as that information has been requested from the applicant; independent supporting documents do not meet the requirements to substantiate the application.",
  cl31Intro:
    "Instances that are not approved for an Extenuating Circumstances Application include, in addition to those stated in clause 36 of the Student Assessment (Coursework) policy, but are not limited to:",
  cl31: [
    "Mild illness – a cold, mild virus, minor illness in days preceding examination date, sore throat, cramping, mild gastro-intestinal infections, feeling out of sorts etc. on the day of the examination.",
    "An interruption to study during the semester.",
    "Routine activities – demands of employment, family or friend problems such as relationship tension, adjustment to university life, demands of academic life, need for financial support, demands of sporting, social and extra-curricular activities, travel arrangements which conflict with the examination timetable.",
    "Examination anxiety or other stress normally associated with academic work.",
    "Other instances of minor illness or minor circumstances.",
  ],
};
