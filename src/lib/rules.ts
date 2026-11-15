/** College rules in one place. Change these values here, not in the routes. */

/** Faculty may enter a lecture at most this many days after it happened. */
export const ATTENDANCE_ENTRY_WINDOW_DAYS = 7;

/** Minimum attendance (percent, by periods) to be eligible for exams. */
export const MIN_ATTENDANCE_PERCENT = 75;

/** Today's date in India (YYYY-MM-DD), regardless of the server's own time zone. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** `date` minus `days`, as YYYY-MM-DD. */
export const daysBefore = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** Marks go to the HOD for approval before students can see them. Set false to let faculty publish directly. */
export const MARKS_NEED_HOD_APPROVAL = true;

/** Suggested assessment types (free text is also allowed). */
export const ASSESSMENT_COMPONENTS = ['Mid-semester exam', 'Unit test', 'Quiz', 'Assignment', 'Viva', 'Practical', 'Other'];
