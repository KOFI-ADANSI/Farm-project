# NSA PAPAO FARM Database

Local farm staff, duties, and Poultry/Piggery pen management app.

## Run locally

```bash
npm install
npm run dev
```

On Windows, double-click `Start Farm.bat` in the project folder to start the development server in a console window.

The development command starts the Vite dashboard and SQLite API together; the API restarts automatically when server source files change. Restart `npm run dev` after changing its command or environment configuration. For a single-process deployment, build the dashboard and start the API/static server:

```bash
npm run build
npm start
```

Both services listen on all network interfaces. When running `npm run dev`, use Vite's **Network** URL to open the dashboard from another device on the same network. Ensure your firewall allows the Vite and API ports (`5173` and `8787` by default).

NSA Farmops restricts app and API requests to the `192.168.1.0/24` client network by default, matching the addresses shown for `NSA-Farms-Central` and `HUAWEI-5G-TJh9`. Connect the computer running NSA Farmops and staff devices to either Wi-Fi network, then start or restart `npm run dev` and use the Vite **Network** URL it prints. The devices must be on the same reachable LAN; guest/client isolation or a different subnet can prevent access. This is an IP-range restriction, not verification of the Wi-Fi SSID: any device whose request comes from the allowed range can connect, and a router/VPN/proxy may change the source address. Set `FARM_ALLOWED_CLIENT_CIDRS` in `.env.local` to a comma-separated list of trusted IPs/CIDRs if the router uses a different range. Localhost is also allowed for local development. For strict SSID-only enforcement, configure the router/firewall to permit NSA Farmops traffic only from `NSA-Farms-Central` and `HUAWEI-5G-TJh9`.

The server serves the built app from `dist/` and the API from the same origin. `npm start` expects a completed build; if `dist/index.html` is missing, the root page returns a build instruction rather than silently serving an empty page. Set `FARM_STATIC_DIR` only if the build output is deployed somewhere other than `dist/`. The SQLite database is stored at `data/farm.sqlite`.

For source distribution, create archives from tracked source only with `git archive --format=zip --output NSA-Farmops.zip HEAD`. Do not archive the working directory wholesale: keep `data/` and `node_modules/` out of shared archives, and verify local database files are not tracked before publishing.

On first startup, the API creates an `admin` account. Set `FARM_ADMIN_PASSWORD` before `npm run dev` to choose its password:

```powershell
$env:FARM_ADMIN_PASSWORD = 'choose-a-strong-password'
npm run dev
```

For forgotten admin passwords, configure a separate recovery key before starting the API. Generate a long random value and keep it in a password manager or another secure offline location; it is not a backup of the password itself. For example, in PowerShell:

```powershell
$env:FARM_ADMIN_RECOVERY_KEY = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
npm run dev
```

Choose **Forgot admin password?** on the sign-in screen and use that key to set a new admin password. Recovery only applies to the built-in `admin` account, invalidates its existing sessions, and stores the new password as a scrypt hash. Changing the recovery key requires restarting the API with the new environment value.

### Reset the local database

Stop the development server, then run `npm run reset:database`. The command saves a timestamped backup in `data/` before removing farm records, schedules, sessions, users, roles, and audit history. On its next connection, each browser also clears its old farm cache and offline outbox. Restart with `npm run dev` to create the starter dataset and a fresh `admin` account. Set `FARM_ADMIN_PASSWORD` in `.env.local` first to choose its password; otherwise the API prints a generated password at startup.

### BMS SMS setup

Copy `.env.example` to `.env.local` and set `BMS_API_KEY` and an approved `BMS_SENDER_ID` (11 characters or fewer). The API server reads these values; the browser never receives the API key. The Schedule page can schedule an individual notice to an assignee or a date summary to selected staff. BMS quick SMS must be enabled and funded in the account. Account-creation and temporary-password SMS include the app address currently used by the administrator and direct users to `NSA-Farms-Central` or `HUAWEI-5G-TJh9` (the IP restriction allows `192.168.1.0/24`; the SSID itself is not independently verified). Phone numbers are sent to BMS as digits only, with Ghanaian 10-digit numbers beginning with `0` converted to the `233` country code. A successful BMS response means the provider accepted the request; it is not a delivery receipt. Confirm that staff receive credentials, and use the displayed SMS campaign reference to check delivery in BMS if they do not. If using a stable DNS/HTTPS address, set `FARMOPS_PUBLIC_URL` in `.env.local` to that full origin (for example, `https://farm.example.com`) so SMS links remain the same as networks change. Without it, SMS uses the administrator's current browser origin.

