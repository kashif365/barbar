# MASTER PROJECT PROMPT: THE SHEHRAZ BARBER

## 1. YOUR ROLE

Act as a senior full-stack MERN developer, UI/UX designer, database architect, security engineer, and software tester.

Your task is to design and develop a complete, modern, production-minded, fully responsive web application for a real barber shop named **The Shehraz Barber**.

Do not create just a static landing page, frontend mockup, or non-functional dashboard. Build a functional full-stack application with a working database, authentication, APIs, digital token management, shared queue, role-based dashboards, and real-time updates.

Use professional software engineering practices, reusable components, clean architecture, and maintainable code.

If you have access to a coding workspace, inspect the existing project before modifying it. Preserve useful existing code and assets.

If the project is empty, initialize it properly.

Do not merely explain how to implement the application. Implement it. If the environment requires manual setup, provide precise commands and configuration instructions.

---

## 2. PROJECT OVERVIEW

Project name: The Shehraz Barber

Business type: Men's barber shop / salon

Primary objective:

Replace the traditional paper-based token system with a digital queue management system.

Currently, customers receive manually written token slips and wait for their turn. This process can be inefficient, difficult to track, and inconvenient for both customers and barbers.

The application must digitize this process.

The system must support:

1. Customers generating tokens online.
2. Staff generating tokens for walk-in customers at the salon.
3. Both types of tokens entering the same shared queue.
4. Barbers viewing and managing the queue.
5. Customers checking their token status.
6. Owners managing services, prices, staff, and reports.
7. Real-time updates across connected devices.
8. A responsive experience on mobile, tablet, laptop, and desktop.

The initial release is for one salon. However, structure the architecture so that multiple salons can be supported in the future without a complete rewrite.

Currency: PKR (Pakistani Rupees).

Timezone: Asia/Karachi for salon business operations.

---

## 3. TECHNOLOGY STACK

Use the MERN stack.

### Frontend

- React.js
- Vite
- TypeScript
- React Router
- Tailwind CSS
- A consistent component library or reusable custom components
- Lucide React for icons
- Axios for API requests
- Socket.IO Client for real-time queue updates
- React Hook Form and Zod for form validation
- A suitable lightweight state-management approach, such as Context API for authentication and shared application state

Use strict TypeScript wherever practical.

Avoid using `any` unless absolutely necessary.

### Backend

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- Socket.IO
- Zod for request validation
- Secure password hashing using bcrypt or Argon2
- Secure authentication using an appropriately configured session or short-lived access-token strategy with refresh-token rotation if using JWT
- Helmet
- CORS configured for explicitly allowed frontend origins
- Rate limiting
- Centralized error handling

### Database

Use MongoDB Atlas for cloud hosting or a local MongoDB installation during development.

### Deployment

Prepare the application for deployment using:

- Vercel or another suitable static frontend host
- Render or another suitable Node.js backend host
- MongoDB Atlas for the database

Use environment variables for all credentials, database URLs, secrets, and service URLs.

Never commit `.env` files, database credentials, or production secrets.

Provide `.env.example` files containing placeholders only.

### Project structure

Prefer a clean structure such as:

client/
  src/
    assets/
    components/
    layouts/
    pages/
    features/
    hooks/
    services/
    context/
    types/
    utils/
    routes/

server/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    sockets/
    validators/
    utils/
    types/
    app.ts
    server.ts

shared types or schemas may be introduced if useful.

Keep business logic out of route handlers wherever practical.

---

## 4. BRAND IDENTITY AND VISUAL DESIGN

Use the provided official logo image for The Shehraz Barber.

The logo is a circular monochrome barber emblem with scissors, typography, and a black background.

Do not replace the actual uploaded logo with a randomly generated barber logo.

Use the original logo asset where appropriate.

### Brand direction

Create a premium, modern, masculine, minimalist barber-shop experience.

Visual references:

- Luxury barber shops
- Premium grooming brands
- Clean editorial typography
- High-quality salon booking websites
- Modern SaaS management dashboards

### Color palette

