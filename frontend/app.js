const toast = document.getElementById('toast');
const dialog = document.getElementById('featureDialog');
const dialogTitle = document.getElementById('dialogTitle');
const dialogKicker = document.getElementById('dialogKicker');
const dialogContent = document.getElementById('dialogContent');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function openFeature(title, kicker, content) {
  dialogTitle.textContent = title;
  dialogKicker.textContent = kicker;
  dialogContent.innerHTML = content;
  dialog.showModal();
}

function getRequests() {
  try { return JSON.parse(localStorage.getItem('campusRequests') || '[]'); }
  catch { return []; }
}

function saveRequest(type, details, status, extra = {}) {
  const requests = getRequests();
  const id = `CF-${String(Date.now()).slice(-6)}`;
  requests.unshift({ id, type, details, status, date: new Date().toISOString().slice(0, 10), ...extra });
  localStorage.setItem('campusRequests', JSON.stringify(requests));
  return id;
}

async function persistRequest(type, details, status, extra = {}) {
  try {
    if (location.protocol === 'file:') throw new Error('local preview');
    const response = await fetch('/api/requests', { method:'POST', headers:{'Content-Type':'application/json','X-Demo-Role':document.getElementById('roleSelect').value}, body:JSON.stringify({type,details,status,role:document.getElementById('roleSelect').value,extra}) });
    if (!response.ok) throw new Error('API unavailable');
    const result = await response.json();
    return result.request.id;
  } catch {
    return saveRequest(type, details, status, extra);
  }
}

async function loadRequests() {
  try {
    if (location.protocol === 'file:') throw new Error('local preview');
    const response = await fetch('/api/requests', {headers:{'X-Demo-Role':document.getElementById('roleSelect').value}});
    if (!response.ok) throw new Error('API unavailable');
    const result = await response.json();
    return result.requests.map(item => ({id:item.id,type:item.type,details:item.details,status:item.status,date:item.created_at.slice(0,10),...item.extra}));
  } catch { return getRequests(); }
}

async function showRequests() {
  const requests = await loadRequests();
  const content = requests.length ? requests.map(item => `<button class="request-row" data-request-id="${item.id}"><span class="request-mark">▤</span><span class="request-main"><strong>${item.type}</strong><small>${item.details}</small><span class="request-ref">${item.id} · ${item.date}</span></span><span class="request-status">${item.status}</span><span class="request-chevron">›</span></button>`).join('') : `<div class="empty-requests"><span>✓</span><strong>No requests yet</strong><p>Certificate, faculty meeting, attendance, and support requests will appear here.</p></div>`;
  openFeature('My requests', 'REQUEST TRACKER · DEMO', `<div class="request-intro">Track each request from submission through review and completion.</div><div class="request-summary"><strong>${requests.length}</strong><span>requests saved</span><i></i><strong>${requests.filter(item => /pending|awaiting/i.test(item.status)).length}</strong><span>need review</span></div><div class="request-list">${content}</div><div class="request-actions"><button data-feature="certificates">Request certificate</button><button data-feature="meetings">Meet faculty</button><button data-feature="attendance">Attendance review</button><button data-feature="service">Campus support</button></div><p class="dialog-hint">Statuses are stored in this browser only. In the real ERP, each request needs an authorized staff workflow.</p>`);
  dialogContent.querySelectorAll('[data-feature]').forEach(button => button.addEventListener('click', () => featureActions[button.dataset.feature]?.()));
  dialogContent.querySelectorAll('[data-request-id]').forEach(button => button.addEventListener('click', () => showRequestDetail(button.dataset.requestId)));
}

function showRequestDetail(id) {
  const item = getRequests().find(request => request.id === id);
  if (!item) return showRequests();
  const history = item.history || [{ label: 'Request submitted', date: item.date, done: true }, { label: item.status, date: 'In progress', done: false }];
  openFeature(item.type, `REQUEST ${item.id}`, `<div class="request-detail"><span class="request-status large">${item.status}</span><p>${item.details}</p><div class="request-meta-grid"><span>Submitted<strong>${item.date}</strong></span><span>Reference<strong>${item.id}</strong></span>${item.attachmentName ? `<span>Evidence file<strong>${item.attachmentName}</strong></span>` : ''}</div><h3>Request history</h3><ol class="request-timeline">${history.map(step => `<li class="${step.done ? 'complete' : ''}"><i></i><span><strong>${step.label}</strong><small>${step.date}</small></span></li>`).join('')}</ol><button id="backToRequests" class="form-submit">Back to requests</button></div>`);
  document.getElementById('backToRequests').addEventListener('click', showRequests);
}

const featureActions = {};

