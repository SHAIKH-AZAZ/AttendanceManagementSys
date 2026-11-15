#!/usr/bin/env bash
# Feature checks (files, notifications, allocation, import logins).
# Run against a dev server on a freshly reset database:
#   bun run db:reset --yes && bash scripts/feature-check.sh [base_url]
set -u
BASE="${1:-http://localhost:3000}"
JAR=$(mktemp -d)
trap 'rm -rf "$JAR"' EXIT
fail=0
expect() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (expected $2, got $3)"; fail=1; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { code -c "$JAR/$1" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"$3\"}" "$BASE/api/auth/login"; }
json() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
TODAY=$(TZ=Asia/Kolkata date +%F)

login stu devendra.joshi@univ.edu student123 >/dev/null
login stu2 aarav.patel@univ.edu student123 >/dev/null
login fac rajesh.sharma@univ.edu faculty123 >/dev/null
login hod sunita.rao@univ.edu hod123 >/dev/null
login adm arun.kulkarni@univ.edu admin123 >/dev/null

# --- Files ---
printf '%%PDF-1.4\n%% test proof\n' > "$JAR/proof.pdf"
printf 'not really a pdf' > "$JAR/fake.pdf"
expect "faculty can't upload leave proof"  403 "$(code -b "$JAR/fac" -F purpose=LEAVE_PROOF -F "file=@$JAR/proof.pdf" "$BASE/api/files")"
expect "fake PDF rejected"                 400 "$(code -b "$JAR/stu" -F purpose=LEAVE_PROOF -F "file=@$JAR/fake.pdf" "$BASE/api/files")"
FID=$(curl -s -b "$JAR/stu" -F purpose=LEAVE_PROOF -F "file=@$JAR/proof.pdf" "$BASE/api/files" | json "d['file']['id']")
expect "student uploads proof"             yes "$( [ -n "$FID" ] && echo yes || echo no)"
expect "owner can download"                200 "$(code -b "$JAR/stu" "$BASE/api/files/$FID")"
expect "other student can't download"      404 "$(code -b "$JAR/stu2" "$BASE/api/files/$FID")"
expect "HOD can't download before leave"   404 "$(code -b "$JAR/hod" "$BASE/api/files/$FID")"
expect "someone else's file can't be attached" 400 "$(code -b "$JAR/stu2" -H 'Content-Type: application/json' -d "{\"leaveType\":\"MEDICAL\",\"startDate\":\"$TODAY\",\"endDate\":\"$TODAY\",\"reason\":\"x\",\"fileId\":\"$FID\"}" "$BASE/api/leaves")"
expect "leave with own proof"              201 "$(code -b "$JAR/stu" -H 'Content-Type: application/json' -d "{\"leaveType\":\"MEDICAL\",\"startDate\":\"$TODAY\",\"endDate\":\"$TODAY\",\"reason\":\"Fever\",\"fileId\":\"$FID\"}" "$BASE/api/leaves")"
expect "HOD can download attached proof"   200 "$(code -b "$JAR/hod" "$BASE/api/files/$FID")"
expect "files require sign-in"             401 "$(code "$BASE/api/files/$FID")"

# --- Notifications ---
N=$(curl -s -b "$JAR/hod" "$BASE/api/notifications" | json "d['unread']")
expect "HOD notified of new leave"         yes "$( [ "${N:-0}" -ge 1 ] && echo yes || echo no)"
curl -s -o /dev/null -b "$JAR/hod" -H 'Content-Type: application/json' -d '{}' "$BASE/api/notifications"
expect "mark all read"                     0 "$(curl -s -b "$JAR/hod" "$BASE/api/notifications" | json "d['unread']")"

# --- Allocation ---
expect "faculty can't reallocate"          403 "$(code -b "$JAR/fac" -X PUT -H 'Content-Type: application/json' -d '{"facultyId":"user-faculty-2"}' "$BASE/api/sections/sec-ds-b/faculty")"
expect "can't allocate to a student"       400 "$(code -b "$JAR/hod" -X PUT -H 'Content-Type: application/json' -d '{"facultyId":"stu-4"}' "$BASE/api/sections/sec-ds-b/faculty")"
expect "HOD reallocates class"             200 "$(code -b "$JAR/hod" -X PUT -H 'Content-Type: application/json' -d '{"facultyId":"user-faculty-2"}' "$BASE/api/sections/sec-ds-b/faculty")"
expect "old teacher loses the class"       403 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d "{\"sectionId\":\"sec-ds-b\",\"lectureDate\":\"$TODAY\"}" "$BASE/api/sessions")"
expect "HOD gives it back"                 200 "$(code -b "$JAR/hod" -X PUT -H 'Content-Type: application/json' -d '{"facultyId":"user-faculty-1"}' "$BASE/api/sections/sec-ds-b/faculty")"