Use a consistent palette:

- Primary background: #080808
- Secondary background: #111111
- Card background: #171717
- Primary text: #FFFFFF
- Secondary text: #A3A3A3
- Borders: #303030
- Accent: muted gold, approximately #B9A477
- Success: accessible green
- Warning: accessible amber
- Error: accessible red

Use gold sparingly for premium accents, highlights, and important calls to action.

Do not make every element gold.

Maintain accessible text contrast.

### Typography

Use a modern sans-serif typeface such as Inter or Manrope.

Headings should be bold and clear.

Use restrained letter spacing for premium section headings.

Body text must remain easy to read.

### Design rules

- Consistent spacing system.
- Consistent border radii.
- Subtle shadows.
- Clean alignment.
- Clear visual hierarchy.
- Tasteful hover and focus states.
- Smooth but restrained transitions.
- No excessive animations.
- No unnecessary gradients.
- No cluttered layouts.
- No oversized dashboard cards without purpose.
- No emoji in place of professional interface icons.
- No broken images or placeholder links.
- No horizontal scrolling on mobile.

Use skeleton loaders, empty states, error states, confirmation dialogs, and success notifications.

The interface should feel like a real premium business product, not a generic AI-generated template.

---

## 5. RESPONSIVE DESIGN REQUIREMENTS

The application must be fully responsive.

Test at these viewport widths:

- 320px
- 375px
- 390px
- 430px
- 768px
- 1024px
- 1280px
- 1440px and above

### Mobile

- Mobile-first layout.
- Collapsible navigation or mobile drawer.
- Large touch-friendly buttons.
- Minimum comfortable touch targets around 44px.
- Forms must fit within the viewport.
- Dashboard tables should become stacked cards or horizontally scrollable containers when necessary.
- No clipped dialogs.
- No overlapping text.
- No tiny action buttons.
- Queue status must be immediately visible.
- The token number must be prominent.

### Tablet

Use a responsive two-column layout where appropriate.

Dashboards should adapt their sidebar and card layout.

### Desktop

Use a clean sidebar and top navigation for dashboards.

Use a centered maximum-width container for the public website.

Do not stretch text content across excessively wide screens.

Implement and test responsive behavior for all important pages, not only the homepage.

---

## 6. USER ROLES AND PERMISSIONS

Implement three roles:

1. Owner
2. Barber
3. Customer

Reception staff can initially be represented by an appropriately permissioned staff account if needed. Do not give every staff member owner privileges.

### Owner

The owner can:

- View the complete dashboard.
- View all tokens.
- Create walk-in tokens.
- Manage services and prices.
- Add, edit, activate, or deactivate barbers.
- View queue status.
- Reassign eligible waiting tokens.
- Cancel tokens.
- View daily and monthly reports.
- Record payments.
- Configure basic salon settings.
- View audit information for important administrative actions.

### Barber

The barber can:

- Log in securely.
- View their assigned or eligible queue.
- Call the next eligible customer.
- Start a service.
- Complete a service.
- Mark an absent customer as skipped.
- View their current service.
- Change their availability if authorized.
- View relevant daily service history.

The barber must not be able to change owner credentials, modify system security settings, or access unauthorized financial or staff-management functions.

### Customer

Customers should not need to create an account just to obtain a token.

A customer can:

- Browse salon services and prices.
- Generate an online token.
- Receive a token confirmation.
- View their own token status through a secure tracking mechanism.
- See queue position and estimated waiting time.
- Cancel their own eligible waiting token, subject to business rules.

A customer must never be able to access another customer's private information by changing a token ID in the URL.

Public token tracking must use an unguessable tracking token or another secure mechanism, not an easily enumerable database ID.

Never expose private customer phone numbers in public queue data.

---

## 7. PUBLIC WEBSITE PAGES

Create the following pages.

### A. Homepage

Route: `/`

Include:

