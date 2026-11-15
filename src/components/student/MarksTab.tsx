'use client';

import React, { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Badge, Card, CardHeader, EmptyState, PageHeader, formatDate } from '@/components/ui';
import { ClipboardList } from 'lucide-react';

interface Item {
  id: string;
  title: string;
  component: string;
  date: string;
  maxMarks: number;
  marks: number | null;
  absent: boolean;
  remark?: string;
  classAverage: number | null;
  classHighest: number | null;
}
interface Subject {
  courseId: string;
  code: string;
  title: string;
  items: Item[];
  scored: number;
  max: number;
}

/** Student: published marks per subject, with class average and highest for comparison. */
export function StudentMarksTab() {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);

  useEffect(() => {
    fetch('/api/student/marks')
      .then((r) => (r.ok ? r.json() : { subjects: [] }))
      .then((d) => setSubjects(d.subjects ?? []));
  }, []);

  return (
    <>
      <PageHeader title="Marks" description="Exam, test and viva marks after your teacher and HOD publish them." />
      {subjects === null ? (
        <Card><p className="text-sm text-slate-500">Loading…</p></Card>
      ) : subjects.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="No marks published yet" description="You'll get a notification when marks are published." />
        </Card>
      ) : (
        <div className="space-y-5">
          {subjects.map((s) => (
            <Card key={s.courseId} padded={false}>
              <div className="p-5 pb-3">
                <CardHeader
                  title={
                    <span className="flex items-center gap-2">
                      <Badge tone="accent">{s.code}</Badge> {s.title}
                    </span>
                  }
                  description={`${s.items.length} published ${s.items.length === 1 ? 'assessment' : 'assessments'}`}
                  actions={
                    <span className="text-sm text-slate-600">
                      Total <strong className="text-slate-800">{s.scored} / {s.max}</strong>
                    </span>
                  }
                />
              </div>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ pl: 2.5 }}>Assessment</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Your marks</TableCell>
                      <TableCell>Class average</TableCell>
                      <TableCell sx={{ pr: 2.5 }}>Highest</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {s.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell sx={{ pl: 2.5 }}>
                          <div className="font-semibold text-slate-800">{i.title}</div>
                          <div className="text-xs text-slate-500">{i.component}{i.remark ? ` · ${i.remark}` : ''}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-slate-600">{formatDate(i.date)}</TableCell>
                        <TableCell>
                          {i.absent ? <Badge tone="bad">Absent</Badge> : <strong className="text-slate-800">{i.marks} / {i.maxMarks}</strong>}
                        </TableCell>
                        <TableCell className="text-slate-600">{i.classAverage ?? '—'}</TableCell>
                        <TableCell sx={{ pr: 2.5 }} className="text-slate-600">{i.classHighest ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