const roleViews = {
  student: {name:'Ravi Kumar', avatar:'RK', title:'Student', scope:'My academic life', greeting:'Good morning, Ravi', subtitle:'Your university day, brought together in one place.', nav:['Dashboard','Academics','Timetable','Examinations','Fees','Campus life','Resources','Services','My requests'], stats:[['Attendance','86.5%','↑ 2.1% this month'],['Courses','06','Semester 3 · 22 credits'],['Upcoming exams','02','First exam in 12 days'],['Open requests','—','Track submitted requests']], sections:[['Learning','Course materials, assignment briefs and submissions.','lms'],['Attendance insights','Review course trends and request event attendance with proof.','attendance'],['My requests','Certificates, meetings, attendance reviews and service tickets.','requests']]},
  professor: {name:'Dr. Ananya Rao', avatar:'AR', title:'Professor', scope:'Teaching & advising', greeting:'Good morning, Dr. Rao', subtitle:'Your teaching schedule, course activity, and student requests.', nav:['Dashboard','My courses','Attendance','Marks & grading','Office hours','Announcements','Student requests'], stats:[['Courses teaching','03','Current semester'],['Students','126','Across assigned sections'],['Pending grading','18','Assignments and quizzes'],['Requests','07','Student requests to review']], sections:[['Today’s teaching','CSE 301 · Algorithms · 9:00 AM · Room 402','timetable'],['Attendance & class roster','Review enrolment, mark attendance and inspect attendance requests with evidence.','attendance'],['Marks & grading','Enter assessment marks, save drafts and review student submissions.','marks'],['Assignments & grading','Publish briefs, review submissions and release rubric based feedback.','lms'],['Office hours','Set available meeting slots and confirm student requests.','meetings'],['Student requests','Review event attendance evidence and respond to student requests.','requests']]},
  hod: {name:'Dr. Meera Shah', avatar:'MS', title:'HOD', scope:'Department operations · CSE', greeting:'Good morning, Dr. Shah', subtitle:'Department-wide student, faculty, course, and approval overview.', nav:['Dashboard','Students','Faculty','Courses & workload','Attendance','Approvals','Reports'], stats:[['Students','842','Across 4 cohorts'],['Faculty','36','Department roster'],['Attendance watch','24','Students below target'],['Approvals','11','Awaiting department review']], sections:[['Department student overview','Browse department cohort roster and authorized academic summaries.','students'],['Faculty & workload','Course allocations, section loads and timetable conflict review.','faculty'],['Course & attendance health','Review semester trends and course level attendance.','attendance'],['Approval queue','Route attendance regularisation, course changes and student requests.','requests'],['Department reports','Semester trends and academic progress summaries by cohort.','reports']]},
  dean: {name:'Prof. Vikram Nair', avatar:'VN', title:'Dean', scope:'School oversight', greeting:'Good morning, Prof. Nair', subtitle:'School-wide academic progress, exceptions, and decisions.', nav:['Dashboard','Departments','Academic quality','Approvals','Reports','Calendar'], stats:[['Departments','06','School of Engineering'],['Enrolled students','4,820','Current academic year'],['Academic indicators','92%','Courses on-track sample'],['Escalations','08','Require school review']], sections:[['School overview','Compare department summaries, teaching coverage and semester indicators.','analytics'],['Escalated approvals','Review department-routed exceptions and academic requests.','requests'],['Program quality','Monitor curriculum delivery and program review milestones.','reports'],['Academic calendar','Coordinate school milestones, exams and events.','exams']]},
  registrar: {name:'Office of the Registrar', avatar:'OR', title:'Registrar', scope:'Academic records', greeting:'Good morning, Registrar', subtitle:'Student record workflows, certificates, and academic administration.', nav:['Dashboard','Student records','Certificates','Course registration','Exams','Academic calendar','Requests'], stats:[['Certificate queue','34','Awaiting document review'],['Record changes','12','Pending validation'],['Course changes','19','Add/drop requests'],['Exam workflows','04','Upcoming milestones']], sections:[['Certificate requests','Verify identity and eligibility before issuing bonafide, study, or transcript documents.','certificates'],['Student records','Manage approved academic record corrections with an auditable trail.','records'],['Registration operations','Review add/drop requests, enrollment exceptions and credit loads.','registration'],['Examination administration','Publish verified schedules, syllabi and result notices.','exams']]},
  vice_chancellor: {name:'Office of the Vice Chancellor', avatar:'VC', title:'Vice Chancellor', scope:'Academic & administrative oversight', greeting:'University operations overview', subtitle:'Coordinate academic priorities, institutional operations and escalations.', nav:['Dashboard','Academic affairs','Schools','Approvals','Planning','Reports'], stats:[['Schools','08','Across the university'],['Academic progress','91%','Sample indicator'],['Approvals','13','Awaiting review'],['Strategic initiatives','18','Active milestones']], sections:[['Academic affairs','Review academic performance and escalated issues across schools.','analytics'],['University operations','Coordinate registrar, student services and administrative priorities.','requests'],['Strategic planning','Review initiative owners, milestones, risks and outcomes.','reports'],['Executive approvals','Act on requests routed through approved governance.','requests']]},
  erp_manager: {name:'CampusFlow Operations', avatar:'CO', title:'ERP Manager', scope:'Platform operations', greeting:'System operations overview', subtitle:'Integration health, access administration, and operational signals.', nav:['Dashboard','Users & roles','Integrations','Audit log','System health','Support queue'], stats:[['Service health','99.9%','Demo uptime indicator'],['Active accounts','8,420','Sample directory'],['Integration status','03 / 05','Demo connector health'],['Open support','16','Across campus teams']], sections:[['Identity & role assignments','Manage account lifecycle, role mapping and least privilege access.','users'],['Integration monitor','Inspect LMS, email, messaging and payment connector health.','integrations'],['Audit log','Review sensitive record changes, permission updates and exports.','audit'],['Support operations','Triage platform incidents and route functional service tickets.','requests']]},
  admin: {name:'Campus Operations', avatar:'AD', title:'Admin', scope:'Campus operations', greeting:'Good morning, Campus Admin', subtitle:'Facilities, rooms, events, and campus service operations.', nav:['Dashboard','Facilities','Rooms','Events','Transport','Service requests'], stats:[['Service tickets','28','Open across campus'],['Facilities','07','Need attention'],['Rooms today','164','Scheduled spaces'],['Events','09','Next 14 days']], sections:[['Facilities & maintenance','Review reported issues, assign teams and track resolution.','service'],['Rooms & spaces','Inspect room availability, bookings and resource conflicts.','timetable'],['Campus events','Publish event details, manage registrations and check-in records.','events'],['Transport operations','Route registration requests and communicate verified updates.','events']]},
  chancellor: {name:'Office of the Chancellor', avatar:'OC', title:'Chancellor', scope:'Institution leadership', greeting:'University overview', subtitle:'A concise view of institutional progress and strategic priorities.', nav:['Dashboard','Institution pulse','Strategic initiatives','Approvals','Reports'], stats:[['Students','18,420','All schools · sample'],['Schools','08','Academic units'],['Student experience','88%','Sample pulse score'],['Strategic goals','74%','Milestones on track']], sections:[['Institution pulse','Aggregated academic, student experience and campus operations indicators.','analytics'],['Strategic initiatives','Progress against university priorities, owners and milestones.','reports'],['Escalated decisions','High-level requests and decisions routed through governance.','requests'],['Student experience','Privacy-preserving trends for support, engagement and service delivery.','analytics']]}
};

const roleActionRoutes = {
  lms: () => showLms(), attendance: () => showAttendance(), requests: () => showRequests(), meetings: () => showFacultyMeeting(),
  certificates: () => showCertificates(), registration: () => showCourseRegistration(), exams: () => showExams(), fees: () => showFees(),
  events: () => showEvents(), analytics: () => showAttendance(), reports: () => showAttendance(), timetable: () => document.getElementById('timetable').scrollIntoView({behavior:'smooth',block:'center'}),
  service: () => showServiceForm(), directory: () => showDirectory(), placements: () => showPlacements(),
  marks: () => showMarksEntry(), students: () => showDepartmentOverview(), faculty: () => showStaffDirectory(),
  staff: () => showStaffDirectory(), users: () => showStaffDirectory(), integrations: () => showExecutiveOverview('erp_manager'),
  audit: () => showExecutiveOverview('erp_manager'), records: () => showDepartmentOverview()
};

const sampleRoster = [
  {id:'DSU26CSE101',name:'Aarav Nair',section:'CSE-3-B',attendance:'Present'},
  {id:'DSU26CSE114',name:'Isha Rao',section:'CSE-3-B',attendance:'Present'},
  {id:'DSU26CSE128',name:'Kabir Menon',section:'CSE-3-B',attendance:'Absent'},
  {id:'DSU26CSE139',name:'Mira Shah',section:'CSE-3-B',attendance:'Present'},
  {id:'DSU26CSE152',name:'Rehan Das',section:'CSE-3-B',attendance:'Present'}
];