1. Premium hero section.
2. Official salon logo.
3. Salon name: The Shehraz Barber.
4. Short, professional introduction.
5. Primary CTA: "Get Your Token".
6. Secondary CTA: "Explore Services".
7. Services preview.
8. How the digital token system works.
9. Queue tracking explanation.
10. Salon information section.
11. Footer with navigation and contact placeholders.

Do not invent an address, telephone number, opening hours, reviews, or social media statistics.

Use clearly marked configurable placeholders where real information is unavailable.

If the official Instagram URL is included, use:

https://www.instagram.com/the_shehraz_barber/

Do not scrape or reproduce Instagram content without authorization.

### B. Services page

Route: `/services`

Display active services with:

- Service name
- Description
- Price
- Estimated duration
- Booking action
- Demo-price indicator when applicable

Prices must come from the backend, not be hardcoded independently throughout the frontend.

### C. Token booking page

Route: `/book`

Create a mobile-friendly, multi-step booking form.

Step 1: Select a service.

Step 2: Choose a barber or "First Available", if enabled.

Step 3: Enter the customer's name.

Step 4: Enter a phone number only if required by the salon's final policy.

Step 5: Review service, price, and salon rules.

Step 6: Confirm and create the token.

Show field-level validation messages.

Prevent accidental duplicate submissions by disabling the submit button while the request is in progress and using server-side idempotency.

After successful creation, navigate to the confirmation page.

Do not show a fabricated token before the backend confirms creation.

### D. Token confirmation page

Route: `/token/:trackingToken`

Show:

- Token number
- Service name
- Price snapshot
- Booking source
- Creation time
- Current status
- Queue position
- Estimated waiting time
- Refresh or live-update indicator
- Cancellation option when allowed

Do not display the customer's full phone number.

Provide an easy way to reopen the tracking page.

Make it clear that estimated waiting time is approximate.

### E. Live queue page

Route: `/queue`

Display a public-safe view of the current queue.

Show:

- Current token being served
- Waiting token numbers
- Queue counts
- Relevant status indicators

Do not display customer phone numbers, private notes, or sensitive information.

If the owner prefers a privacy-preserving display, use token numbers only.

### F. Authentication page

Route: `/login`

Create a professional login page for the owner and staff.

Use server-side authentication and authorization.

Do not implement fake login buttons or hardcoded production credentials.

Provide a development-only seeding mechanism for creating the initial owner account securely.

---

## 8. OWNER DASHBOARD

Route: `/owner`

Use a professional dashboard layout with a responsive sidebar.

### Dashboard overview

Display:

- Today's total tokens.
- Waiting customers.
- Customers currently being served.
- Completed services.
- Cancelled and skipped tokens.
- Recorded revenue.
- Popular services.
- Barber availability.

Every metric must come from real API/database data.

Do not use fabricated numbers in the production dashboard.

### Queue management

The owner can:

- View all tokens.
- Filter by status.
- Search by token number.
- Filter by source: online or walk-in.
- View service details.
- Reassign waiting tokens if allowed.
- Cancel eligible tokens.
- Create walk-in tokens.

### Service management

The owner can:

- Add services.
- Edit service names.
- Edit descriptions.
- Set prices in PKR.
- Set estimated durations.
- Activate or deactivate services.
- Mark prices as confirmed or demo.
- Preview how services appear on the public website.

Never modify historical booking price snapshots when a service price changes.

### Barber management

The owner can:

- Add barber accounts.
- Assign services or service capabilities where required.
- Activate or deactivate barbers.
- Change availability.
- Review daily service counts.

Do not expose password hashes or private authentication data in API responses.

### Reports

Include:

- Daily service count.
- Daily recorded revenue.
- Monthly recorded revenue.
- Service popularity.
- Token source breakdown.
- Cancelled and skipped counts.
- Barber-level completed service counts.

Use date filters and clear labels.

Revenue must be based on actual recorded payment transactions or explicitly labelled business rules, not merely the number of completed tokens.

Export to CSV may be included if practical.

---

## 9. BARBER DASHBOARD

Route: `/barber`

Keep this interface extremely simple and fast to use.

### Main sections

