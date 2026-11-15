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
One request, `POST /api/bookings`, through every layer:

1. `src/app.js` mounts the session and `src/routes/bookingRoutes.js`. In front of the handler, `src/routes/authGuard.js` turns a missing session into a 401 before any rule runs.
2. `src/routes/bookingRoutes.js` reads `workstationId`, `date` and `hour` from the body, calls `bookingService.createBooking(req.session.user.id, ...)` and names 201. It holds no rule; when the service throws, `src/routes/httpErrors.js` maps the error class to 400, 403, 404, 409, 422, 429 or 503 and sends `{ "error": "<sentence>" }`.
3. `src/services/bookingService.js` holds the rules: workstation exists and is in service, the slot is a bookable hour (`src/services/slotRules.js`, shared with the assistant), the limit of 3, the slot is free. It throws the classes of `src/services/errors.js`, which carry a sentence and know nothing about HTTP.
4. `src/data/bookingRepository.js` is the only place with the SQL for `bookings`. The rule "one active booking per workstation, day and hour" is also enforced by the unique index in `db/migrations/002_bookings.sql`, so two simultaneous requests cannot both succeed.
5. The shape that crosses back to the client is the new row as JSON with 201, or `{ "error": "<sentence>" }`.
6. In the browser, `src/views/book.ejs` is the view (form `#book-form`). Its submit handler holds the state (button disabled, `#status` while waiting, `#error` on failure), makes the REST call with `fetch('/api/bookings')`, and on success goes to `src/views/my-bookings.ejs`, which loads `GET /api/bookings` and shows loading, empty or list.

The same rules have a second front door: `mcp-server/tools.js` (`create_booking`) calls `bookingService.createBooking` too and writes no SQL. The model feature sits beside it: `src/services/suggestionService.js` asks `src/ai/assistant.js`, the only file that names the provider, and checks the answer with `slotRules.js` before showing it.

Where this codebase does not match its own layering: the browser side has no layers. In `src/views/book.ejs` and `src/views/my-bookings.ejs` the view, the state and the REST calls live in one inline script each, with the state kept in the DOM (`hidden` flags), instead of separate files for drawing, state and API calls. I left it that way because the SPEC chooses server-rendered EJS without a frontend framework and each screen has a single call; it would be worth splitting if a screen grows a second one.

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
- [AC-11] A user who signs in with a correct email and password sees every lab from the `labs` table with its name, room and number of workstations (in slice 1 stored in `labs.workstation_count`; derived from a `workstations` table in a later slice).
- [AC-12] A user who signs in with a wrong password sees "Wrong email or password", and no session is created, and the same browser is still redirected from `/labs` to `/login`.
- [AC-13] After a row is deleted from `labs` directly in the database, reloading `/labs` no longer shows that lab.

### Slice 2: book a workstation
This slice delivers AC-1 to AC-6 above (booking, double-booking, cancelling, past time, limit of 3) and adds these:
- [AC-14] A visitor who is not signed in and sends `POST /api/bookings` gets HTTP 401, and no new row appears in `bookings`.
- [AC-15] A booking request for a workstation that does not exist gets HTTP 404, and no new row appears in `bookings`.
- [AC-16] A booking request for an hour outside 08:00-20:00 or not on the hour gets HTTP 400 with a sentence naming the allowed hours, and no new row appears in `bookings`.
- [AC-17] Even if the service check is bypassed, the database refuses a second active row for the same workstation and hour (unique index), so two simultaneous requests leave exactly one row.

### Slice 3: staff pages (AC-7, AC-8, AC-9)
Delivered above: All bookings, adding a lab, taking a workstation out of service.

