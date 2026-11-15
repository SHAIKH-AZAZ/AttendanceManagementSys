'use client';

import { useEffect, useState } from 'react';
import type { Campus, Course, Department, Section, Trimester } from '@/types';

export type MetaSection = Omit<Section, 'enrolledStudents'> & { studentCount: number; facultyName: string };

export interface Meta {
  campuses: Campus[];
  departments: Department[];
  trimesters: Trimester[];
  courses: Course[];
  sections: MetaSection[];
  faculty: { id: string; fullName: string; departmentId?: string; role: 'FACULTY' | 'HOD' }[];
}

/** Academic structure (courses, sections, departments…) from /api/meta. */
export function useMeta() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  /** Re-fetch after creating or reassigning classes. */
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    fetch('/api/meta')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load academic structure.'))))
      .then((m) => alive && setMeta(m))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [version]);

  const course = (id: string) => meta?.courses.find((c) => c.id === id);
  const section = (id: string) => meta?.sections.find((s) => s.id === id);
  /** "CS-301 · Section A (Computer-A)" */
  const classLabel = (sectionId: string) => {
    const s = section(sectionId);
    const c = s && course(s.courseId);
    return s ? `${c?.code ?? s.courseId} · ${s.name}` : sectionId;
  };

  return { meta, error, course, section, classLabel, reload };
}