1. Current customer.
2. Next eligible customer.
3. Waiting queue.
4. Completed services today.
5. Barber availability.

### Actions

- Call Next.
- Start Service.
- Complete Service.
- Skip Customer.
- Mark as No-Show.
- Set Available or On Break.

Use a confirmation dialog for destructive actions.

Show loading states during API requests.

Prevent repeated clicks from creating invalid state transitions.

A barber must not start two active services simultaneously unless the business explicitly supports that behavior.

If multiple barbers are enabled, define and enforce whether tokens are assigned to a particular barber or remain unassigned until called.

---

## 10. FINAL QUEUE POLICY

The queue must be shared by online and walk-in customers.

Both token sources must use the same backend token creation service.

### Default ordering policy

Use first-in, first-out ordering based on the server-generated `createdAt` timestamp, with a deterministic tie-breaker.

Do not allow online customers to receive automatic priority merely because they booked online.

If the salon later introduces scheduled appointments or priority services, implement them as explicit business rules.

### Token numbering

Use the daily format:

A-001, A-002, A-003, and so on.

The token counter resets for each salon business date.

For the initial one-salon version, use one shared daily counter.

When expanding to multiple salons, scope counters by salon ID and business date.

Generate token numbers exclusively on the server.

Never trust a token number supplied by the client.

Prevent duplicate tokens using MongoDB atomic operations and unique indexes.

Handle concurrent token requests safely.

If token creation requires several dependent database writes, use a MongoDB transaction where supported, or design a recoverable atomic workflow.

### Token statuses

Implement:

- `Waiting`
- `In Service`
- `Completed`
- `Skipped`
- `Cancelled`

Allowed transitions must be validated on the backend.

Examples:

Waiting -> In Service

Waiting -> Skipped

Waiting -> Cancelled

Skipped -> Waiting only through an explicitly authorized requeue operation

In Service -> Completed

In Service -> Waiting only through an explicitly authorized recovery operation

Completed tokens must not be accidentally reopened by ordinary users.

Cancelled tokens must not be silently reused.

### Queue position

Calculate queue position from current eligible waiting tokens.

Do not persist a permanent queue position on each token because positions change when tokens are completed, skipped, or cancelled.

Use a consistent definition of queue position across the customer tracking page and staff dashboard.

### Estimated waiting time

Estimate waiting time using service durations and relevant barber availability.

Label it "Estimated wait".

Account for the current service in progress and eligible customers ahead in the queue.

When the estimate cannot be calculated reliably, show a sensible message rather than a fabricated precise value.

---

## 11. CONFIRMED SERVICES AND PRICES

All prices are in Pakistani Rupees.

Seed these services:

### Confirmed prices

1. Haircut — PKR 500
2. Haircut + Beard — PKR 750
3. Facial — PKR 500

These three prices are confirmed by the project owner.

Set `isDemoPrice: false` for these records.

### Temporary demo prices

4. Beard Trim — PKR 250
5. Hair Wash — PKR 200
6. Hair Styling — PKR 300
7. Face Cleanup — PKR 400

These additional prices are illustrative only.

Set `isDemoPrice: true` for these records.

Display a clear "Demo Price — Confirm with salon" label where demo prices appear, or allow the owner to keep unconfirmed services unpublished.

Do not represent demo prices as verified salon prices.

Allow the owner to update prices through the dashboard.

### Duration estimates

Use configurable estimated durations for the initial demo:

- Haircut: 30 minutes
- Haircut + Beard: 45 minutes
- Facial: 30 minutes
- Beard Trim: 15 minutes
- Hair Wash: 15 minutes
- Hair Styling: 20 minutes
- Face Cleanup: 20 minutes

Mark these as initial estimates, not confirmed operating facts.

Allow the owner to change durations.

---

## 12. MONGODB DATA MODELS

Implement proper Mongoose schemas, validation, timestamps, and indexes.

### A. Service

Fields:

- `name`
- `description`
- `price`
- `currency`, default `PKR`
- `durationMinutes`
- `isActive`
- `isDemoPrice`
- `createdAt`
- `updatedAt`