# --- Structure ---
SUBJ="T$(date +%s)"
expect "faculty can't add subjects"        403 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d "{\"code\":\"$SUBJ\",\"title\":\"Test\",\"credits\":4,\"departmentId\":\"dept-cs\"}" "$BASE/api/admin/courses")"
CID=$(curl -s -b "$JAR/adm" -H 'Content-Type: application/json' -d "{\"code\":\"$SUBJ\",\"title\":\"Test subject\",\"credits\":4,\"departmentId\":\"dept-cs\"}" "$BASE/api/admin/courses" | json "d['course']['id']")
expect "admin adds subject"                yes "$( [ -n "$CID" ] && echo yes || echo no)"
expect "duplicate subject rejected"        400 "$(code -b "$JAR/adm" -H 'Content-Type: application/json' -d "{\"code\":\"$SUBJ\",\"title\":\"Again\",\"credits\":4,\"departmentId\":\"dept-cs\"}" "$BASE/api/admin/courses")"
expect "admin adds lab class"              201 "$(code -b "$JAR/adm" -H 'Content-Type: application/json' -d "{\"courseId\":\"$CID\",\"kind\":\"LAB\",\"divisions\":[\"5CEA\"],\"batch\":\"A2\",\"name\":\"5CEA lab A2\",\"facultyId\":\"user-faculty-1\"}" "$BASE/api/admin/sections")"

# --- Import creates logins ---
ROLL="IMP$(date +%s)"
R=$(curl -s -b "$JAR/adm" -H 'Content-Type: application/json' -d "{\"sectionId\":\"sec-ds-b\",\"isPreviewOnly\":false,\"students\":[{\"enrollmentNumber\":\"$ROLL\",\"fullName\":\"Test Import\",\"email\":\"$(echo $ROLL | tr A-Z a-z)@univ.edu\"}]}" "$BASE/api/admin/import")
PW=$(echo "$R" | json "d['accounts'][0]['tempPassword'] if d.get('accounts') else ''")
expect "import returns a temporary password" yes "$( [ -n "$PW" ] && echo yes || echo no)"
expect "imported student can sign in"      200 "$(login imp "$(echo $ROLL | tr A-Z a-z)@univ.edu" "$PW")"

# --- Marks ---
login fac2 anita.desai@univ.edu faculty123 >/dev/null
J=(-H 'Content-Type: application/json')
expect "students can't list assessments"     403 "$(code -b "$JAR/stu" "$BASE/api/assessments")"
expect "other teacher can't create for class" 403 "$(code -b "$JAR/fac2" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"Mid-sem 1","component":"Mid-semester exam","date":"'$TODAY'","maxMarks":30}' "$BASE/api/assessments")"
AID=$(curl -s -b "$JAR/fac" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"Mid-sem 1","component":"Mid-semester exam","date":"'$TODAY'","maxMarks":30}' "$BASE/api/assessments" | json "d['assessment']['id']")
expect "teacher creates assessment"           yes "$( [ -n "$AID" ] && echo yes || echo no)"
expect "marks above maximum rejected"         400 "$(code -b "$JAR/fac" -X PUT "${J[@]}" -d '{"entries":[{"studentId":"stu-1","marks":31}]}' "$BASE/api/assessments/$AID")"
expect "submit with missing marks rejected"   400 "$(code -b "$JAR/fac" -X POST "$BASE/api/assessments/$AID/submit")"
ENTRIES=$(curl -s -b "$JAR/fac" "$BASE/api/assessments/$AID" | python3 -c "import sys,json;a=json.load(sys.stdin)['assessment'];print(json.dumps({'entries':[{'studentId':e['studentId'],'marks':None if i==0 else 10+i,'absent':i==0} for i,e in enumerate(a['entries'])]}))")
expect "teacher saves all marks"              200 "$(code -b "$JAR/fac" -X PUT "${J[@]}" -d "$ENTRIES" "$BASE/api/assessments/$AID")"
expect "student can't see unpublished marks"  False "$(curl -s -b "$JAR/stu" "$BASE/api/student/marks" | json "any(i['id']=='$AID' for s in d['subjects'] for i in s['items'])")"
expect "teacher submits"                      200 "$(code -b "$JAR/fac" -X POST "$BASE/api/assessments/$AID/submit")"
expect "no edits after submit"                409 "$(code -b "$JAR/fac" -X PUT "${J[@]}" -d '{"entries":[{"studentId":"stu-1","marks":5}]}' "$BASE/api/assessments/$AID")"
expect "faculty can't approve"                403 "$(code -b "$JAR/fac" "${J[@]}" -d '{"decision":"APPROVE"}' "$BASE/api/assessments/$AID/review")"
expect "return needs a comment"               400 "$(code -b "$JAR/hod" "${J[@]}" -d '{"decision":"RETURN"}' "$BASE/api/assessments/$AID/review")"
expect "HOD returns with comment"             200 "$(code -b "$JAR/hod" "${J[@]}" -d '{"decision":"RETURN","comment":"Check roll 4"}' "$BASE/api/assessments/$AID/review")"
expect "teacher can edit again"               200 "$(code -b "$JAR/fac" -X PUT "${J[@]}" -d '{"entries":[{"studentId":"stu-4","marks":21.5}]}' "$BASE/api/assessments/$AID")"
code -b "$JAR/fac" -X POST "$BASE/api/assessments/$AID/submit" >/dev/null
expect "HOD approves"                         200 "$(code -b "$JAR/hod" "${J[@]}" -d '{"decision":"APPROVE"}' "$BASE/api/assessments/$AID/review")"
MINE=$(curl -s -b "$JAR/stu" "$BASE/api/student/marks")
expect "student sees own published mark"      21.5 "$(echo "$MINE" | json "next(i['marks'] for s in d['subjects'] for i in s['items'] if i['id']=='$AID')")"
expect "no classmates' marks in response"     no "$(echo "$MINE" | grep -q 'Aarav' && echo yes || echo no)"
expect "can't delete published marks"         409 "$(code -b "$JAR/fac" -X DELETE "$BASE/api/assessments/$AID")"