Authentication uses a server-side scrypt password hash and an HTTP-only session cookie. All password changes, resets, and recovery use the same policy: at least eight characters, including letters and numbers. New-account temporary passwords must be 8-10 characters and include letters and numbers; account activation uses `Temppass1`. Admin password resets always send the temporary password by SMS to the account's linked staff phone and require a valid phone number plus configured BMS credentials before changing the password. Expired sessions are purged during login and periodically; SMS sends left in `sending` for more than two minutes are marked failed so they can be retried.

Accounts with a temporary password must change it at first sign-in, then install NSA Farmops on that device before entering the workspace. Supported browsers can launch their native install prompt; on mobile Safari and other browsers without a prompt, the setup screen provides platform instructions and a confirmation option. The install requirement is tracked per account and device.

The API limits request bodies to 1 MiB, with a 10 MiB allowance for the full database snapshot at `POST /api/data`. Login and admin-recovery attempts are limited to five failures per IP and username in a 15-minute window, followed by a 15-minute lockout; failed credentials are written to the audit log without recording passwords or recovery keys. Successful logins are also recorded with their timestamp and client IP. Admins can see each account's last login in Account management and review login events alongside other account activity in the audit log. The counters are held in memory and reset when the API process restarts. Same-origin requests need no CORS configuration. If a separate frontend origin is required, set `FARM_ALLOWED_ORIGIN` to that exact origin (scheme and host, without a path). HTTPS connections automatically receive Secure session cookies; when TLS terminates at a reverse proxy, set `FARM_COOKIE_SECURE=true` and ensure the API is not directly exposed over untrusted HTTP. API responses include restrictive CSP, frame, content-type, and referrer-policy headers.

Farm data access is department-scoped unless an account has the `data:write` permission. That permission grants unscoped database access, full database replacement, pen management, and livestock activity entry; it is assigned to the built-in Admin role by default. Only the root `admin` account can grant `data:write` or `user:manage`, and only root can assign roles carrying either permission. Inventory access follows the `inventory:manage` permission rather than a fixed role name or department: inventory managers see their assigned department's staff and duties and farm-wide feed usage for inventory tracking, but not livestock health/yield records or pen-management details. Pen names are provided only as references when recording feed usage. Logout clears the browser's cached database and offline mutation queue.

The root `admin` account can create, edit, and delete roles and departments, including the built-in entries. Accounts with `user:manage` (including Admin and General Administrator accounts) can create custom roles and departments, assign permitted roles to accounts, and manage account access, but cannot edit/delete built-ins, grant `data:write` or `user:manage`, assign those permissions, or manage the root account. Built-in status is tracked independently of names, so renaming an entry does not remove its protection. A login account can have a primary role plus multiple additional access roles; permissions from all assigned roles are combined and are independent of department delegation and a linked staff member's job role. Changes to a role's name or permissions revoke sessions for every account using it so updated access takes effect on the next sign-in. Roles assigned to users cannot be deleted until reassigned. Departments referenced by staff, accounts, duties, attendance, duty history, or staff rotation targets cannot be deleted until reassigned; department renames update those records and pen-department configuration.

In Account management, administrators can review active staff profiles that do not yet have logins and activate an account directly from the staff list. Choose a short, memorable username or use the staff member's phone number (digits only) as the login name. NSA Farmops links the login to the staff profile and department, assigns the standard `Staff` role, and uses the temporary first-login password `Temppass1` once. Share it securely with the staff member; they must change it at first sign-in. The account repository separates active and deactivated accounts and can search usernames, staff profiles, roles, and departments; inactive accounts can be reactivated there.