Validate price as a non-negative number and duration as a positive integer.

### B. User

Fields:

- `name`
- `email`
- `passwordHash`
- `role`: owner, barber, or staff
- `isActive`
- Optional barber-specific information
- `createdAt`
- `updatedAt`

Normalize email addresses.

Hash passwords securely.

Never return password hashes from public API responses.

### C. Customer

Fields:

- `name`
- Optional phone number
- `createdAt`
- `updatedAt`

Avoid collecting unnecessary personal information.

### D. Token

Fields:

- `tokenNumber`
- `businessDate`
- `customerId`, optional where appropriate
- `customerName`
- `serviceId`
- `serviceName`
- `priceAtBooking`
- `currency`
- `durationMinutesAtBooking`
- `source`: online or walk-in
- `status`
- `barberId`, nullable
- `createdAt`
- `startedAt`, nullable
- `completedAt`, nullable
- `cancelledAt`, nullable
- Optional `skippedAt`
- A securely generated public tracking token or hash-based tracking mechanism
- Optional idempotency key
- `updatedAt`

Snapshot the service name, price, and duration at booking time.

Do not change historical booking details when service settings change.

Ensure token tracking credentials cannot be easily guessed.

### E. DailyCounter

Fields:

- `businessDate`
- `lastNumber`
- `createdAt`
- `updatedAt`

Create a unique index on `businessDate` for the initial single-salon version.

Use atomic increments to generate sequential numbers.

### F. Payment

Create a separate payment collection if payment recording is implemented.

Fields:

- `tokenId`
- `amount`
- `currency`
- `method`, such as cash or another explicitly supported method
- `status`
- `recordedBy`
- `paidAt`
- `createdAt`

For the MVP, cash-payment recording is sufficient.

Do not integrate online payment gateways unless separately requested.

Ensure payment records cannot be duplicated by repeated requests.

### Required indexes

Create appropriate indexes for:

- Unique daily token numbering.
- Daily queue queries.
- Token status filtering.
- Service lookup.
- User email uniqueness.
- Secure idempotent token creation.
- Payment lookup by token.

Use unique indexes where business rules require uniqueness.

Handle MongoDB duplicate-key errors gracefully.

---

## 13. REQUIRED API ENDPOINTS

Use the base prefix `/api`.

Return consistent JSON responses and meaningful HTTP status codes.

### Public service APIs

GET `/api/services`

Return active public services and their prices.

GET `/api/services/:id`

Return a specific active service if public access is allowed.

### Public queue APIs

GET `/api/queue/today`

Return a privacy-safe view of today's queue.

Do not expose private customer information.

### Customer token APIs

POST `/api/tokens/online`

Create an online token.

GET `/api/tokens/:trackingToken`

Return the status of a token using a secure, unguessable tracking credential.

PATCH `/api/tokens/:trackingToken/cancel`

Cancel an eligible waiting token, subject to authorization and business rules.

### Authentication APIs

POST `/api/auth/login`

POST `/api/auth/logout`

GET `/api/auth/me`

Implement secure session or access-token handling.

If using cookies, configure HttpOnly, Secure in production, SameSite, appropriate cookie scope, and CSRF protection where applicable.

Do not store long-lived sensitive tokens in localStorage.

### Staff APIs

POST `/api/staff/tokens/walk-in`

Create a walk-in token. Restrict to authorized staff.

GET `/api/staff/queue`

Return the staff queue view.

POST `/api/staff/queue/call-next`

Atomically claim and start the next eligible token.

PATCH `/api/staff/tokens/:id/start`

Start an eligible token when separate call and start actions are required.

PATCH `/api/staff/tokens/:id/complete`

Complete a token currently in service.

PATCH `/api/staff/tokens/:id/skip`

Skip a waiting customer.

PATCH `/api/staff/tokens/:id/cancel`

Cancel an eligible token if the role has permission.

PATCH `/api/staff/availability`

Update the current barber's availability.

### Owner APIs

GET `/api/owner/dashboard`