# --- Assignments ---
DUE=$(python3 -c "import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=3)).isoformat())")
printf '%%PDF-1.4\n%% worksheet\n' > "$JAR/sheet.pdf"
ATT=$(curl -s -b "$JAR/fac" -F purpose=ASSIGNMENT -F "file=@$JAR/sheet.pdf" "$BASE/api/files" | json "d['file']['id']")
expect "students can't publish"               403 "$(code -b "$JAR/stu" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"x","dueAt":"'$DUE'"}' "$BASE/api/assignments")"
expect "past due date rejected"               400 "$(code -b "$JAR/fac" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"x","dueAt":"2020-01-01T00:00:00Z"}' "$BASE/api/assignments")"
ASG=$(curl -s -b "$JAR/fac" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"Linked list worksheet","instructions":"Solve Q1-Q5","dueAt":"'$DUE'","maxMarks":10,"attachments":["'$ATT'"]}' "$BASE/api/assignments" | json "d['assignment']['id']")
expect "teacher publishes assignment"         yes "$( [ -n "$ASG" ] && echo yes || echo no)"
expect "enrolled student sees it"             True "$(curl -s -b "$JAR/stu" "$BASE/api/assignments" | json "any(a['id']=='$ASG' for a in d['assignments'])")"
expect "student of other class can't open it" 404 "$(code -b "$JAR/imp" "$BASE/api/assignments/$ASG")"
expect "student of other class can't get file" 404 "$(code -b "$JAR/imp" "$BASE/api/files/$ATT")"
expect "enrolled student gets attachment"     200 "$(code -b "$JAR/stu" "$BASE/api/files/$ATT")"
expect "empty submission rejected"            400 "$(code -b "$JAR/stu" "${J[@]}" -d '{}' "$BASE/api/assignments/$ASG/submission")"
printf '%%PDF-1.4\n%% my answer\n' > "$JAR/ans.pdf"
ANS=$(curl -s -b "$JAR/stu" -F purpose=SUBMISSION -F "file=@$JAR/ans.pdf" "$BASE/api/files" | json "d['file']['id']")
expect "student submits"                      201 "$(code -b "$JAR/stu" "${J[@]}" -d '{"text":"See attached","files":["'$ANS'"]}' "$BASE/api/assignments/$ASG/submission")"
expect "student resubmits"                    201 "$(code -b "$JAR/stu" "${J[@]}" -d '{"text":"Updated answer","files":["'$ANS'"]}' "$BASE/api/assignments/$ASG/submission")"
expect "classmate can't read the answer file" 404 "$(code -b "$JAR/stu2" "$BASE/api/files/$ANS")"
expect "teacher reads the answer file"        200 "$(code -b "$JAR/fac" "$BASE/api/files/$ANS")"
expect "grade above maximum rejected"         400 "$(code -b "$JAR/fac" "${J[@]}" -d '{"studentId":"stu-4","marks":11}' "$BASE/api/assignments/$ASG/grade")"
expect "teacher grades"                       200 "$(code -b "$JAR/fac" "${J[@]}" -d '{"studentId":"stu-4","marks":8.5,"feedback":"Good"}' "$BASE/api/assignments/$ASG/grade")"
expect "student sees grade"                   8.5 "$(curl -s -b "$JAR/stu" "$BASE/api/assignments/$ASG" | json "d['submission']['marks']")"
expect "no resubmission after grading"        409 "$(code -b "$JAR/stu" "${J[@]}" -d '{"text":"again"}' "$BASE/api/assignments/$ASG/submission")"
expect "can't delete once submitted"          409 "$(code -b "$JAR/fac" -X DELETE "$BASE/api/assignments/$ASG")"
SOON=$(python3 -c "import datetime;print((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=3)).isoformat())")
STRICT=$(curl -s -b "$JAR/fac" "${J[@]}" -d '{"sectionId":"sec-ds-a","title":"Strict deadline","dueAt":"'$SOON'","allowLate":false}' "$BASE/api/assignments" | json "d['assignment']['id']")
sleep 4
expect "late submission refused when not allowed" 409 "$(code -b "$JAR/stu" "${J[@]}" -d '{"text":"late"}' "$BASE/api/assignments/$STRICT/submission")"

