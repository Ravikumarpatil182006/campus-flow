# CampusFlow University ERP

A multi-role university portal prototype for the Full Stack Development course. It uses synthetic data and can be launched locally without installing frontend or Python packages.

## Run locally

From the repository root in PowerShell:

```powershell
python -m backend.main
```

Open **http://127.0.0.1:8000**. The API creates a local SQLite file at `backend/campusflow.db` on first run. Press `Ctrl+C` in the terminal to stop the server. The site can also be opened as `frontend/index.html`, but requests then stay in browser local storage and API-connected features use the local fallback.

## Demo profiles

Use **Preview role** to switch between eight sample interfaces:

- Student: courses, LMS, attendance trends, event attendance requests, exams, fees, certificates, meetings, events, career listings and request tracking.
- Professor: course roster, mark class attendance, enter assessment marks, review assignments, manage office hours and respond to student requests.
- HOD: department student and faculty summaries, course/workload oversight, attendance watchlist, approvals and reports.
- Dean: school-wide department indicators, escalations, academic quality and aggregated reports.
- Registrar: student records, certificate queue, registration exceptions, exams and academic calendar.
- Vice Chancellor: academic and administrative oversight, school summaries, escalations and strategic planning.\n- ERP Manager: accounts and roles, integrations, audit and platform support.
- Admin: facilities, rooms, events, transport and service tickets.
- Chancellor: aggregated institution indicators, strategic initiatives and escalated decisions.

Role preview changes the interface only. It is not authentication or authorization. HOD views are scoped to a department; dean, vice chancellor and chancellor views emphasize aggregated information; sensitive records remain role- and task-limited in a production design.

## Local API

- `GET /health` — liveness response
- `GET /api/roles` — supported demo profiles
- `GET /api/courses` — sample courses
- `GET /api/notices` — sample shared notice feed
- `GET /api/requests` — persisted demo request list (staff preview sees all; student preview sees student entries)
- `POST /api/requests` — create a demo request
- `PATCH /api/requests/{id}` — update demo status

## Product feature map

The prototype models a student-first single portal for academic records, course LMS materials, assignment submission, course registration, timetable, attendance insights and event attendance review, exams and syllabus, fee history, certificate requests, faculty meetings, event discovery, placement drives, campus services and a source-labeled shared notice feed. Staff views add course delivery, approvals, record workflows, operations and aggregated leadership reporting.

Research-informed references: [IIT Bombay Academic Office](https://acad.iitb.ac.in/academics/calendar-and-timetable), [IIT Delhi ERP](https://csc.iitd.ac.in/services-erp), [IIT Delhi timetable](https://timetable.iitd.ac.in/sem-schedule), [IIIT Bangalore](https://www.iiitb.ac.in/my-iiitb), [University of Utah Campus Connect](https://studentaffairs.utah.edu/blog/posts/2026/september/campus-connect-app.php), [Lindenwood student portal](https://www.lindenwood.edu/information-technology/it-applications/student-portal/). These examples show academic systems, LMS, schedules, financial records, degree progress, events, and services; CampusFlow combines these journeys as a coursework concept.

## Boundaries before any real deployment

This is ready to run as a **local class demo**, not ready for real university use. It has no secure login, server-side role authorization, real DSU APIs, file upload storage, real LMS documents, email or WhatsApp connectors, payment gateway, verified placement links, or production audit controls. Do not add real student contact details, grades, health information, payment data, or identity documents. Real integrations need university permission, approved APIs, security review, and privacy/retention rules.

## Stack direction

- Current frontend: responsive HTML, CSS and JavaScript served by Python.
- Local API: Python standard library HTTP server.
- Demo persistence: SQLite.
- Production direction: React + TypeScript, FastAPI, PostgreSQL, university SSO, server-enforced role access, secure object storage, and approved integrations.
