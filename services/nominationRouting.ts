import { LOCATION_SUBJECTS } from '../constants';
import { Subject, Teacher } from '../types';

export function isLocationSubject(subject: Subject): boolean {
  return LOCATION_SUBJECTS.includes(subject);
}

function staffTeachers(teachers: Teacher[]): Teacher[] {
  return teachers.filter((t) => t.role === 'TEACHER' || t.role === 'ADMIN');
}

/** Lowercase emails of teachers who should review this nomination. */
export function resolveNominationReviewers(
  ctx: { subject: Subject; studentGrade: string },
  teachers: Teacher[]
): string[] {
  const staff = staffTeachers(teachers);

  const matched = isLocationSubject(ctx.subject)
    ? staff.filter((t) => t.homeroomGrades?.includes(ctx.studentGrade))
    : staff.filter((t) => t.assignedSubjects?.includes(ctx.subject));

  const emails = matched.map((t) => t.email.toLowerCase());
  if (emails.length === 0) {
    return [...new Set(staff.map((t) => t.email.toLowerCase()))];
  }
  return [...new Set(emails)];
}

export function nominationVisibleToTeacher(
  nomination: { reviewerEmails?: string[] },
  teacherEmail: string,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  const email = teacherEmail.toLowerCase();
  if (!nomination.reviewerEmails?.length) return true;
  return nomination.reviewerEmails.includes(email);
}