Custom roles can grant department-scoped read access with `farm:view`, `attendance:view`, `duties:view`, `pens:view`, `department:users:view`, `inventory:view`, or `schedule:view`. `farm:view` covers the assigned departments' staff database, duties, assigned pens, and livestock activity; the other view permissions expose only their named section. Department user/role listings, attendance, inventory requests, schedule duties, and schedules are restricted to the account's assigned departments. View permissions do not grant edit, export, schedule-management, or inventory-management actions. `duty:write` grants individual duty creation, assignment, editing, and completion within the account's department scope; staff assignments are limited to active roster members in the duty's department. Accounts with `data:write` can also manage duties across departments. `inventory:view` can see stock levels and shortage status, while only `inventory:manage` can change stock or process requests. The existing `activity:write` permission grants livestock activity recording.

Administrators can delegate access to additional departments for an individual user account from Account management, including supervisors and department heads. The account's selected department remains its home department and must match its linked staff profile; delegated departments expand only that account's department scope, not the staff profile itself. All existing department permissions and role capabilities continue to apply within every delegated department.

The API creates a consistent daily SQLite snapshot under `data/backups/farm-backup-YYYY-MM-DD.sqlite` at startup and checks for the next day's snapshot every minute. Keep between 1 and 365 snapshots with `FARM_BACKUP_RETENTION` (default 30); backups older than the configured newest N are pruned automatically. Keep an additional off-device backup for disaster recovery.

Inventory Managers and Admins can record item requests on behalf of staff, approve or reject pending requests, and record the quantity issued for approved requests. The Stock on hand view lists all tracked items across departments, current quantities, alert thresholds, and available/low/out-of-stock status, with summary counts for shortages. Add every item held in stores as a stock item and set its low-stock threshold; requests cannot be marked fulfilled until the item is tracked with an available balance, and issued quantities are deducted immediately. Feed activity also requires selecting a tracked stock item and atomically subtracts the recorded quantity. Staff who can record activity can see stock-item names and available quantities to select feed accurately; only Inventory Managers and Admins can change stock.

Health records with a `nextDue` date appear in the health reminders and vaccination calendar, including overdue items and events due within 30 days. The Schedule page can print or save the duty roster as PDF, and the recent audit panel can print or save the audit log as PDF. Admin-issued temporary passwords are available from the account directory; reset invalidates prior sessions and requires the account holder to change the password at next login. For accounts linked to a staff profile with a valid phone number, admins can send the temporary password by SMS; this requires BMS SMS configuration on the API server. Password fields provide a show/hide control.

Staff and Supervisor accounts can be linked to one active staff profile in Account management, whether or not the person is allocated to the roster. Profile links must match the account department and cannot be shared. Linked field users land on a phone-first Today page with their own attendance clock, attendance totals, scheduled assignments, next upcoming incomplete schedule, assigned pen, completion notes, and quick activity-entry actions. The server checks schedule ownership before allowing a duty to be marked complete. The Overview provides department-scoped overdue-duty, health-due, and no-recent-feed alerts; pending inventory requests are included only for accounts that manage inventory. Use `/` or `Ctrl+K` to open the global search for scoped people, duties, and pens.

The Today page includes server-timestamped clock-in and clock-out controls for linked staff, whether or not they are allocated to the roster, plus two all-time attendance totals: weekdays attended (Monday-Friday) and all days attended (including weekends). Unlinked staff accounts must be linked by an administrator before they can use the personal clock. Only the account that recorded a clock-in can clock out that shift. Admins can view and export attendance but cannot punch on behalf of other staff. Accounts with `attendance:view` can view attendance for their department; `attendance:manage` grants department-scoped management, and `data:write` grants farm-wide management. Attendance managers can download attendance as CSV for a selected day, week (Monday-Sunday), month, or year; department managers only export their permitted department. Attendance is available by date, scoped by department, and retained separately from staff database imports. A staff member can have one completed attendance record per day and only one open shift at a time.

Overview analytics include weekly feed usage by pen, feed-versus-yield totals by pen, and duty completion rates by department, with 7-, 30-, and 90-day activity windows. Schedule management includes a seven-day calendar; draggable entries can be rescheduled only when their SMS has not already been queued, and SMS status is shown on each calendar card. Pen names open a detail report with assigned staff, duties, and available feed, health, and yield history. Staff and audit reports can be printed or saved as PDF; audit and livestock reports, staff lists, and pen reports can also be exported as Excel-compatible CSV. Admins can filter the audit log by account, action, and date; bulk staff updates cover department, shift, and status (Available, On duty, Off duty, or Not active), and selected duties can be completed together with history records.