GET `/api/owner/tokens`

GET `/api/owner/reports/daily`

GET `/api/owner/reports/monthly`

POST `/api/owner/services`

PATCH `/api/owner/services/:id`

DELETE `/api/owner/services/:id`

Prefer soft deactivation of services referenced by historical tokens instead of destructive deletion.

POST `/api/owner/barbers`

GET `/api/owner/barbers`

PATCH `/api/owner/barbers/:id`

PATCH `/api/owner/tokens/:id/reassign`

POST `/api/owner/tokens/:id/payment`

Add pagination and appropriate filters to list endpoints.

Validate all request bodies and route parameters.

Implement authentication, authorization, and input validation for every protected endpoint.

Never rely only on hiding frontend buttons for security.

---

## 14. REAL-TIME UPDATES WITH SOCKET.IO

Implement real-time updates for queue changes.

Required event concepts:

- `queue:updated`
- `token:created`
- `token:called`
- `token:completed`
- `token:skipped`
- `token:cancelled`

Use authenticated Socket.IO connections for private staff events.

Public queue events must contain only public-safe data.

Do not broadcast phone numbers, private customer notes, authentication tokens, or password-related data.

After a successful database mutation, emit the appropriate update.

Do not emit success events before the database operation succeeds.

The frontend should:

- Subscribe to appropriate queue updates.
- Refresh or reconcile queue data when events arrive.
- Handle temporary disconnections.
- Reconnect automatically.
- Refetch authoritative state after reconnecting.

MongoDB remains the source of truth. Socket.IO is a notification and synchronization mechanism, not the permanent storage layer.

---

## 15. AUTHENTICATION AND SECURITY

Security is a mandatory part of the implementation.

Implement:

1. Password hashing.
2. Server-side role-based authorization.
3. Input validation.
4. Rate limiting for login and public token creation.
5. Secure cookie/session or access-token handling.
6. CORS allowlisting.
7. Helmet security headers.
8. Protection against unauthorized object access.
9. Protection against NoSQL injection.
10. Safe error responses.
11. Environment-based secrets.
12. Restricted administrative endpoints.
13. Audit logging for important administrative actions.
14. Idempotent handling of duplicate booking submissions.
15. Server-side price validation.
16. Safe handling of concurrent token creation and service transitions.

Public customers must not be able to:

- Create owner accounts.
- Change token prices.
- Choose arbitrary token numbers.
- Complete services.
- Reassign tokens.
- View private customer information.
- Access owner reports.

Create an initial owner through a secure seed script or controlled setup process.

Never include hardcoded production credentials.

---

## 16. PAYMENTS AND REVENUE

For the MVP, payment recording is sufficient.

Do not integrate a payment gateway by default.

When a barber completes a service, the token becomes Completed, but payment must be tracked separately.

The owner or authorized staff can record:

- Amount received.
- Payment method.
- Payment status.
- Recording user.
- Payment time.

Do not assume that every completed service has been paid for.

Do not count cancelled tokens as revenue.

If partial payments or refunds are not implemented, clearly document that limitation.

Revenue reports must use actual payment records according to a documented accounting rule.

---

## 17. ERROR HANDLING AND USER EXPERIENCE

Implement:

- Loading indicators.
- Skeleton loaders where appropriate.
- Empty states.
- Error messages.
- Success notifications.
- Retry options for recoverable failures.
- Confirmation dialogs.
- Form validation.
- Duplicate-submission prevention.
- Friendly network error messages.
- Accessible keyboard navigation.
- Focus indicators.
- Screen-reader labels where appropriate.

Examples:

If no tokens exist:

"No customers are waiting right now."

If token creation fails:

"We couldn't create your token. Please try again."

If the salon is closed:

"The salon is currently closed. Please try again during operating hours."

Salon opening hours must be configurable. Do not invent confirmed business hours.

If a service is deactivated while a customer is booking, the backend must reject the booking and return a helpful error.

---

## 18. BUSINESS RULES AND EDGE CASES

Handle these cases explicitly:

1. Two customers request tokens simultaneously.
2. A customer submits the booking form twice.
3. A customer refreshes the confirmation page.
4. A barber clicks Call Next repeatedly.
5. Two barbers try to claim the same token.
6. A service is deactivated while a booking is being submitted.
7. A customer cancels while a staff member is trying to start the token.
8. The network disconnects during a service update.
9. A barber becomes unavailable while waiting tokens remain assigned to them.
10. The salon crosses midnight in Asia/Karachi.
11. A token is created close to the business-day boundary.
12. A customer loses the tracking URL.
13. An invalid or expired session attempts a protected operation.
14. The database is temporarily unavailable.
15. A duplicate payment request is received.
16. A barber account is deactivated while logged in.
17. A waiting token needs reassignment.
18. A skipped customer returns and requests re-entry.

Use atomic state transitions or other appropriate concurrency controls so that a token cannot be claimed or completed incorrectly.

Define the business-date calculation using the configured salon timezone, not the server's arbitrary timezone.

For the initial version, tokens should belong to the salon's configured business date.

Document how tokens created after midnight are handled.

---

## 19. TESTING REQUIREMENTS

Write automated tests for important business logic.

Use an appropriate testing framework such as Vitest or Jest and Supertest for APIs.

At minimum, test:

### Token generation

- First token of a business day.
- Sequential token numbering.
- Counter reset on a new business date.
- Concurrent token requests.
- Duplicate token prevention.
- Duplicate submission prevention.

### Queue management

- Online and walk-in tokens enter the same queue.
- First-in, first-out ordering.
- Call Next claims the correct token.
- Two staff members cannot claim the same token.
- Invalid state transitions are rejected.
- Completed tokens leave the waiting queue.
- Cancelled tokens leave the eligible queue.
- Skipped-token re-entry follows the defined rules.

### Authorization

- Customers cannot call or complete tokens.
- Barbers cannot access owner-only endpoints.
- Unauthenticated users cannot access protected staff routes.
- One customer's tracking credential cannot access another token.
- Private customer information is excluded from public responses.

### Services and prices

- Confirmed prices are seeded correctly.
- Demo prices are clearly marked.
- Inactive services cannot be booked.
- Historical price snapshots remain unchanged.

### Payments

- Duplicate payment recording is prevented.
- Cancelled tokens do not count as revenue.
- Unpaid completed services are not counted as paid revenue.

### Responsive UI

Test the major pages on mobile, tablet, and desktop.

Check for horizontal overflow, clipped dialogs, inaccessible buttons, and broken navigation.

If browser automation is available, use Playwright for critical end-to-end flows.

---

## 20. DEVELOPMENT AND SEED DATA

Create a seed script that inserts:

The Shehraz Barber's initial services.

Confirmed prices:

- Haircut: PKR 500
- Haircut + Beard: PKR 750
- Facial: PKR 500

Demo services:

- Beard Trim: PKR 250
- Hair Wash: PKR 200
- Hair Styling: PKR 300
- Face Cleanup: PKR 400

Use `isDemoPrice: false` for the confirmed services and `isDemoPrice: true` for demo prices.

Set the initial durations from the configuration described in this specification.

Create the owner account through a secure environment-based seed process.

Do not automatically create predictable production passwords.

Provide optional development seed data for testing queue states, but keep demo records distinguishable from real records.

Do not fabricate real customers, verified reviews, business addresses, opening hours, or contact information.

---

## 21. DEPLOYMENT REQUIREMENTS

Prepare the project for deployment.

Provide:

- Frontend build configuration.
- Backend production start script.
- Environment variable examples.
- MongoDB connection configuration.
- CORS configuration.
- Health-check endpoint, such as `/api/health`.
- Production error handling.
- Logging that does not leak secrets.
- Database backup recommendations.
- Deployment instructions.
- Instructions for setting up the first owner account.

Example environment variables:

Frontend:

`VITE_API_BASE_URL=`

`VITE_SOCKET_URL=`

Backend:

`NODE_ENV=`

`PORT=`

