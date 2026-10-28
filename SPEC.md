# Lab Booking

## Project option
Lab booking: students book a lab workstation for a time slot, and staff manage labs and see all bookings.

## Goals
- A student books a free workstation for a whole-hour slot and sees and cancels their own bookings.
- A staff member manages labs and workstations and sees every booking of every student.
- Double-booking the same workstation in the same hour is impossible, enforced by the database and not only by the screen.

## Non-goals
- No payments, fees or deposits for bookings.
- No email or SMS notifications or reminders.
- No recurring bookings (for example "every Monday").
- No calendar sync with Google Calendar or Outlook.
- No native mobile app; the web UI only has to be readable on a phone.

## Constraints
- Stack: Node.js 20, Express and SQLite (better-sqlite3); the database is a single file in the repository folder, ignored by git.
- Passwords are stored only as bcrypt hashes, never in plain text and never in logs.
- All keys and secrets live in codespace secrets; `.env.example` contains placeholders only.
- Bookings are whole-hour slots between 08:00 and 20:00, in the server's local time.

## The model feature
- Model: Gemini 2.5 Flash (Google AI Studio free tier), text in and text out, called only from the server.
- Input: a free-text request from a student, for example "20 computers on Wednesday afternoon", plus the list of labs (name, room, seat count) read from the database.
- Output: a suggestion of one lab, one date and one hour, returned as JSON and shown on the booking screen labelled "Suggestion". It never creates a booking by itself; the student confirms with the normal booking button.
- When it fails: if the provider takes longer than 10 seconds, the student sees "The assistant is not answering, pick a lab and hour yourself" and the booking form still works. If the provider is rate-limited (HTTP 429), the student sees "The assistant is busy, try again in a minute". If the answer is not valid JSON, names a lab that is not in `labs`, or an hour in the past or outside 08:00-20:00, the server discards it and shows "The assistant could not suggest a slot"; nothing is saved in any case.

## Auth
- Local: email and password; the password is stored only as a bcrypt hash in `users.password_hash`, minimum 8 characters, and sessions are kept in an HTTP-only cookie.
- Provider: GitHub OAuth; the app asks only for the user's verified primary email and GitHub id.
- Linking: `users.email` is unique and is the identity of one person. If someone signs in with GitHub and a user with the same verified email already exists, GitHub is linked to that row (`users.github_id` is filled in) and no second row is created. If GitHub returns no verified email, sign-in is refused with "Your GitHub email is not verified".

## MCP tools
| Tool | What it does | Who may call it |
| --- | --- | --- |
| list_labs | Returns every lab with its room, seat count and number of workstations in service. | Any signed-in user |
| create_booking | Books one workstation for one whole-hour slot and refuses overlaps, past times and the limit of 3 active future bookings. | Student or staff, for their own account |
| cancel_booking | Cancels one booking by id and sets its status to cancelled; students can only cancel their own bookings. | Booking owner or staff |
| list_all_bookings | Returns the bookings of every student with lab, workstation, hour and status. | Staff only |
| set_workstation_status | Marks a workstation as in service or out of service so it is offered or hidden for booking. | Staff only |

## UI
- Stack: server-rendered HTML pages from Express with EJS templates, plain CSS with design tokens, no frontend framework.
- Screens: Login (email and password, "Sign in with GitHub"); Labs list; Book a workstation (form plus the assistant's suggestion); My bookings (list with cancel); All bookings (staff only); Manage labs and workstations (staff only).

## Architecture

## Acceptance criteria
- [AC-1] A student who books a workstation for an hour that is already booked sees "This slot is taken" (HTTP 409), and no new row appears in `bookings`.
- [AC-2] A student who books a free workstation sees the booking in "My bookings", and one row with their user id and status `active` exists in `bookings`.
- [AC-3] A student who cancels their own booking no longer sees it in "My bookings", and its row in `bookings` has status `cancelled`.
- [AC-4] A student who tries to cancel another student's booking gets HTTP 403, and that row in `bookings` is unchanged.
- [AC-5] A student who books an hour in the past sees "You cannot book a time in the past", and no new row appears in `bookings`.
- [AC-6] A student who already has 3 active future bookings and tries a fourth sees "Booking limit reached (3)", and no new row appears in `bookings`.
- [AC-7] A staff member opens "All bookings" and sees the bookings of every student; a student who requests the same page gets HTTP 403.
- [AC-8] A staff member who adds a lab sees it in the labs list, and one new row exists in `labs`; a student who sends the same request gets HTTP 403 and no row is added.
- [AC-9] A staff member who marks a workstation out of service no longer sees it offered for booking, and a booking request for it returns HTTP 409.

### Slice 1: sign-in and the list of labs
- [AC-10] A visitor who is not signed in and opens `/labs` is redirected to `/login` and sees no lab data; the same request to `/api/labs` returns HTTP 401.
- [AC-11] A user who signs in with a correct email and password sees every lab from the `labs` table with its name, room and number of workstations.
- [AC-12] A user who signs in with a wrong password sees "Wrong email or password", and no session is created.
- [AC-13] After a row is deleted from `labs` directly in the database, reloading `/labs` no longer shows that lab.

## Traceability
| Criterion | Test |
| --- | --- |
| AC-1 |  |

## Spec vs result