# --- Exams and calendar ---
EXD=$(python3 -c "import datetime;print((datetime.date.today()+datetime.timedelta(days=20)).isoformat())")
expect "faculty can't schedule exams"        403 "$(code -b "$JAR/fac" "${J[@]}" -d '{"courseId":"course-ds","divisions":["5CEA"],"examType":"MID_SEM","date":"'$EXD'","start":"10:00","end":"11:30"}' "$BASE/api/admin/exams")"
expect "end before start rejected"           400 "$(code -b "$JAR/adm" "${J[@]}" -d '{"courseId":"course-ds","divisions":["5CEA"],"examType":"MID_SEM","date":"'$EXD'","start":"12:00","end":"11:00"}' "$BASE/api/admin/exams")"
EXID=$(curl -s -b "$JAR/adm" "${J[@]}" -d '{"courseId":"course-ds","divisions":["5CEA"],"examType":"MID_SEM","date":"'$EXD'","start":"10:00","end":"11:30","room":"8109"}' "$BASE/api/admin/exams" | json "d['exam']['id']")
expect "admin schedules exam"                yes "$( [ -n "$EXID" ] && echo yes || echo no)"
expect "division double-booking refused"     409 "$(code -b "$JAR/adm" "${J[@]}" -d '{"courseId":"course-dbms","divisions":["5CEA"],"examType":"MID_SEM","date":"'$EXD'","start":"11:00","end":"12:00"}' "$BASE/api/admin/exams")"
expect "room double-booking refused"         409 "$(code -b "$JAR/adm" "${J[@]}" -d '{"courseId":"course-ds","divisions":["5CEB"],"examType":"MID_SEM","date":"'$EXD'","start":"10:30","end":"11:00","room":"8109"}' "$BASE/api/admin/exams")"
expect "5CEA student sees the exam"          True "$(curl -s -b "$JAR/stu" "$BASE/api/schedule" | json "any(e['id']=='$EXID' for e in d['exams'])")"
expect "5CEB-only student doesn't"           False "$(curl -s -b "$JAR/imp" "$BASE/api/schedule" | json "any(e['id']=='$EXID' for e in d['exams'])")"
HOL=$(curl -s -b "$JAR/adm" "${J[@]}" -d '{"title":"Test holiday","kind":"HOLIDAY","date":"'$TODAY'"}' "$BASE/api/admin/events" | json "d['event']['id']")
expect "no lectures on a holiday"            400 "$(code -b "$JAR/fac" "${J[@]}" -d '{"sectionId":"sec-ds-b","lectureDate":"'$TODAY'"}' "$BASE/api/sessions")"
expect "admin removes holiday"               200 "$(code -b "$JAR/adm" -X DELETE "$BASE/api/admin/events/$HOL")"
expect "admin removes exam"                  200 "$(code -b "$JAR/adm" -X DELETE "$BASE/api/admin/exams/$EXID")"

exit $fail
