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





design...prompt

Apply this exact design system to the [PAGE NAME] page:

THEME: Dark futuristic mission-control UI
BACKGROUND: #060810 base, dot-grid overlay (rgba(0,210,255,0.018), 60px), animated particle canvas with connected nodes, scanline sweep effect
FONTS: Orbitron (monospace) for headings/labels/buttons, Syne for card titles, DM Sans for body text — load from Google Fonts
COLORS:
  - Primary accent: #00d2ff (cyan)
  - Success: #00e5a0
  - Warning: #ffb340
  - Danger: #ff4d6d
  - Purple: #a78bfa
  - Background: #060810
  - Cards: rgba(255,255,255,0.02) base, rgba(0,210,255,0.04) on hover
  - Borders: rgba(255,255,255,0.06) base, rgba(0,210,255,0.35) on hover

NAVBAR: Sticky, frosted glass (backdrop-filter blur 20px), rgba(6,8,16,0.88), height 64px, Orbitron logo badge with gpulse animation, cyan active tab underline indicator
CARDS: borderRadius 20px, hover lifts translateY(-4 to -6px), colored top-edge gradient bar, box-shadow glow on hover matching accent color
BUTTONS: Primary = linear-gradient(135deg,#00d2ff,#0099bb), dark text, Orbitron font, lift + glow shadow on hover. Secondary = rgba border style matching section accent color
ANIMATIONS: cardIn (fadeUp from translateY 22px), fadeIn, gpulse (glow pulse), blink (opacity), scanln (scanline sweep), spin (loader), slideD (dropdown)
SECTION HEADERS: Orbitron 13px, 0.14em letter-spacing, uppercase, colored left vertical bar (3px wide gradient), count pill badge
EMPTY STATES: Dashed border rgba(0,210,255,0.08), centered icon + Orbitron message
LOADING: Cyan spinner + blinking Orbitron text "LOADING..."
FOOTER: Orbitron 9px links, cyan on hover, subtle top border

Write all styles as inline React style objects. Use <style> tag only for @keyframes, @import, :hover class overrides, and scrollbar styles. Keep all logic and data fetching intact.