function demoRead(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
function demoWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function showFacultyAttendance() {
  const date = new Date().toISOString().slice(0,10);
  const saved = demoRead(`attendance-${date}`, {});
  const rows = sampleRoster.map(student => `<label class="roster-row"><span><strong>${student.name}</strong><small>${student.id} · ${student.section}</small></span><select name="${student.id}"><option ${ (saved[student.id] || student.attendance)==='Present'?'selected':''}>Present</option><option ${ (saved[student.id] || student.attendance)==='Absent'?'selected':''}>Absent</option><option ${ (saved[student.id] || student.attendance)==='Late'?'selected':''}>Late</option><option ${ (saved[student.id] || student.attendance)==='Excused'?'selected':''}>Excused</option></select></label>`).join('');
  openFeature('Mark class attendance', `CSE 301 · ${date}`, `<div class="registration-alert">Demo attendance only. In production, changes must be saved by the assigned instructor and included in the audit trail.</div><label class="lms-course-picker">Course<select id="attendanceCourse"><option>CSE 301 · Design & Analysis of Algorithms</option><option>CSE 312 · Full Stack Development</option><option>MAT 205 · Probability & Statistics</option></select></label><form id="facultyAttendanceForm"><div class="roster-list">${rows}</div><button class="form-submit">Save attendance register <span>→</span></button></form>`);
  document.getElementById('facultyAttendanceForm').addEventListener('submit', event => { event.preventDefault(); const data=Object.fromEntries(new FormData(event.currentTarget)); delete data['']; demoWrite(`attendance-${date}`,data); showToast(`Demo attendance saved for ${Object.keys(data).length} students.`); });
}

function showMarksEntry() {
  const stored = demoRead('marksEntry', {});
  const rows = sampleRoster.map((student,index)=>`<label class="marks-row"><span><strong>${student.name}</strong><small>${student.id} · CSE 301</small></span><input name="${student.id}" type="number" min="0" max="100" required value="${stored[student.id] ?? [82,91,67,88,76][index]}"><small>/ 100</small></label>`).join('');
  openFeature('Marks entry & grading', 'CSE 301 · QUIZ 2 · DRAFT', `<div class="registration-alert">Use the approved grading policy. Demo marks remain local and do not affect official grades.</div><form id="marksForm"><div class="marks-head"><span>Student</span><span>Score</span></div>${rows}<button class="form-submit">Save marks draft <span>→</span></button></form>`);
  document.getElementById('marksForm').addEventListener('submit',event=>{event.preventDefault();const marks=Object.fromEntries(new FormData(event.currentTarget));delete marks[''];demoWrite('marksEntry',marks);showToast('Demo marks draft saved locally.');});
}

function showDepartmentOverview() {
  const students=sampleRoster.map(item=>`<div class="directory-card"><span class="directory-icon">${item.name[0]}</span><div><strong>${item.name}</strong><small>${item.id} · ${item.section}</small><p>Semester 3 · CSE</p><span class="directory-hours">Attendance and grade details restricted to authorized academic need.</span></div></div>`).join('');
  openFeature('Department overview', 'COMPUTER SCIENCE · SAMPLE ROSTER', `<div class="staff-stats mini-stats"><article class="staff-stat"><span>Students</span><strong>842</strong><small>4 cohorts</small></article><article class="staff-stat"><span>Faculty</span><strong>36</strong><small>Department roster</small></article><article class="staff-stat"><span>Attendance watch</span><strong>24</strong><small>Below sample threshold</small></article></div><div class="section-heading"><div><div class="section-kicker">CSE · SEMESTER 3 SAMPLE</div><h2>Student roster</h2></div><button class="material-action" id="exportRoster">Export summary</button></div><div class="department-roster">${students}</div><p class="dialog-hint">HOD view is limited to the assigned department in this product design. Sensitive student details should be access-logged.</p>`);
  document.getElementById('exportRoster').addEventListener('click',()=>showToast('Summary export is disabled in the prototype.'));
}

function showStaffDirectory() {
  const staff=[['Dr. Ananya Rao','Professor · CSE 301','CSE'],['Prof. Karthik Menon','Associate Professor · CSE 312','CSE'],['Dr. Neha Iyer','Professor · MAT 205','Mathematics'],['Prof. S. Prakash','Associate Professor · DBMS','CSE']];
  openFeature('Faculty directory & workload','DEPARTMENT SUMMARY',`<label class="search-box"><span>⌕</span><input id="facultySearch" type="search" placeholder="Search faculty or course"></label><div class="staff-directory">${staff.map(([name,role,dept])=>`<article class="staff-person"><span class="directory-icon">${name.slice(4,5)}</span><div><strong>${name}</strong><small>${role} · ${dept}</small></div><span class="request-status">View load</span></article>`).join('')}</div><p class="dialog-hint">Sample directory only. Individual workload visibility depends on assigned role and department.</p>`);
  document.getElementById('facultySearch').addEventListener('input',event=>document.querySelectorAll('.staff-person').forEach(item=>item.hidden=!item.textContent.toLowerCase().includes(event.target.value.toLowerCase())));
}

function showExecutiveOverview(roleId) {
  const title=roleViews[roleId]?.title || 'Leadership';
  openFeature(`${title} institutional overview`,'AGGREGATED SAMPLE DATA',`<div class="staff-stats mini-stats"><article class="staff-stat"><span>Students</span><strong>18,420</strong><small>Across 8 schools</small></article><article class="staff-stat"><span>Academic progress</span><strong>91%</strong><small>Sample aggregate</small></article><article class="staff-stat"><span>Student experience</span><strong>88%</strong><small>Sample pulse</small></article></div><div class="exec-row"><span>School of Engineering</span><strong>92% academic indicator</strong><i><b style="width:92%"></b></i></div><div class="exec-row"><span>School of Computing</span><strong>89% academic indicator</strong><i><b style="width:89%"></b></i></div><div class="exec-row"><span>School of Business</span><strong>94% academic indicator</strong><i><b style="width:94%"></b></i></div><p class="dialog-hint">Illustrative aggregates only. Executive views should avoid unnecessary access to individual student records.</p>`);
}

function renderRoleWorkspace(roleId) {
  const role = roleViews[roleId] || roleViews.student;
  const studentMode = roleId === 'student';
  document.body.dataset.role = roleId;
  document.getElementById('currentName').textContent = role.name;
  document.getElementById('currentRole').textContent = `${role.title} · ${role.scope}`;
  document.getElementById('currentAvatar').textContent = role.avatar;
  document.getElementById('workspaceTitle').textContent = `${role.title} workspace`;
  document.getElementById('workspaceScope').textContent = role.scope;
  document.getElementById('pageGreeting').innerHTML = `${role.greeting} <span>✳</span>`;
  document.getElementById('pageSubtitle').textContent = role.subtitle;
  document.getElementById('breadcrumbRole').textContent = role.title;
  document.getElementById('assistantButton').textContent = studentMode ? '✦  Ask Campus AI' : '✦  Insights assistant';
  document.querySelector('.profile-card').hidden = !studentMode;
  document.querySelector('.event-strip').hidden = !studentMode;
  document.querySelector('.extra-actions').hidden = !studentMode;
  document.querySelector('.center-column').hidden = !studentMode;
  document.querySelector('.right-column').hidden = !studentMode;
  document.getElementById('roleDashboard').hidden = studentMode;
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === 'dashboard'));
  if (studentMode) return;
  const staffNav = role.nav.map((label, index) => `<button class="staff-nav-item ${index === 0 ? 'active' : ''}" data-staff-label="${label}"><span>${['▦','▤','◷','▣','⚙','⌁','♧'][index % 7]}</span>${label}</button>`).join('');
  const stats = role.stats.map(([label, value, note]) => `<article class="staff-stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
  const panels = role.sections.map(([title, description, route]) => `<button class="staff-work-card" data-route="${route}"><span class="staff-card-symbol">${route === 'requests' ? '▣' : route === 'analytics' || route === 'reports' ? '⌁' : route === 'lms' ? '▤' : '↗'}</span><span><strong>${title}</strong><small>${description}</small></span><b>↗</b></button>`).join('');
  document.getElementById('roleDashboard').innerHTML = `<div class="staff-toolbar"><div><span class="section-kicker">${role.title.toUpperCase()} VIEW · SAMPLE DATA</span><h2>Workspace overview</h2></div><span class="staff-access-note">Preview only — no protected records</span></div><div class="staff-stats">${stats}</div><div class="staff-content-grid"><section class="panel staff-work-panel"><div class="section-heading"><div><div class="section-kicker">YOUR WORKSPACE</div><h2>Tasks &amp; tools</h2></div><span class="staff-period">Academic year 2026–27</span></div><div class="staff-work-list">${panels}</div></section><aside class="panel staff-queue"><div class="section-heading"><div><div class="section-kicker">ACTION QUEUE</div><h2>Items needing attention</h2></div></div><div class="queue-empty"><span>✓</span><strong>Sample queue is clear</strong><small>Requests and approvals submitted in this demo will appear here in a future increment.</small></div><button class="form-submit" data-route="requests">Open request tracker <span>→</span></button></aside></div><div class="staff-nav-preview"><strong>Role navigation</strong><div>${staffNav}</div></div><p class="role-permission-note">Role interfaces demonstrate least-privilege product design. This role switcher is not authentication; server-side authorization is required before using real university data.</p>`;
  document.querySelectorAll('.staff-work-card[data-route], .staff-queue [data-route]').forEach(button => button.addEventListener('click', () => {
    const route = button.dataset.route;
    if (roleId === 'professor' && route === 'attendance') return showFacultyAttendance();
    if (roleId === 'hod' && route === 'attendance') return showDepartmentOverview();
    if (['dean','vice_chancellor','chancellor'].includes(roleId) && (route === 'analytics' || route === 'reports')) return showExecutiveOverview(roleId);
    if (roleActionRoutes[route]) return roleActionRoutes[route]();
    showToast(`${button.querySelector('strong')?.textContent || 'This role module'} is a product-design preview. Connect it to an authorized backend workflow.`);
  }));
  document.querySelectorAll('.staff-nav-item').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.staff-nav-item').forEach(item => item.classList.toggle('active', item === button));
    const label = button.dataset.staffLabel.toLowerCase();
    if (roleId === 'professor' && label.includes('attendance')) return showFacultyAttendance();
    if (roleId === 'professor' && (label.includes('marks') || label.includes('assignment'))) return showMarksEntry();
    if (roleId === 'hod' && label.includes('student')) return showDepartmentOverview();
    if (roleId === 'hod' && label.includes('faculty')) return showStaffDirectory();
    if (['dean','vice_chancellor','chancellor'].includes(roleId) && (label.includes('pulse') || label.includes('report') || label.includes('department'))) return showExecutiveOverview(roleId);
    if (roleId === 'registrar' && label.includes('certificate')) return showCertificates();
    if (roleId === 'registrar' && label.includes('exam')) return showExams();
    if (roleId === 'admin' && label.includes('event')) return showEvents();
    if (roleId === 'admin' && label.includes('service')) return showServiceForm();
    if (roleId === 'erp_manager' && label.includes('support')) return showRequests();
    showToast(`${button.dataset.staffLabel} section selected for the ${role.title} preview.`);
  }));
}

document.getElementById('roleSelect').addEventListener('change', event => renderRoleWorkspace(event.target.value));

const courseRows = [
  ['CSE 301', 'Design & Analysis of Algorithms', 'Dr. Ananya Rao', 91, 36],
  ['CSE 312', 'Full Stack Development', 'Prof. Karthik Menon', 84, 32],
  ['MAT 205', 'Probability & Statistics', 'Dr. Neha Iyer', 88, 34],
  ['CSE 303', 'Database Management Systems', 'Prof. S. Prakash', 79, 30],
  ['CSE 307', 'Operating Systems', 'Dr. Farhan Ali', 86, 33]
];

const lmsCourses = [
  {code:'CSE 312', name:'Full Stack Development', faculty:'Prof. Karthik Menon', unread:2, materials:[['Lecture notes','Module 4 · REST APIs and HTTP','PDF · 2.4 MB','Notes'],['Course syllabus','Full Stack Development · 2026–27','PDF · 680 KB','Syllabus'],['Previous year paper','End semester examination · 2025','PDF · 1.1 MB','PYQ'],['Assignment brief','API design proposal · Due 09 Nov','PDF · 420 KB','Assignment']]},
  {code:'CSE 301', name:'Design & Analysis of Algorithms', faculty:'Dr. Ananya Rao', unread:1, materials:[['Lecture notes','Module 5 · Graph algorithms','PDF · 1.8 MB','Notes'],['Course syllabus','Algorithms · Semester 3','PDF · 530 KB','Syllabus'],['Previous year paper','End semester examination · 2024','PDF · 960 KB','PYQ'],['Assignment brief','Graph traversal analysis · Due 12 Nov','PDF · 380 KB','Assignment']]},
  {code:'MAT 205', name:'Probability & Statistics', faculty:'Dr. Neha Iyer', unread:0, materials:[['Lecture notes','Module 3 · Distributions','PDF · 1.5 MB','Notes'],['Course syllabus','Probability & Statistics · Semester 3','PDF · 490 KB','Syllabus'],['Previous year paper','End semester examination · 2025','PDF · 870 KB','PYQ']]},
  {code:'CSE 303', name:'Database Management Systems', faculty:'Prof. S. Prakash', unread:1, materials:[['Lecture notes','Module 4 · Transactions and recovery','PDF · 2.0 MB','Notes'],['Course syllabus','Database Systems · Semester 3','PDF · 510 KB','Syllabus'],['Previous year paper','End semester examination · 2025','PDF · 1.0 MB','PYQ']]}
];
let activeLmsCourse = lmsCourses[0].code;

function showLms() {
  if (!lmsCourses.some(course => course.code === activeLmsCourse)) activeLmsCourse = lmsCourses[0].code;
  renderLmsCourse();
}

function renderLmsCourse() {
  const course = lmsCourses.find(item => item.code === activeLmsCourse) || lmsCourses[0];
  const list = course.materials.map(([kind, title, meta, tag], index) => `<article class="material-row" data-material-kind="${kind.toLowerCase()}"><span class="material-icon">${tag === 'PYQ' ? '▣' : tag === 'Assignment' ? '✎' : '▤'}</span><div><span class="course-record-code">${kind.toUpperCase()}</span><strong>${title}</strong><small>${meta}</small></div><button class="material-action" data-material="${index}">${tag === 'Assignment' ? 'Submit' : 'Open'} ↗</button></article>`).join('');
  const courseOptions = lmsCourses.map(item => `<option value="${item.code}" ${item.code === course.code ? 'selected' : ''}>${item.code} · ${item.name}</option>`).join('');
  dialogKicker.textContent = `${course.code} · SEMESTER 3`;
  dialogContent.innerHTML = `<label class="lms-course-picker">Your enrolled course<select id="lmsCourseSelect">${courseOptions}</select></label><div class="lms-course-head"><div><strong>${course.name}</strong><small>${course.faculty} · Semester 3</small></div><span class="lms-course-state">${course.unread} new</span></div><div class="lms-toolbar"><label class="search-box"><span>⌕</span><input id="materialSearch" type="search" placeholder="Search this course…"></label><select id="materialFilter" aria-label="Filter resources"><option value="all">All resources</option><option value="notes">Notes</option><option value="syllabus">Syllabus</option><option value="previous year paper">PYQs</option><option value="assignment">Assignments</option></select></div><div class="lms-tabs"><button class="lms-tab active" data-lms-tab="materials">Materials</button><button class="lms-tab" data-lms-tab="assignments">Assignments <span>2</span></button><button class="lms-tab" data-lms-tab="syllabus">Syllabus</button></div><div class="material-list">${list}</div><div id="materialsEmpty" class="empty-state" hidden>No resources match these filters.</div><p class="dialog-hint">Demo resources only. Course files and assignment submissions are not connected to DSU LMS.</p>`;
  document.getElementById('lmsCourseSelect').addEventListener('change', event => { activeLmsCourse = event.target.value; renderLmsCourse(); });
  const filterMaterials = () => {
    const query = document.getElementById('materialSearch').value.toLowerCase();
    const filter = document.getElementById('materialFilter').value;
    let count = 0;
    document.querySelectorAll('.material-row').forEach(row => { const matches = row.textContent.toLowerCase().includes(query) && (filter === 'all' || row.dataset.materialKind === filter); row.hidden = !matches; if (matches) count++; });
    document.getElementById('materialsEmpty').hidden = count > 0;
  };
  document.getElementById('materialSearch').addEventListener('input', filterMaterials);
  document.getElementById('materialFilter').addEventListener('change', filterMaterials);
  document.querySelectorAll('[data-material]').forEach(button => button.addEventListener('click', () => { if (button.textContent.includes('Submit')) showSubmission(course); else showToast('Sample resource preview is not attached.'); }));
  document.querySelectorAll('[data-lms-tab]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-lms-tab]').forEach(tab => tab.classList.toggle('active', tab === button)); if (button.dataset.lmsTab === 'assignments') showAssignments(course); else if (button.dataset.lmsTab === 'syllabus') { document.getElementById('materialFilter').value = 'syllabus'; filterMaterials(); } else { document.getElementById('materialFilter').value = 'all'; filterMaterials(); } }));
}

featureActions.lms = showLms;

function showSubmission(course = lmsCourses[0]) {
  const assignment = course.materials.find(item => item[3] === 'Assignment');
  if (!assignment) return showToast('No sample assignment is listed for this course.');
  openFeature('Submit assignment', `${course.code} · ${course.name.toUpperCase()}`, `<div class="assignment-brief"><span class="course-record-code">${assignment[1]}</span><p>Review the brief, submit your work as a link and attach a file if needed.</p><span class="assignment-deadline">Due 09 Nov 2026 · 11:59 PM</span></div><form class="service-form" id="submissionForm"><label>Submission link (GitHub or cloud link)<input name="link" type="url" required placeholder="https://…" /></label><label>Notes for your professor<textarea name="notes" rows="3" maxlength="300" placeholder="Optional note"></textarea></label><label>Attach file<input name="file" type="file" accept=".pdf,.zip,.doc,.docx" /></label><p class="dialog-hint">Demo only: this form does not upload files or submit to the official LMS.</p><button class="form-submit">Save demo submission <span>→</span></button></form>`);
  document.getElementById('submissionForm').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const id = await persistRequest('Assignment submission', `${course.code} · ${assignment[1]}`, 'Submitted for review', { submissionLink: data.link, attachmentName: event.currentTarget.elements.file.files[0]?.name || '', notes: data.notes }); showToast(`Demo submission ${id} saved.`); dialog.close(); });
}

function showAssignments(course = lmsCourses[0]) {
  const assignments = course.materials.filter(item => item[3] === 'Assignment');
  const assignment = assignments[0] || ['Assignment', 'Weekly practice set', 'PDF · 230 KB', 'Assignment'];
  dialogContent.innerHTML = `<div class="assignment-card"><span class="course-record-code">DUE 09 NOV · 11:59 PM · ${course.code}</span><strong>${assignment[1]}</strong><p>Review the assignment brief, submit your solution, and track feedback from your professor.</p><button class="form-submit" id="startSubmission">Submit assignment <span>→</span></button></div><div class="assignment-card"><span class="course-record-code">DUE 14 NOV · 5:00 PM · ${course.code}</span><strong>Reflection and peer review</strong><p>Upload your reflection and review a classmate’s work using the course rubric.</p><span class="assignment-open">Not submitted</span></div><h3 class="subsection-title">Recent submissions</h3>${getRequests().filter(item => item.type === 'Assignment submission' && item.details.startsWith(course.code)).map(item => `<article class="request-row"><span class="request-mark">✓</span><span class="request-main"><strong>${item.details}</strong><small>${item.id} · ${item.date}</small></span><span class="request-status">${item.status}</span></article>`).join('') || '<p class="dialog-hint">No submissions saved for this course in the demo.</p>'}`;
  document.getElementById('startSubmission').addEventListener('click', () => showSubmission(course));
}

function showAttendance() {
  showCourses();
  dialogKicker.textContent = 'ANALYTICS · SAMPLE DATA';
  dialogContent.insertAdjacentHTML('afterbegin', `<div class="attendance-insight"><strong>86.5%</strong><span>semester attendance</span><small>Keep the current pace to stay above the 85% threshold.</small></div><h3 class="subsection-title">Event attendance requests</h3><p class="dialog-intro">Upload proof of participation in an approved university event. A faculty member reviews the request; attendance changes only after approval.</p><form class="service-form" id="eventAttendanceForm"><label>Course<select name="course" required><option>CSE 301 · Design & Analysis of Algorithms</option><option>CSE 312 · Full Stack Development</option></select></label><label>Event name<input name="event" required placeholder="University approved event" /></label><label>Event date<input name="date" type="date" required /></label><label>Supporting document<input name="proof" type="file" accept=".pdf,.png,.jpg,.jpeg" required /></label><button class="form-submit">Send faculty review request <span>→</span></button></form>`);
  document.getElementById('eventAttendanceForm').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await persistRequest('Event attendance review', `${data.course} · ${data.event} · ${data.date}`, 'Pending faculty review', { attachmentName: event.currentTarget.elements.proof.files[0]?.name || '' }); showToast('Request saved for faculty review. Attendance is not changed automatically.'); event.currentTarget.reset(); });
}
featureActions.attendance = showAttendance;

function showCertificates() {
  openFeature('Request a certificate', 'REGISTRAR SERVICES', `<p class="dialog-intro">Choose a document and track its approval and issue status in one place.</p><form class="service-form" id="certificateForm"><label>Certificate type<select name="type"><option>Bonafide certificate</option><option>Study certificate</option><option>Fee paid certificate</option><option>Transcript request</option><option>Medium of instruction</option></select></label><label>Purpose<input name="purpose" required placeholder="e.g. Internship application" /></label><label>Required by<input name="date" type="date" /></label><label>Delivery<select name="delivery"><option>Download from portal</option><option>Collect from registrar office</option></select></label><button class="form-submit">Create request <span>→</span></button></form>`);
  document.getElementById('certificateForm').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const id = await persistRequest('Certificate', `${data.type} · ${data.purpose}`, 'Pending registrar review', { requiredBy: data.date, delivery: data.delivery }); openFeature('Request submitted', 'REGISTRAR QUEUE', `<div class="success-state"><span>✓</span><h3>Your certificate request is queued</h3><p>Reference <strong>${id}</strong></p><small>Track status in Student Requests. Sample workflow only.</small><button class="form-submit" id="requestDone">View my requests</button></div>`); document.getElementById('requestDone').addEventListener('click', showRequests); });
}
featureActions.certificates = showCertificates;

function showFacultyMeeting() {
  openFeature('Request faculty meeting', 'FACULTY OFFICE HOURS', `<form class="service-form" id="meetingForm"><label>Faculty member<select name="faculty"><option>Dr. Ananya Rao · CSE 301</option><option>Prof. Karthik Menon · CSE 312</option><option>Dr. Neha Iyer · MAT 205</option></select></label><label>Meeting topic<input name="topic" required placeholder="What would you like to discuss?" /></label><label>Preferred date<input name="date" type="date" required /></label><label>Preferred time<select name="time"><option>10:00 AM – 12:00 PM</option><option>1:00 PM – 3:00 PM</option><option>3:00 PM – 5:00 PM</option></select></label><label>Mode<select name="mode"><option>In person</option><option>Online</option></select></label><button class="form-submit">Request a time <span>→</span></button></form>`);
  document.getElementById('meetingForm').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await persistRequest('Faculty meeting', `${data.faculty} · ${data.topic} · ${data.date} · ${data.time} · ${data.mode}`, 'Awaiting faculty confirmation'); showToast('Meeting request saved for faculty confirmation.'); dialog.close(); });
}
featureActions.meetings = showFacultyMeeting;

function showCourseRegistration() {
  const available = [['CSE 341','Introduction to Machine Learning','3 credits','Open'],['CSE 329','Cloud Computing Fundamentals','3 credits','Open'],['HSS 225','Technology, Society & Ethics','2 credits','Waitlist']];
  const selected = JSON.parse(localStorage.getItem('courseSelections') || '[]');
  const rows=available.map(([code,name,credits,state])=>`<label class="registration-row"><input type="checkbox" name="course" value="${code}" data-credits="${parseInt(credits,10)}" ${state==='Waitlist'?'disabled':''} ${selected.includes(code)?'checked':''}><span><strong>${code} · ${name}</strong><small>${credits} · ${state==='Open'?'Seats available':'Waitlist only'}</small></span><b>${state}</b></label>`).join('');
  openFeature('Course registration', 'SEMESTER 4 · PLANNING PREVIEW', `<div class="registration-alert">Registration preview only. Prerequisites, seat counts, and final approval must come from the official academic system.</div><div class="credit-meter"><span>Selected credit load</span><strong id="selectedCredits">0 / 24 credits</strong><div><i id="creditFill"></i></div><small id="creditMessage">Select courses to preview your load.</small></div><form id="registrationForm"><div class="registration-list">${rows}</div><button class="form-submit">Save selections <span>→</span></button></form>`);
  const form = document.getElementById('registrationForm');
  const updateCredits = () => {
    const credits = [...form.querySelectorAll('input:checked')].reduce((sum, input) => sum + Number(input.dataset.credits), 0);
    document.getElementById('selectedCredits').textContent = `${credits} / 24 credits`;
    document.getElementById('creditFill').style.width = `${Math.min(100, credits / 24 * 100)}%`;
    document.getElementById('creditMessage').textContent = credits > 24 ? 'This exceeds the sample 24-credit limit.' : credits < 12 ? 'Below the sample 12-credit minimum.' : 'Within the sample credit range.';
  };
  form.querySelectorAll('input').forEach(input => input.addEventListener('change', updateCredits));
  updateCredits();
  form.addEventListener('submit', event=>{event.preventDefault();const codes=[...form.querySelectorAll('input:checked')].map(input=>input.value);const credits=[...form.querySelectorAll('input:checked')].reduce((sum,input)=>sum+Number(input.dataset.credits),0);if(credits>24)return showToast('Selected load exceeds the sample 24-credit limit.');localStorage.setItem('courseSelections',JSON.stringify(codes));showToast(`Saved ${codes.length} demo course selection(s), ${credits} credits.`);});
}
featureActions.registration = showCourseRegistration;

function showExams() {
  const exams=[['NOV 14','CSE 301','Design & Analysis of Algorithms','9:30 AM · Block A'],['NOV 18','MAT 205','Probability & Statistics','1:30 PM · Block C'],['NOV 21','CSE 312','Full Stack Development','9:30 AM · Technology Block']];
  openFeature('Exams & assessment', 'SEMESTER 3 · SAMPLE SCHEDULE', `<div class="exam-list">${exams.map(([date,code,name,time])=>`<article class="exam-row"><span class="exam-date">${date}</span><div><span class="course-record-code">${code}</span><strong>${name}</strong><small>${time}</small></div><button class="material-action" data-exam="${code}">Syllabus ↗</button></article>`).join('')}</div><p class="dialog-hint">Verify official exam dates and syllabus from the university examination office.</p>`);
  document.querySelectorAll('[data-exam]').forEach(button=>button.addEventListener('click',()=>showToast(`Sample syllabus outline for ${button.dataset.exam} is not attached.`)));
}
featureActions.exams = showExams;

function showFees() {
  openFeature('Fees & payment history', 'STUDENT ACCOUNT · DEMO', `<div class="fee-summary"><span>Outstanding balance</span><strong>₹ 0</strong><small>All demo semester fees shown as paid</small></div><div class="fee-row"><span>Semester 3 tuition fee</span><strong>₹ 82,500</strong><small>Paid · 15 Jul 2026 · Receipt FEE-260715</small><button class="material-action">Receipt ↗</button></div><div class="fee-row"><span>Technology and library fee</span><strong>₹ 4,500</strong><small>Paid · 15 Jul 2026 · Receipt FEE-260716</small><button class="material-action">Receipt ↗</button></div><p class="dialog-hint">Amounts and payment status are fictional examples. No payment is processed here.</p><button class="form-submit" id="feePayButton">Pay fees <span>→</span></button>`);
  document.getElementById('feePayButton').addEventListener('click',()=>showToast('Payment gateway is not connected in this demo.'));
}
featureActions.fees = showFees;

function showEvents() {
  openFeature('Campus events', 'DISCOVER · REGISTER · CHECK IN', `<div class="event-list"><article class="event-card"><span class="event-date-large">12–14<br><small>NOV</small></span><div><span class="course-record-code">TECH · HACKATHON</span><strong>DSU TechWeek 2026</strong><p>Build challenges, alumni talks, project demos and workshops at the Innovation Hub.</p><button class="event-register">Register interest</button></div></article><article class="event-card"><span class="event-date-large">18<br><small>NOV</small></span><div><span class="course-record-code">CAREER · TALK</span><strong>Engineering careers: from campus to product teams</strong><p>Industry panel · Main Auditorium · 2:00 PM</p><button class="event-register">Register interest</button></div></article><article class="event-card"><span class="event-date-large">21<br><small>NOV</small></span><div><span class="course-record-code">COMMUNITY · WELLNESS</span><strong>Campus wellness open house</strong><p>Meet the student support team and discover campus resources.</p><button class="event-register">Register interest</button></div></article></div>`);
  document.querySelectorAll('.event-register').forEach(button=>button.addEventListener('click',()=>{button.textContent='Interest noted ✓';button.disabled=true;}));
}
featureActions.events = showEvents;

function showPlacements() {
  const jobs=[['OPEN · 08 NOV','Graduate Software Intern','Nexora Labs','CSE · 2027 graduation · Apply by 08 Nov'],['OPEN · 12 NOV','Data Engineering Intern','Northstar Analytics','CSE / Data Science · Apply by 12 Nov'],['COMING SOON','Cloud Support Associate','SkyFoundry','All engineering branches · Opens 15 Nov']];
  openFeature('Internships & placement drives', 'CAREER HUB · VERIFIED OPPORTUNITIES', `<label class="search-box"><span>⌕</span><input id="jobSearch" type="search" placeholder="Search role, skill, or company…"></label><div class="placement-list">${jobs.map(([status,role,company,details])=>`<article class="job-card"><div><span class="course-record-code">${status}</span><strong>${role}</strong><small>${company}</small><p>${details}</p></div><button class="material-action job-apply">Open link ↗</button></article>`).join('')}</div><p class="dialog-hint">Demo listings. In production, opportunity links should be verified by the university placement office.</p>`);
  document.getElementById('jobSearch').addEventListener('input',event=>document.querySelectorAll('.job-card').forEach(card=>card.hidden=!card.textContent.toLowerCase().includes(event.target.value.toLowerCase())));
  document.querySelectorAll('.job-apply').forEach(button=>button.addEventListener('click',()=>showToast('No external application link is attached to this sample drive.')));
}
featureActions.placements = showPlacements;

function showCourses() {
  const rows = courseRows.map(([code, name, faculty, attendance, attended]) => `
    <div class="course-record"><div class="course-record-main"><span class="course-record-code">${code}</span><strong>${name}</strong><small>${faculty}</small></div><div class="course-attendance"><div><strong>${attendance}%</strong><small>${attended} / ${Math.round(attended * 100 / attendance)} classes</small></div><div class="course-track"><i style="width:${attendance}%"></i></div><span class="attendance-state ${attendance < 85 ? 'below' : ''}">${attendance < 85 ? 'Needs attention' : 'On track'}</span></div></div>`).join('');
  openFeature('Courses & attendance', 'ACADEMIC RECORD · SEMESTER 3', `<div class="dialog-summary"><span>Semester attendance average</span><strong>86%</strong><small>Minimum required attendance: 85%</small></div><div class="course-record-list">${rows}</div><p class="dialog-hint">Demo figures are fictional. Official attendance should be confirmed with your faculty.</p>`);
}

const campusPlaces = [
  ['Library', 'Learning resources', 'Central Academic Block · 1st floor', 'Open · until 8:00 PM', '▤'],
  ['Student Wellness Centre', 'Student support', 'Health & Wellness Building · Ground floor', 'Open · until 5:00 PM', '✚'],
  ['Innovation Hub', 'Labs & project spaces', 'Technology Block · 3rd floor', 'Open · until 7:00 PM', '✧'],
  ['Transport Office', 'Transport services', 'Admin Block · Room 12', 'Open · until 4:30 PM', '▣'],
  ['Student Activity Centre', 'Clubs & events', 'Campus Commons · Ground floor', 'Open · until 6:00 PM', '♧']
];

function showDirectory() {
  const cards = campusPlaces.map(([name, category, location, hours, icon]) => `<article class="directory-card"><span class="directory-icon">${icon}</span><div><strong>${name}</strong><small>${category}</small><p>${location}</p><span class="directory-hours"><i></i>${hours}</span></div></article>`).join('');
  openFeature('Campus directory', 'FIND YOUR WAY AROUND DSU', `<label class="search-box"><span>⌕</span><input id="placeSearch" type="search" placeholder="Search places or services…" autocomplete="off"></label><div class="directory-list" id="directoryList">${cards}</div><div class="empty-state" id="directoryEmpty" hidden>No campus places match that search.</div>`);
  document.getElementById('placeSearch').addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.directory-card').forEach(card => {
      const match = card.textContent.toLowerCase().includes(query);
      card.hidden = !match;
      if (match) shown++;
    });
    document.getElementById('directoryEmpty').hidden = shown !== 0;
  });
  document.getElementById('placeSearch').focus();
}
featureActions.directory = showDirectory;

function showServiceForm() {
  openFeature('Request campus support', 'STUDENT SERVICES', `<p class="dialog-intro">Send a request to the right campus team. This demo stores requests only in this browser session.</p><form class="service-form" id="serviceForm"><label>Service category<select name="category" required><option value="">Choose a category</option><option>IT and learning systems</option><option>Facilities and maintenance</option><option>Transport</option><option>Library</option><option>Student records</option><option>Other support</option></select></label><label>Subject<input name="subject" required maxlength="90" placeholder="Briefly describe what you need" /></label><label>Details<textarea name="details" required maxlength="600" rows="4" placeholder="Add useful details so the team can help"></textarea></label><label>Priority<select name="priority"><option>Normal</option><option>Time-sensitive</option></select></label><button class="form-submit" type="submit">Submit request <span>→</span></button></form>`);
  document.getElementById('serviceForm').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const id = saveRequest('Campus support', `${data.category} · ${data.subject}`, 'Received', { detailsNote: data.details, priority: data.priority });
    openFeature('Request received', 'SUPPORT TICKET CREATED', `<div class="success-state"><span>✓</span><h3>Your request is in the queue</h3><p>Reference <strong>${id}</strong> · ${data.category}</p><small>For this demo, the request is saved in this browser only.</small><button class="form-submit" id="doneButton">View my requests</button></div>`);
    document.getElementById('doneButton').addEventListener('click', showRequests);
  });
}
featureActions.service = showServiceForm;

document.getElementById('assistantButton').addEventListener('click', () => showToast('DSU Campus Assistant will be connected to official university resources in a future milestone.'));
document.getElementById('chatButton').addEventListener('click', () => showToast('Ask DSU AI is planned for the next build milestone.'));
document.getElementById('calendarButton').addEventListener('click', () => showToast('Academic calendar view is coming soon.'));
document.getElementById('transportButton').addEventListener('click', () => showToast('Transport registration workflow is coming soon.'));
document.getElementById('planButton').addEventListener('click', () => showToast('Study planning will be part of the student planner.'));

const unifiedNotices = [
  {source:'LMS · CSE 312', type:'lms', date:'27 OCT 2026', title:'New learning material uploaded for Full Stack Development', route:'lms'},
  {source:'EXAM OFFICE', type:'circular', date:'26 OCT 2026', title:'Mid-semester examination timetable — Semester 3', route:'exams'},
  {source:'CAMPUS · STUDENT LIFE', type:'events', date:'25 OCT 2026', title:'DSU TechWeek 2026 registration is now open', route:'events'},
  {source:'PLACEMENT CELL', type:'career', date:'24 OCT 2026', title:'Graduate Software Intern drive: applications close 08 Nov', route:'placements'},
  {source:'CAMPUS PORTAL', type:'announcement', date:'23 OCT 2026', title:'Centre for Wellness: student support sessions available', route:'directory'}
];
function renderUnifiedNotices(filter = 'all') {
  const rows = unifiedNotices.filter(item => filter === 'all' || item.type === filter).map(item => `<button class="notice-row unified-notice" data-notice-route="${item.route}"><span class="notice-symbol ${item.type === 'circular' ? 'violet-bg' : item.type === 'lms' || item.type === 'career' ? 'blue-bg' : 'mint'}">${item.type === 'events' ? '✳' : item.type === 'career' ? '↗' : '▤'}</span><span class="notice-copy"><span class="notice-meta"><span class="tag ${item.type === 'circular' ? 'tag-academic' : item.type === 'lms' || item.type === 'career' ? 'tag-lms' : 'tag-campus'}">${item.source}</span><span>${item.date}</span></span><strong>${item.title}</strong></span><span class="notice-open">Open ↗</span></button>`).join('');
  openFeature('Campus information feed', 'SAMPLE CONNECTED SOURCES', `<p class="dialog-intro">One place for campus notices, LMS announcements, exams, events and career updates. Production connectors need university authorization; these examples are synthetic.</p><div class="notice-source-legend"><span>Portal</span><span>LMS</span><span>Exam office</span><span>Placement cell</span></div><div class="notice-feed-list">${rows || '<div class="empty-state">No updates in this category.</div>'}</div><p class="dialog-hint">Each feed item should link to its official source. Email and messaging integrations are not enabled in this demo.</p>`);
  dialogContent.querySelectorAll('[data-notice-route]').forEach(button => button.addEventListener('click', () => featureActions[button.dataset.noticeRoute]?.()));
}

document.querySelectorAll('.notice-tab').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.notice-tab').forEach(tab => tab.classList.remove('selected'));
  button.classList.add('selected');
  let visible = 0;
  document.querySelectorAll('.notice-row').forEach(row => {
    const match = button.dataset.tab === 'all' || row.dataset.category === button.dataset.tab || (button.dataset.tab === 'circular' && row.dataset.category === 'circular');
    row.hidden = !match;
    if (match) visible++;
  });
  if (!visible) showToast(`No ${button.textContent.trim()} notices in this sample.`);
}));

document.querySelectorAll('[data-feature="courses"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showCourses(); }));
document.querySelectorAll('[data-feature="directory"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showDirectory(); }));
document.querySelectorAll('[data-feature="service"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showServiceForm(); }));
document.querySelectorAll('[data-feature="lms"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showLms(); }));
document.querySelectorAll('[data-feature="attendance"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showAttendance(); }));
document.querySelectorAll('[data-feature="exams"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showExams(); }));
document.querySelectorAll('[data-feature="fees"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showFees(); }));
document.querySelectorAll('[data-feature="events"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showEvents(); }));
document.querySelectorAll('[data-feature="placements"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showPlacements(); }));
document.querySelectorAll('[data-feature="meetings"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showFacultyMeeting(); }));
document.querySelectorAll('[data-feature="certificates"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showCertificates(); }));
document.querySelectorAll('[data-feature="registration"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showCourseRegistration(); }));
document.querySelectorAll('[data-feature="requests"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showRequests(); }));
document.querySelectorAll('[data-feature="notices"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); renderUnifiedNotices(); }));
document.querySelectorAll('[data-feature="notices"]').forEach(el => el.addEventListener('click', event => {
  event.preventDefault();
  document.querySelectorAll('.notice-tab').forEach(tab => tab.classList.remove('selected'));
  document.querySelector('[data-tab="all"]').classList.add('selected');
  document.querySelectorAll('.notice-row').forEach(row => row.hidden = false);
  document.querySelector('.notifications-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
}));
document.querySelectorAll('.quick-links a[href="#attendance"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); showAttendance(); }));
document.querySelectorAll('.quick-links a[href="#timetable"]').forEach(el => el.addEventListener('click', event => { event.preventDefault(); document.getElementById('timetable').scrollIntoView({behavior:'smooth',block:'center'}); }));
document.querySelectorAll('.notice-row').forEach(row => row.addEventListener('click', () => showToast('Notice details will link to the official university notice in a future milestone.')));
document.querySelectorAll('.notice-tab').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.tab === 'all') return;
  const category = button.dataset.tab === 'announcement' ? 'announcement' : button.dataset.tab;
  if (category === 'lms' || category === 'events' || category === 'career' || category === 'circular') renderUnifiedNotices(category);
}));
document.querySelectorAll('.view-all:not([data-feature])').forEach(el => el.addEventListener('click', () => showToast('This view is part of the next portal milestone.')));
document.querySelector('.profile-link').addEventListener('click', () => showToast('Profile editing will be connected to the student record workflow.'));
document.querySelector('.calendar-link').addEventListener('click', () => showToast('Academic calendar view is coming soon.'));
document.querySelector('.mini-calendar').addEventListener('click', () => showToast('Academic calendar view is coming soon.'));
document.querySelectorAll('.placement-card [data-feature="placements"]').forEach(el => el.addEventListener('click', showPlacements));
document.querySelectorAll('.extra-actions [data-feature="requests"]').forEach(el => el.addEventListener('click', showRequests));
document.querySelector('.dismiss-button').addEventListener('click', () => document.querySelector('.announcement').remove());
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

async function initializePortal() {
  const roleSelect = document.getElementById('roleSelect');
  const savedRole = localStorage.getItem('campusRole');
  if (savedRole && roleViews[savedRole]) roleSelect.value = savedRole;
  renderRoleWorkspace(roleSelect.value);
  roleSelect.addEventListener('change', () => localStorage.setItem('campusRole', roleSelect.value));
  document.getElementById('resetDemo').addEventListener('click', () => { localStorage.removeItem('campusRequests'); localStorage.removeItem('courseSelections'); localStorage.removeItem('campusRole'); showToast('Browser demo data reset. Reload to clear API demo records.'); });
  try {
    if (location.protocol === 'file:') return;
    const [roleResponse, courseResponse, noticeResponse] = await Promise.all([fetch('/api/roles'), fetch('/api/courses'), fetch('/api/notices')]);
    if (!roleResponse.ok || !courseResponse.ok || !noticeResponse.ok) throw new Error('API unavailable');
    const [roleData, courseData, noticeData] = await Promise.all([roleResponse.json(), courseResponse.json(), noticeResponse.json()]);
    document.body.dataset.api = 'connected';
    document.body.dataset.roles = String(roleData.roles.length);
    document.body.dataset.courses = String(courseData.courses.length);
    document.body.dataset.notices = String(noticeData.notices.length);
  } catch { document.body.dataset.api = 'offline'; }
}

initializePortal();
