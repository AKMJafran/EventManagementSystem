# 🎯 Event Management System — Project Idea

---

## 🏗️ Overview

A **Campus Event Management System** where:
- **Admins** manage event categories and monitor conflicts
- **Students** request and create events
- Secured with **JWT Authentication + Email OTP**

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Create categories, sub-events, approve/reject events, view conflicts |
| **Student** | Register, create event requests, view events, get notifications |

---

## 📦 Core Modules

### 1. 🔐 Authentication Module
- Register → Email OTP verification → Account activated
- Login → Returns **JWT Access Token + Refresh Token**
- Forgot Password → Email OTP → Reset password
- Refresh Token endpoint to renew access token

```
POST /auth/register         → sends OTP to email
POST /auth/verify-otp       → activates account
POST /auth/login            → returns JWT
POST /auth/refresh-token    → returns new access token
POST /auth/send-reset-otp   → for forgot password
POST /auth/reset-password   → resets password
```

---

### 2. 🗂️ Category Module *(Admin only)*
Admin creates **Main Categories** and **Sub Categories** under each.

```
Academic
  ├── Seminar
  ├── Workshop
  └── Hackathon
Cultural
  ├── Dance Show
  ├── Music Night
  └── Drama
```

```
POST   /categories            → create main category
GET    /categories            → list all
POST   /categories/{id}/sub   → create sub category
GET    /categories/{id}/sub   → list sub categories
```

---

### 3. 📅 Event Module

**Student creates an event request:**
```json
{
  "title": "AI Workshop",
  "categoryId": 1,
  "subCategoryId": 3,
  "venue": "Hall A",
  "startTime": "2025-04-10T10:00",
  "endTime": "2025-04-10T13:00",
  "description": "..."
}
```

**Event Status Flow:**
```
PENDING → APPROVED / REJECTED → PUBLISHED
```

```
POST   /events                    → student creates event request
GET    /events                    → list all events
GET    /events/{id}               → event detail
PATCH  /admin/events/{id}/approve → admin approves
PATCH  /admin/events/{id}/reject  → admin rejects
```

---

### 4. ⚠️ Conflict Detection Module *(Key Feature)*

```
Same Venue + Overlapping Time = CONFLICT ⚠️
```

**Logic:**
```java
existingEvent.startTime < newEvent.endTime
AND
existingEvent.endTime > newEvent.startTime
```

Admin Dashboard shows:
- 🔴 Conflicting events highlighted
- Which event was submitted first
- Option to approve one and auto-reject the other

---

### 5. 🔔 Notification Module

| Trigger | Who Gets Notified |
|---------|------------------|
| Event submitted | Admin |
| Event approved | Student who created it |
| Event rejected | Student who created it |
| Conflict detected | Admin |
| Event starting soon (1hr before) | All registered attendees |

- **In-app notifications** → stored in DB
- **Email notifications** → sent via SMTP

```
GET    /notifications           → get my notifications
PATCH  /notifications/{id}/read → mark as read
```

---

### 6. 📧 Email OTP Module

```
Register → Generate 6-digit OTP → Save in DB (10 min expiry) → Send Email
User enters OTP → Validate → Activate account
```

---

## 🔑 JWT Flow

```
Login
  ↓
Access Token (15 min) + Refresh Token (7 days)
  ↓
Every request → Authorization: Bearer <accessToken>
  ↓
Token expires → POST /auth/refresh-token
  ↓
New access token issued
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot |
| Auth | JWT (jjwt 0.11.5) |
| Database | MySQL |
| Email | JavaMailSender + Gmail SMTP |
| Security | Spring Security |
| Frontend | React.js + Tailwind CSS |
| Build | Maven |
