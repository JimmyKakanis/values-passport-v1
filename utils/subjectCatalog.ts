import { SCHOOL_GRADES, SUBJECTS } from '../constants';
import { isLocationSubject } from '../services/nominationRouting';
import { Subject, Teacher } from '../types';

/** Passport + stamp forms: settings subjects merged with the built-in catalog. */
export function getEffectiveSubjectCatalog(settingsSubjects?: string[]): Subject[] {
  const fromSettings = (settingsSubjects ?? []).filter(Boolean);
  return [...new Set([...SUBJECTS, ...fromSettings])] as Subject[];
}

export function getAcademicSubjectsForCatalog(catalog: Subject[]): Subject[] {
  return catalog.filter((s) => !isLocationSubject(s));
}

export function getLocationSubjectsForCatalog(catalog: Subject[]): Subject[] {
  return catalog.filter((s) => isLocationSubject(s));
}

export interface NominationRoutingGaps {
  academicWithoutTeachers: Subject[];
  homeroomGradesWithoutTeachers: string[];
}

export function getNominationRoutingGaps(
  teachers: Teacher[],
  catalog: Subject[] = SUBJECTS
): NominationRoutingGaps {
  const staff = teachers.filter((t) => t.role === 'TEACHER' || t.role === 'ADMIN');
  const assignedSubjects = new Set(staff.flatMap((t) => t.assignedSubjects ?? []));
  const homeroomGrades = new Set(staff.flatMap((t) => t.homeroomGrades ?? []));

  const academic = getAcademicSubjectsForCatalog(catalog);

  return {
    academicWithoutTeachers: academic.filter((s) => !assignedSubjects.has(s)),
    homeroomGradesWithoutTeachers: SCHOOL_GRADES.filter((g) => !homeroomGrades.has(g)),
  };
}