`MONGODB_URI=`

`CLIENT_ORIGIN=`

`SESSION_SECRET=`

Use the actual authentication strategy chosen by the implementation. Add other required variables only when needed.

Never put MongoDB credentials or backend secrets in frontend environment variables.

Document how to run both applications locally.

The project should run using clearly documented commands.

For example:

- Install dependencies.
- Configure environment variables.
- Start the backend.
- Start the frontend.
- Seed initial data.
- Run tests.
- Build for production.

Do not claim the application is deployed unless deployment has actually been completed.

---

## 22. IMPLEMENTATION PRIORITIES

Build the application in these phases.

### Phase 1: Foundation

- Set up frontend and backend.
- Configure MongoDB.
- Build shared layouts and responsive navigation.
- Create service models and seed data.

### Phase 2: Authentication

- Implement login.
- Create owner and barber roles.
- Implement protected routes and backend authorization.

### Phase 3: Digital token system

- Implement safe token numbering.
- Implement online token creation.
- Implement walk-in token creation.
- Put both sources into the same queue.
- Implement token tracking.

### Phase 4: Barber dashboard

- Queue view.
- Call Next.
- Start Service.
- Complete Service.
- Skip and Cancel operations.
- Availability management.

### Phase 5: Owner dashboard

- Metrics.
- Service management.
- Barber management.
- Queue management.
- Payment recording.
- Reports.

### Phase 6: Real-time functionality

- Socket.IO integration.
- Reconnection handling.
- Live queue updates.
- Consistency between frontend and database.

### Phase 7: Quality assurance

- Automated tests.
- Security review.
- Responsive testing.
- Edge-case handling.
- Performance improvements.

### Phase 8: Deployment

- Production configuration.
- Hosting instructions.
- Database backup strategy.
- Initial owner setup.
- Final documentation.

Prioritize a fully working token-to-completion workflow before adding optional features.

---

## 23. ACCEPTANCE CRITERIA

The application is considered ready for an initial pilot only when:

1. The official salon logo appears correctly.
2. The public website is responsive.
3. Confirmed prices display correctly.
4. Demo prices are clearly identified.
5. Customers can obtain online tokens.
6. Staff can create walk-in tokens.
7. Both token sources use the same queue.
8. Token numbers are unique for the business date.
9. Concurrent requests are handled safely.
10. Barbers can call and complete tokens.
11. Queue changes appear in real time.
12. Customers can securely track their own tokens.
13. Owners can manage services and barbers.
14. Recorded payments are stored separately from service completion.
15. Reports use actual stored data.
16. Authentication and role permissions are enforced on the server.
17. Important business logic has automated tests.
18. The UI works on mobile, tablet, and desktop.
19. No real credentials or secrets are committed.
20. Setup and deployment instructions are complete.

---

## 24. HOW YOU SHOULD WORK

Follow these instructions during development:

1. First inspect the current workspace and available tools.
2. Summarize the implementation plan briefly.
3. Identify missing prerequisites, but do not block progress on nonessential information.
4. Implement the application in small, logical phases.
5. Create real files and functional code, not only examples or pseudocode.
6. Keep frontend and backend API contracts consistent.
7. Run available tests and builds.
8. Fix errors you discover.
9. Never claim that a feature works unless it has been implemented and appropriately tested.
10. If a required external service or deployment credential is unavailable, implement what can be completed locally and explain the remaining manual setup.
11. Do not silently omit security, validation, or concurrency requirements.
12. Do not replace the requested MERN stack with another stack without permission.
13. Do not add expensive paid integrations by default.
14. Do not invent salon information.
15. Keep the code understandable for a developer who may maintain it later.

At the end, provide:

- Project structure.
- Implemented features.
- Important architectural decisions.
- Database models and indexes.
- API endpoint documentation.
- Environment variable instructions.
- Local setup commands.
- Seed instructions.
- Test commands and results.
- Deployment guide.
- Known limitations and future improvements.

**Start by inspecting the workspace, then implement the project. Do not stop after producing a design plan or a static frontend.**