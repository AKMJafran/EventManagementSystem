# 📐 Full Project Structure — MySQL + Spring Boot + React

---

## 🗄️ 1. MySQL Database Structure

```sql
-- 1. USERS TABLE
CREATE TABLE users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('ADMIN', 'STUDENT') DEFAULT 'STUDENT',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. OTP VERIFICATIONS TABLE
CREATE TABLE otp_verifications (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    otp        VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used    BOOLEAN DEFAULT FALSE,
    type       ENUM('REGISTER', 'RESET_PASSWORD') NOT NULL
);

-- 3. REFRESH TOKENS TABLE
CREATE TABLE refresh_tokens (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    token      TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. CATEGORIES TABLE (Main + Sub using parentId)
CREATE TABLE categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   BIGINT DEFAULT NULL,       -- NULL = Main Category
    created_by  BIGINT NOT NULL,           -- Admin user id
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 5. EVENTS TABLE
CREATE TABLE events (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    user_id         BIGINT NOT NULL,       -- Student who created
    category_id     BIGINT NOT NULL,       -- Sub category
    venue           VARCHAR(200) NOT NULL,
    start_time      DATETIME NOT NULL,
    end_time        DATETIME NOT NULL,
    status          ENUM('PENDING','APPROVED','REJECTED','CANCELLED') DEFAULT 'PENDING',
    reject_reason   VARCHAR(255),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 6. EVENT CONFLICTS TABLE
CREATE TABLE event_conflicts (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id        BIGINT NOT NULL,       -- New event
    conflict_with   BIGINT NOT NULL,       -- Existing approved event
    detected_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (conflict_with) REFERENCES events(id)
);

-- 7. EVENT ATTENDEES TABLE
CREATE TABLE event_attendees (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id  BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    message    TEXT NOT NULL,
    type       ENUM('EVENT_APPROVED','EVENT_REJECTED','CONFLICT','REMINDER','GENERAL'),
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🍃 2. Spring Boot Project Structure

```
authify/
└── src/main/java/com/jafran/authify/
    │
    ├── 📁 config/
    │   ├── SecurityConfig.java           ← JWT filter, CORS, route permissions
    │   └── MailConfig.java               ← JavaMailSender setup
    │
    ├── 📁 filter/
    │   └── JwtRequestFilter.java         ← Intercepts every request, validates JWT
    │
    ├── 📁 entity/                        ← JPA Entities (maps to DB tables)
    │   ├── User.java
    │   ├── OtpVerification.java
    │   ├── RefreshToken.java
    │   ├── Category.java
    │   ├── Event.java
    │   ├── EventConflict.java
    │   ├── EventAttendee.java
    │   └── Notification.java
    │
    ├── 📁 enums/
    │   ├── Role.java                     ← ADMIN, STUDENT
    │   ├── EventStatus.java              ← PENDING, APPROVED, REJECTED, CANCELLED
    │   ├── OtpType.java                  ← REGISTER, RESET_PASSWORD
    │   └── NotificationType.java         ← EVENT_APPROVED, CONFLICT, REMINDER...
    │
    ├── 📁 repository/                    ← JPA Repositories (DB queries)
    │   ├── UserRepository.java
    │   ├── OtpRepository.java
    │   ├── RefreshTokenRepository.java
    │   ├── CategoryRepository.java
    │   ├── EventRepository.java
    │   ├── EventConflictRepository.java
    │   ├── EventAttendeeRepository.java
    │   └── NotificationRepository.java
    │
    ├── 📁 dto/                           ← Request & Response objects (no entity exposure)
    │   ├── request/
    │   │   ├── RegisterRequest.java
    │   │   ├── LoginRequest.java
    │   │   ├── VerifyOtpRequest.java
    │   │   ├── ResetPasswordRequest.java
    │   │   ├── CategoryRequest.java
    │   │   └── EventRequest.java
    │   └── response/
    │       ├── AuthResponse.java         ← JWT + RefreshToken
    │       ├── CategoryResponse.java
    │       ├── EventResponse.java
    │       └── NotificationResponse.java
    │
    ├── 📁 service/                       ← All business logic lives here
    │   ├── AuthService.java
    │   ├── OtpService.java               ← Generate, validate OTP
    │   ├── EmailService.java             ← Send emails via SMTP
    │   ├── JwtService.java               ← Generate, validate, extract JWT
    │   ├── CategoryService.java
    │   ├── EventService.java
    │   ├── ConflictService.java          ← Conflict detection logic
    │   ├── NotificationService.java
    │   └── AppUserDetailsService.java    ← loadUserByUsername for Spring Security
    │
    ├── 📁 controller/                    ← REST API endpoints
    │   ├── AuthController.java           ← /auth/**
    │   ├── CategoryController.java       ← /categories/**
    │   ├── EventController.java          ← /events/**
    │   └── NotificationController.java   ← /notifications/**
    │
    └── 📁 exception/
        ├── GlobalExceptionHandler.java   ← @ControllerAdvice — handles all errors
        ├── ResourceNotFoundException.java
        ├── ConflictException.java
        └── UnauthorizedException.java
```

---

### 📌 All API Endpoints

```
🔐 AUTH
POST  /auth/register              → Register + send OTP email
POST  /auth/verify-otp            → Verify OTP → activate account
POST  /auth/login                 → Login → JWT + RefreshToken
POST  /auth/refresh-token         → Get new access token
POST  /auth/send-reset-otp        → Forgot password OTP
POST  /auth/reset-password        → Reset password

🗂️ CATEGORIES (Admin only)
POST  /categories                 → Create main category
GET   /categories                 → Get all main categories
POST  /categories/{id}/sub        → Create sub category
GET   /categories/{id}/sub        → Get sub categories
DELETE /categories/{id}           → Delete category

📅 EVENTS
POST  /events                     → Student creates event request
GET   /events                     → List events (filter by status/category)
GET   /events/{id}                → Event details
PATCH /events/{id}/approve        → Admin approves
PATCH /events/{id}/reject         → Admin rejects
GET   /admin/conflicts            → View all conflicts (Admin only)
POST  /events/{id}/attend         → Student joins event

🔔 NOTIFICATIONS
GET   /notifications              → Get my notifications
PATCH /notifications/{id}/read    → Mark as read
```

---

## ⚛️ 3. React Project Structure

```
frontend/
└── src/
    │
    ├── 📁 api/                          ← All Axios API calls
    │   ├── axiosInstance.js             ← Base URL + JWT header interceptor
    │   ├── authApi.js                   ← login, register, otp, reset
    │   ├── categoryApi.js
    │   ├── eventApi.js
    │   └── notificationApi.js
    │
    ├── 📁 components/                   ← Reusable UI components
    │   ├── Navbar.jsx
    │   ├── Sidebar.jsx
    │   ├── EventCard.jsx
    │   ├── ConflictBadge.jsx            ← Shows ⚠️ conflict warning
    │   ├── NotificationBell.jsx         ← Bell icon with unread count
    │   ├── OtpInput.jsx                 ← 6-box OTP input UI
    │   └── ProtectedRoute.jsx           ← Redirects if not logged in
    │
    ├── 📁 pages/
    │   ├── 📁 auth/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── VerifyOtpPage.jsx
    │   │   └── ResetPasswordPage.jsx
    │   │
    │   ├── 📁 student/
    │   │   ├── StudentDashboard.jsx     ← Upcoming events, my events
    │   │   ├── CreateEventPage.jsx      ← Event request form
    │   │   ├── MyEventsPage.jsx         ← Track status (PENDING/APPROVED/REJECTED)
    │   │   └── EventDetailPage.jsx
    │   │
    │   └── 📁 admin/
    │       ├── AdminDashboard.jsx       ← Stats + conflict alerts
    │       ├── ManageCategories.jsx     ← Create main + sub categories
    │       ├── ManageEvents.jsx         ← Approve / Reject events
    │       ├── ConflictsPage.jsx        ← View all conflicts ⚠️
    │       └── EventDetailAdmin.jsx
    │
    ├── 📁 context/
    │   ├── AuthContext.jsx              ← user, token, login(), logout()
    │   └── NotificationContext.jsx      ← notification count, list
    │
    ├── 📁 hooks/
    │   ├── useAuth.js                   ← Access AuthContext easily
    │   └── useNotifications.js
    │
    ├── 📁 utils/
    │   ├── tokenUtils.js                ← save/get/remove JWT from localStorage
    │   └── dateUtils.js                 ← Format dates nicely
    │
    ├── App.jsx                          ← Routes setup
    └── main.jsx
```

---

### 📌 React Routes

```jsx
<Routes>
  {/* Public */}
  <Route path="/login"       element={<LoginPage />} />
  <Route path="/register"    element={<RegisterPage />} />
  <Route path="/verify-otp"  element={<VerifyOtpPage />} />
  <Route path="/reset"       element={<ResetPasswordPage />} />

  {/* Student Protected */}
  <Route element={<ProtectedRoute role="STUDENT" />}>
    <Route path="/dashboard"     element={<StudentDashboard />} />
    <Route path="/create-event"  element={<CreateEventPage />} />
    <Route path="/my-events"     element={<MyEventsPage />} />
  </Route>

  {/* Admin Protected */}
  <Route element={<ProtectedRoute role="ADMIN" />}>
    <Route path="/admin"             element={<AdminDashboard />} />
    <Route path="/admin/categories"  element={<ManageCategories />} />
    <Route path="/admin/events"      element={<ManageEvents />} />
    <Route path="/admin/conflicts"   element={<ConflictsPage />} />
  </Route>
</Routes>
```

---

## 🔄 How Everything Connects

```
React (Axios)
    │
    │  POST /auth/login → receives JWT Token
    │  Authorization: Bearer <token>  on every request
    ↓
Spring Boot (JwtRequestFilter validates token on every request)
    │
    ├── Controller → Service → Repository → MySQL
    │
    └── ConflictService checks events table on every new event submission
        → if conflict found → saves to event_conflicts table
        → creates notification for Admin
        → sends email to Admin
```