Users can select light, dark, or system-matched appearance and English or Ewe from the workspace toolbar. Ewe translations currently cover primary navigation and the field Today quick actions; other screens remain in English. The login page and workspace toolbar provide NSA Farmops installation options for iPhone/iPad, Android, Windows, macOS, and Linux. NSA Farmops is a browser-installable web app, not a native APK/EXE/DMG download. Installation requires a production deployment served over HTTPS (localhost is also treated as secure); a plain HTTP LAN address such as `http://192.168.x.x:5173/` can open the site but cannot install the PWA. iOS/iPadOS users add it from Safari's Share menu; Android and desktop Chromium browsers can use their install prompt or browser menu. Delete and duty-completion actions offer an eight-second Undo toast. Keyboard focus indicators and live announcements are enabled for workspace messages and queued sync status.

The Admin staff database is divided into **Permanent Staff**, **Volunteer Staff**, and **National Service personnel**. Each section supports CSV template download, upload, export, and direct database updates; **All staff** shows the combined records with their details in an editable table, including category, role, department, phone, course of study, start date, residential location, shift, status, and pen assignment. Course of study, start date, and residential location are available only in the All staff view and are persisted with each staff record. Staff names are normalized to uppercase on upload, entry, and database migration. Staff work patterns can be set to daily or weekly, with recurring weekly off days selected per staff member; these settings appear on Today and are included in staff CSV exports. They describe the work pattern but do not prevent attendance clock-in/out on an off day. A staff member can also be marked as floating and assigned either manual or scheduled rotation between selected departments and/or pens; scheduled rotation supports daily, weekly, or monthly intervals and runs on the API server. Staff CSV uploads require name, role, staff category, department, and phone number. All other staff fields—including course of study, start date, residential location, roster allocation, shift, status, pen, work schedule, off days, and rotation settings—are optional and can be entered or edited after upload. When omitted, optional fields use the system defaults, such as Morning shift, Available status, no pen assignment, and not allocated to the roster. The Staff roster is a subset of these database records: Admins allocate people into or remove them from the roster, and operational assignments use rostered staff only. Existing staff records are migrated as Permanent Staff and kept on the roster; review their categories in the staff database after upgrading.

## API

`GET /api/data` returns staff, duties, pens, and pagination metadata. Query parameters are supported for scalable reads:

```text
/api/data?search=poultry&department=Poultry&status=Open&page=1&pageSize=25
```

- `search` searches names, titles, descriptions, roles, zones, and notes.
- `department` filters staff and duties by department.
- `status` accepts `Open`, `Completed`, or `On duty`.
- `page` is 1-based and `pageSize` is capped at 100.

`GET /api/attendance?date=YYYY-MM-DD` returns active staff attendance for the requested date and any open shifts. Each staff row includes `workdaysAttended` (Monday-Friday) and `totalDaysAttended` (including weekends), calculated across recorded attendance. `POST /api/attendance` accepts `{ "staffId": 1, "action": "clockIn" }` or `{ "staffId": 1, "action": "clockOut" }`. Linked staff can clock themselves; other staff require database-management or attendance-management permission, with department scope enforced by the API. A clock-out is accepted only from the same authenticated account that recorded the corresponding clock-in. Managers can download a CSV from `GET /api/attendance/export?period=daily|weekly|monthly|annual&date=YYYY-MM-DD`; `date` selects the day or anchors the containing period. The export includes clock-in/out timestamps and the responsible account names, and is department-scoped for department managers.

`POST /api/data` replaces the current dataset transactionally. The API sanitizes text, validates phone numbers and positive pen capacities, checks departments and pen ownership, and rejects unknown staff or pen references with HTTP 400.

SQLite foreign keys are enabled. Staff and duties reference pens with `ON DELETE SET NULL`; duties reference staff with `ON DELETE SET NULL`.

## Checks

```bash
npm test
npm run lint
npm run build
```