### Slice 4: the assistant and the MCP tools
- [AC-18] A booking made through the MCP tool `create_booking` follows the same rules as the HTTP API: a taken slot returns a tool error "This slot is taken", and no new row appears in `bookings`.
- [AC-19] A student who calls the staff-only tools `list_all_bookings` or `set_workstation_status` gets a tool error "Only staff can do this" and nothing changes; a staff member gets the result.
- [AC-20] The MCP tool `list_labs` returns every lab with its room, seat count and the number of workstations in service.
- [AC-21] When the MCP server does not know who is calling, every project tool returns a tool error and touches no data.
- [AC-22] A student who describes what they need gets one suggestion (lab, date, hour) labelled "Suggestion" when the model answers with a real lab and a bookable hour; no row appears in `bookings`.
- [AC-23] When the model answers with text that is not JSON, a lab that does not exist, an hour in the past or an hour outside 08:00-20:00, the student sees "The assistant could not suggest a slot" (HTTP 422), and nothing is saved.
- [AC-24] When the provider is slow, down or has no key, the student sees "The assistant is not answering, pick a lab and hour yourself" (HTTP 503); when it is rate-limited, "The assistant is busy, try again in a minute" (HTTP 429); the booking form still works.
- [AC-25] A visitor who is not signed in gets HTTP 401 from `POST /api/suggestions`, and an empty request gets HTTP 400; the model is not called in either case.

## Traceability
| Criterion | Test |
| --- | --- |
| AC-1 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-2 | `test/bookingApi.test.js`, `test/bookingPages.test.js` |
| AC-3 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-4 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-5 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-6 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-7 | `test/staffService.test.js`, `test/staffApi.test.js` |
| AC-8 | `test/staffService.test.js`, `test/staffApi.test.js` |
| AC-9 | `test/staffService.test.js`, `test/staffApi.test.js` |
| AC-10 | `test/slice1.test.js` |
| AC-11 | `test/slice1.test.js` |
| AC-12 | `test/slice1.test.js` |
| AC-13 | `test/slice1.test.js` |
| AC-14 | `test/bookingApi.test.js`, `test/bookingPages.test.js` |
| AC-15 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-16 | `test/bookingService.test.js`, `test/bookingApi.test.js` |
| AC-17 | `test/bookingService.test.js` |
| AC-18 | `test/mcpTools.test.js` |
| AC-19 | `test/mcpTools.test.js` |
| AC-20 | `test/mcpTools.test.js` |
| AC-21 | `test/mcpTools.test.js` |
| AC-22 | `test/suggestionService.test.js`, `test/suggestionApi.test.js` |
| AC-23 | `test/suggestionService.test.js`, `test/suggestionApi.test.js` |
| AC-24 | `test/suggestionService.test.js`, `test/suggestionApi.test.js` |
| AC-25 | `test/suggestionApi.test.js` |

## Spec vs result
Slice 1 (AC-10 to AC-13) passed. I ran each criterion myself: an unauthenticated `/labs` redirects to `/login`; `/api/labs` returns 401; a wrong password shows "Wrong email or password"; the correct password shows both seeded labs with their workstation counts; and deleting the "Hardware Lab" row directly in SQLite made it disappear from `/labs` after a reload. 10 tests pass, with 100% coverage of `src/services` and 90% overall.

What the agent missed or reinterpreted:
- Its test setup deleted from a `bookings` table that does not exist in slice 1, so every test failed until the lines were removed.
- It dropped the check that the same browser is still redirected after a failed login, so AC-12 was only half proven, and its `/20/` assertion also matched "Room 202". I corrected both.
- It first used a fallback session secret (`development-secret`) and did not regenerate the session on login. I asked for both to be changed.
- It stored `workstation_count` in `labs` because slice 1 has no `workstations` table; that reinterprets "number of workstations" in AC-11.

Known gaps I am leaving: logout is a GET request, an unknown email returns before bcrypt runs (a timing difference), and the pages are unstyled until Exercise 4.

Spec changes I made because of this: AC-11 now says the count is stored in `labs.workstation_count` in slice 1, and AC-12 now says the same browser is still redirected from `/labs` to `/login` after a failed sign-in.