# 🚀 EMS — Step-by-Step Build Roadmap + Prompts

> Follow this in order. Each step builds on the previous one.
> Copy the **prompt** into Claude/AI to generate the code for that step.

---

## PHASE 1 — 🔐 Authentication

---

### ✅ STEP 1 — Spring Boot Project Setup

**What to do:**
- Create Spring Boot project via [start.spring.io](https://start.spring.io)
- Add all dependencies from `03_DEPENDENCIES.md`
- Configure `application.properties`
- Create the MySQL database `event_db`

**Prompt:**
```
Set up a Spring Boot project called "authify" with package "com.jafran.authify".
Configure application.properties for:
- MySQL database named event_db
- JWT secret and expiry (access: 15min, refresh: 7days)
- Gmail SMTP for email sending
Show the full application.properties file.
```

---

### ✅ STEP 2 — Database Tables (MySQL)

**What to do:**
- Create all 8 tables from `02_PROJECT_STRUCTURE.md`
- Run SQL scripts in MySQL Workbench or terminal

**Prompt:**
```
Write MySQL CREATE TABLE scripts for an Event Management System with these tables:
users, otp_verifications, refresh_tokens, categories (with parent_id for sub-categories),
events (with ENUM status: PENDING/APPROVED/REJECTED/CANCELLED),
event_conflicts, event_attendees, notifications.
Include all foreign key relationships.
```

---

### ✅ STEP 3 — JPA Entities (Backend)

**What to do:**
- Create entity classes in `entity/` package
- Use Lombok annotations

**Prompt:**
```
Create JPA entity classes for a Spring Boot Event Management System:
- User.java (id, name, email, password, role ENUM[ADMIN,STUDENT], isVerified, createdAt)
- OtpVerification.java (id, email, otp, expiresAt, isUsed, type ENUM[REGISTER,RESET_PASSWORD])
- RefreshToken.java (id, userId FK, token, expiresAt)
- Category.java (id, name, parentId self-reference FK, createdBy FK to user)
- Event.java (id, title, description, userId FK, categoryId FK, venue, startTime, endTime, status ENUM, rejectReason)
- EventConflict.java (id, eventId FK, conflictWith FK)
- EventAttendee.java (id, eventId FK, userId FK)
- Notification.java (id, userId FK, message, type ENUM, isRead)
Use Lombok @Data, @Builder, @Entity, @Table. Use LocalDateTime for timestamps.
```

---

### ✅ STEP 4 — Enums

**What to do:**
- Create enum classes in `enums/` package

**Prompt:**
```
Create Java enum classes for a Spring Boot project:
- Role.java → ADMIN, STUDENT
- EventStatus.java → PENDING, APPROVED, REJECTED, CANCELLED
- OtpType.java → REGISTER, RESET_PASSWORD
- NotificationType.java → EVENT_APPROVED, EVENT_REJECTED, CONFLICT, REMINDER, GENERAL
```

---

### ✅ STEP 5 — Repositories

**What to do:**
- Create JPA Repository interfaces in `repository/` package

**Prompt:**
```
Create Spring Data JPA Repository interfaces for:
- UserRepository → findByEmail(String email)
- OtpRepository → findByEmailAndOtpAndIsUsedFalse(...), deleteByEmail(...)
- RefreshTokenRepository → findByToken(...), deleteByUserId(...)
- CategoryRepository → findByParentIdIsNull(), findByParentId(Long parentId)
- EventRepository → findByUserId(...), findByStatus(...),
  and a custom query to find conflicting events:
  WHERE venue = :venue AND status = 'APPROVED'
  AND startTime < :endTime AND endTime > :startTime
- EventConflictRepository → findByEventId(...)
- NotificationRepository → findByUserIdOrderByCreatedAtDesc(...)
```

---

### ✅ STEP 6 — JWT Service (Backend)

**What to do:**
- Create `JwtService.java` in `service/` package
- Create `JwtRequestFilter.java` in `filter/` package

**Prompt:**
```
Create a JwtService.java in Spring Boot using jjwt 0.11.5 library that:
- Generates an access token (15 min expiry) with email and role as claims
- Generates a refresh token (7 days expiry)
- Validates a token (checks signature + expiry)
- Extracts email from token
- Extracts role from token
Read jwt.secret, jwt.access-token-expiry, jwt.refresh-token-expiry from application.properties.

Also create JwtRequestFilter.java that:
- Extends OncePerRequestFilter
- Reads the Authorization header
- Validates the JWT token using JwtService
- Sets authentication in SecurityContextHolder if valid
```

---

### ✅ STEP 7 — Security Config (Backend)

**What to do:**
- Create `SecurityConfig.java` in `config/` package

**Prompt:**
```
Create SecurityConfig.java for Spring Boot with Spring Security that:
- Disables CSRF
- Allows CORS from http://localhost:3000
- Permits /auth/** routes without authentication
- Requires authentication for all other routes
- Sets session to STATELESS
- Adds JwtRequestFilter before UsernamePasswordAuthenticationFilter
- Creates PasswordEncoder bean (BCrypt)
- Creates AuthenticationManager bean using DaoAuthenticationProvider
- Creates AppUserDetailsService that implements UserDetailsService
  and loads user by email from UserRepository
Use @RequiredArgsConstructor from Lombok.
```

---

### ✅ STEP 8 — DTOs (Request & Response)

**What to do:**
- Create DTO classes in `dto/request/` and `dto/response/`

**Prompt:**
```
Create DTO classes for Spring Boot Event Management System:

Request DTOs (use @NotBlank, @Email, @Size validation):
- RegisterRequest.java → name, email, password
- LoginRequest.java → email, password
- VerifyOtpRequest.java → email, otp
- ResetPasswordRequest.java → email, otp, newPassword
- CategoryRequest.java → name
- EventRequest.java → title, description, categoryId, venue, startTime, endTime

Response DTOs:
- AuthResponse.java → accessToken, refreshToken, role, email
- CategoryResponse.java → id, name, parentId, subCategories(List)
- EventResponse.java → id, title, venue, startTime, endTime, status, categoryName, createdByName
- NotificationResponse.java → id, message, type, isRead, createdAt
```

---

### ✅ STEP 9 — OTP & Email Service (Backend)

**What to do:**
- Create `OtpService.java` and `EmailService.java`

**Prompt:**
```
Create two Spring Boot services:

1. OtpService.java:
- generateOtp() → returns random 6-digit string
- saveOtp(email, otp, type) → saves to otp_verifications table with 10min expiry
- validateOtp(email, otp, type) → checks DB, marks as used, throws exception if invalid/expired

2. EmailService.java using JavaMailSender:
- sendOtpEmail(email, otp) → sends HTML email with OTP for registration
- sendPasswordResetEmail(email, otp) → sends HTML email with OTP for reset
- sendEventApprovedEmail(email, eventTitle) → notifies student
- sendEventRejectedEmail(email, eventTitle, reason) → notifies student
- sendConflictAlertEmail(adminEmail, event1Title, event2Title) → notifies admin
Use @Async on all email methods for non-blocking behavior.
```

---

### ✅ STEP 10 — Auth Service & Controller (Backend)

**What to do:**
- Create `AuthService.java` and `AuthController.java`

**Prompt:**
```
Create AuthService.java and AuthController.java for Spring Boot:

AuthService methods:
- register(RegisterRequest) → saves user (isVerified=false), generates OTP, sends email
- verifyOtp(VerifyOtpRequest) → validates OTP, sets isVerified=true
- login(LoginRequest) → authenticates, generates JWT access + refresh token, returns AuthResponse
- refreshToken(String token) → validates refresh token, issues new access token
- sendResetOtp(String email) → generates and sends OTP for password reset
- resetPassword(ResetPasswordRequest) → validates OTP, updates hashed password

AuthController endpoints:
POST /auth/register
POST /auth/verify-otp
POST /auth/login
POST /auth/refresh-token
POST /auth/send-reset-otp
POST /auth/reset-password

Use GlobalExceptionHandler with @ControllerAdvice to handle exceptions cleanly.
```

---

## PHASE 2 — 🗂️ Categories

---

### ✅ STEP 11 — Category Service & Controller (Backend)

**Prompt:**
```
Create CategoryService.java and CategoryController.java for Spring Boot:

CategoryService methods:
- createMainCategory(CategoryRequest, adminId) → saves with parentId = null
- createSubCategory(CategoryRequest, parentId, adminId) → saves with given parentId
- getAllMainCategories() → returns list of CategoryResponse with nested subCategories
- getSubCategories(parentId) → returns list of sub categories
- deleteCategory(id) → deletes if no events linked

CategoryController (all admin-only endpoints):
POST  /categories              → create main category
GET   /categories              → get all with sub categories
POST  /categories/{id}/sub     → create sub category
GET   /categories/{id}/sub     → get sub categories
DELETE /categories/{id}        → delete category

Use @PreAuthorize("hasRole('ADMIN')") for protection.
```

---

## PHASE 3 — 📅 Events + Conflict Detection

---

### ✅ STEP 12 — Conflict Detection Service (Backend)

**Prompt:**
```
Create ConflictService.java in Spring Boot:
- detectConflict(EventRequest newEvent) → queries EventRepository for any APPROVED event with:
  same venue AND overlapping time:
  existingEvent.startTime < newEvent.endTime AND existingEvent.endTime > newEvent.startTime
- If conflict found:
  → save to event_conflicts table
  → create notification for admin
  → send conflict alert email to admin
- Return list of conflicting events (can be empty)
```

---

### ✅ STEP 13 — Event Service & Controller (Backend)

**Prompt:**
```
Create EventService.java and EventController.java for Spring Boot:

EventService methods:
- createEvent(EventRequest, userId) → saves with PENDING status, calls ConflictService.detectConflict()
- getEvents(status filter, category filter) → returns filtered list
- getEventById(id) → returns EventResponse
- approveEvent(eventId, adminId) → sets status to APPROVED, notifies student via email + in-app notification
- rejectEvent(eventId, reason, adminId) → sets status to REJECTED, notifies student
- getConflicts() → returns all records from event_conflicts table (admin only)
- attendEvent(eventId, userId) → adds to event_attendees table

EventController:
POST  /events                    → student creates (STUDENT role)
GET   /events                    → list with optional filters
GET   /events/{id}               → event detail
PATCH /events/{id}/approve       → admin only
PATCH /events/{id}/reject        → admin only
GET   /admin/conflicts           → admin only
POST  /events/{id}/attend        → student only
```

---

## PHASE 4 — 🔔 Notifications

---

### ✅ STEP 14 — Notification Service & Controller (Backend)

**Prompt:**
```
Create NotificationService.java and NotificationController.java:

NotificationService:
- createNotification(userId, message, type) → saves to notifications table
- getUserNotifications(userId) → returns all sorted by createdAt desc
- markAsRead(notificationId, userId) → sets isRead = true
- getUnreadCount(userId) → count of isRead=false

NotificationController:
GET   /notifications              → get my notifications (authenticated user)
PATCH /notifications/{id}/read    → mark single as read
PATCH /notifications/read-all     → mark all as read
GET   /notifications/count        → get unread count
```

---

### ✅ STEP 15 — Scheduled Reminder (Backend)

**Prompt:**
```
Create EventReminderScheduler.java in Spring Boot:
- Annotate class with @Component and @EnableScheduling (add @EnableScheduling to main class too)
- Run a scheduled task every 15 minutes using @Scheduled(fixedRate = 900000)
- Query events where startTime is between NOW() and NOW() + 1 hour and status = APPROVED
- For each such event, get all attendees from event_attendees
- Send in-app notification and email reminder to each attendee
```

---

## PHASE 5 — ⚛️ React Frontend

---

### ✅ STEP 16 — React Project Setup + Axios Interceptor

**Prompt:**
```
Set up a React project with Vite. Create axiosInstance.js that:
- Sets baseURL to http://localhost:8080
- Adds Authorization: Bearer <token> header to every request automatically
  by reading token from localStorage
- Intercepts 401 responses → calls POST /auth/refresh-token with refresh token
  → updates access token in localStorage → retries the original request
  → if refresh fails → clears localStorage → redirects to /login
```

---

### ✅ STEP 17 — Auth Context + Zustand Store

**Prompt:**
```
Create an AuthContext.jsx in React using Zustand for global state that stores:
- user (id, name, email, role)
- accessToken
- isAuthenticated
Methods:
- login(email, password) → calls POST /auth/login → stores token and user in state + localStorage
- logout() → clears state and localStorage → redirects to /login
- loadFromStorage() → on app start, reads token from localStorage, validates, restores state

Also create a ProtectedRoute.jsx component that:
- Checks if user is authenticated
- Checks if user has the required role (ADMIN or STUDENT)
- Redirects to /login if not authenticated
- Redirects to /unauthorized if wrong role
```

---

### ✅ STEP 18 — Auth Pages (Frontend)

**Prompt:**
```
Create these React pages using Tailwind CSS and react-hook-form + zod validation:

1. RegisterPage.jsx
   - Fields: name, email, password, confirm password
   - On submit → POST /auth/register → navigate to /verify-otp with email in state

2. VerifyOtpPage.jsx
   - 6-box OTP input component
   - On submit → POST /auth/verify-otp → navigate to /login
   - Resend OTP button (calls POST /auth/send-reset-otp)

3. LoginPage.jsx
   - Fields: email, password
   - On submit → calls login() from AuthContext → redirects based on role
   - Link to /register and /reset

4. ResetPasswordPage.jsx
   - Step 1: Enter email → POST /auth/send-reset-otp
   - Step 2: Enter OTP + new password → POST /auth/reset-password
   - Navigate to /login on success

Show toast notifications for success/error using react-hot-toast.
```

---

### ✅ STEP 19 — Student Pages (Frontend)

**Prompt:**
```
Create these React pages for Student role using Tailwind CSS:

1. StudentDashboard.jsx
   - Shows upcoming approved events (GET /events?status=APPROVED)
   - Shows my recent event requests (GET /events?userId=me)
   - Shows notification bell with unread count

2. CreateEventPage.jsx
   - Form: title, description, category dropdown, sub-category dropdown, venue, startTime, endTime
   - Category dropdown fetches GET /categories
   - Sub-category fetches GET /categories/{id}/sub when main category selected
   - On submit → POST /events
   - Show success toast and redirect to /my-events

3. MyEventsPage.jsx
   - List all events created by logged-in student
   - Show status badges: PENDING (yellow), APPROVED (green), REJECTED (red)
   - Show reject reason if rejected
```

---

### ✅ STEP 20 — Admin Pages (Frontend)

**Prompt:**
```
Create these React pages for Admin role using Tailwind CSS:

1. AdminDashboard.jsx
   - Stats cards: total events, pending events, conflicts count
   - Recent conflict alerts with ⚠️ badges
   - Link to manage categories and events

2. ManageCategories.jsx
   - List all main categories with their sub-categories
   - Button to add main category (modal form)
   - Button to add sub-category under each main category
   - Delete category button

3. ManageEvents.jsx
   - Table of all events with status filter
   - Approve button → PATCH /events/{id}/approve
   - Reject button → opens modal to enter reason → PATCH /events/{id}/reject
   - Shows conflict badge ⚠️ if event has a conflict

4. ConflictsPage.jsx
   - List all conflicts from GET /admin/conflicts
   - Shows both conflicting events side by side
   - Shows venue, time, submitted by
   - Approve/Reject buttons for each
```

---

### ✅ STEP 21 — Notification Bell (Frontend)

**Prompt:**
```
Create NotificationBell.jsx React component:
- Bell icon (react-icons) in Navbar
- Red badge showing unread count from GET /notifications/count
- Dropdown on click showing latest 5 notifications
- Each notification shows message, time (formatted with date-fns)
- Click notification → marks as read (PATCH /notifications/{id}/read)
- "Mark all read" button
- Poll every 30 seconds for new notifications using setInterval in useEffect
```

---

## 📋 Build Order Summary

```
PHASE 1 — Authentication
  Step 1  → Spring Boot Setup
  Step 2  → MySQL Tables
  Step 3  → JPA Entities
  Step 4  → Enums
  Step 5  → Repositories
  Step 6  → JWT Service + Filter
  Step 7  → Security Config
  Step 8  → DTOs
  Step 9  → OTP + Email Service
  Step 10 → Auth Service + Controller

PHASE 2 — Categories
  Step 11 → Category Service + Controller

PHASE 3 — Events + Conflicts
  Step 12 → Conflict Detection Service
  Step 13 → Event Service + Controller

PHASE 4 — Notifications
  Step 14 → Notification Service + Controller
  Step 15 → Scheduled Reminder

PHASE 5 — React Frontend
  Step 16 → React Setup + Axios Interceptor
  Step 17 → Auth Context + Zustand + ProtectedRoute
  Step 18 → Auth Pages (Register, OTP, Login, Reset)
  Step 19 → Student Pages (Dashboard, Create Event, My Events)
  Step 20 → Admin Pages (Dashboard, Categories, Events, Conflicts)
  Step 21 → Notification Bell Component
```

---

## 🧪 Testing Checklist

```
□ Register → receive OTP email
□ Verify OTP → account activated
□ Login → receive JWT + refresh token
□ Expired token → auto refresh works
□ Admin creates main category
□ Admin creates sub category
□ Student creates event → appears as PENDING
□ Two events same venue same time → conflict detected
□ Admin sees conflict alert
□ Admin approves event → student gets email + notification
□ Admin rejects event → student gets email with reason
□ Student attends event → reminder notification 1hr before
□ Notification bell updates in real time
```
