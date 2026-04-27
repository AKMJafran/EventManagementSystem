# Faculty Event Management System

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.0-green)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.0-purple)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-blue)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-red)](https://jwt.io/)

A comprehensive university event management system designed to streamline event organization, approval workflows, and user engagement within a faculty environment. Built with modern web technologies, it supports role-based access control, real-time notifications, analytics, and seamless integration with cloud services for image storage.

## Features

### Admin
- **User Management**: Add, edit, and manage students and lecturers individually or via bulk CSV import.
- **Event Oversight**: Approve or reject event creation requests with conflict detection.
- **Analytics & Reporting**: Generate monthly reports, filter analytics by status, type, venue, organizer, and date range; group data by type/venue/category; identify top organizers and track daily/monthly trends.
- **System Administration**: Manage categories, clubs, venues, and events.
- **Notifications**: Broadcast in-app and email notifications to ALL_USERS, ALL_STUDENTS, or specific users.

### Lecturer
- **Event Management**: Create, edit, and manage events with approval workflows.
- **Club Oversight**: Approve student club creation requests and manage club memberships with roles (President, Secretary, Treasurer, Member).
- **Approvals**: Review and approve pending event and club requests.
- **Dashboard**: Access personalized dashboard for managing events and clubs.

### Student
- **Event Participation**: Browse, register for events, and view personal event history.
- **Club Creation**: Initiate club formation requests for lecturer approval.
- **Profile Management**: Update profile with image uploads via Cloudinary.
- **Notifications**: Receive in-app and email notifications for events and approvals.

### General Features
- **Authentication**: Role-based access control with JWT (ADMIN, LECTURER, STUDENT).
- **Conflict Detection**: Automatic detection of scheduling conflicts during event creation.
- **Image Upload**: Secure image storage and management using Cloudinary.
- **Scheduled Reminders**: Automated email reminders sent every 15 minutes for upcoming events using @Scheduled tasks.

## Architecture

The system follows the **Model-View-Controller (MVC)** pattern, separating concerns for maintainability and scalability.

### Design Patterns & Advanced Java Features
- **Observer Pattern**: Used for notification broadcasting.
- **Abstract Factory Pattern**: For creating related objects without specifying concrete classes.
- **Decorator Pattern**: To add responsibilities to objects dynamically.
- **Stream API & Lambdas**: For efficient data processing and functional programming.
- **TransactionTemplate**: For managing database transactions programmatically.
- **Java Records**: For immutable data structures.
- **Spring Security (@PreAuthorize)**: For method-level security.
- **DTO Pattern**: For data transfer between layers.
- **@Scheduled Tasks**: For background job execution, such as reminders.

## Tech Stack

- **Backend**: Spring Boot 3, MySQL, Spring Security, JWT
- **Frontend**: React, Vite, Tailwind CSS
- **Other**: Cloudinary (image storage), SMTP (email notifications)

## Prerequisites

- Java 17 or higher
- Node.js 18 or higher
- MySQL 8.0 or higher
- Cloudinary account for image storage
- SMTP server configuration for email notifications

## Setup

### Backend Configuration

1. Navigate to the backend resources directory.
2. Copy the template configuration file to create your local properties file:
   - Use [application-template.properties](./ems_server/src/main/resources/application-template.properties) as the template.
   - Create `ems_server/src/main/resources/application.properties` (this file is gitignored).

3. Configure the following required properties in `application.properties`:

```properties
server.port=8081

spring.datasource.url=jdbc:mysql://localhost:3306/ems_database?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=your_mysql_username
spring.datasource.password=your_mysql_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect

jwt.secret=your_jwt_secret

spring.servlet.multipart.max-file-size=10MB
spring.servlet.max-request-size=10MB

cloudinary.cloud-name=your_cloudinary_cloud_name
cloudinary.api-key=your_cloudinary_api_key
cloudinary.api-secret=your_cloudinary_api_secret
cloudinary.folder=ems
cloudinary.connect-timeout-ms=5000
cloudinary.read-timeout-ms=15000
cloudinary.images.max-size=5MB
```

4. (Optional) Configure SMTP settings for email notifications:

```properties
spring.mail.host=your_smtp_host
spring.mail.port=587
spring.mail.username=your_email_username
spring.mail.password=your_email_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

### Frontend Configuration

1. Create a `.env` file in the `frontend/` directory.
2. Add the following environment variable:

```env
VITE_API_BASE_URL=http://localhost:8081
```

## Running the Project

1. **Start MySQL**:
   - Ensure MySQL is running.
   - Create a database named `ems_database`.
   - Verify the credentials in `application.properties` match your MySQL setup.

2. **Start the Backend**:
   - Open a terminal and navigate to the `ems_server/` directory.
   - Run the following command:
     ```bash
     ./mvnw.cmd spring-boot:run
     ```
   - If Maven is installed globally, you can use:
     ```bash
     mvn spring-boot:run
     ```
   - The backend will start on `http://localhost:8081`.

3. **Start the Frontend**:
   - Open a new terminal and navigate to the `frontend/` directory.
   - Install dependencies:
     ```bash
     npm install
     ```
   - Start the development server:
     ```bash
     npm run dev
     ```
   - The frontend will be available at `http://localhost:5173`.

## Important Notes

- After making changes to the backend code, restart the Spring Boot server to apply updates.
- Existing records from previous versions may contain outdated image references (e.g., `local-...png`), which should be re-uploaded via the Cloudinary uploader for proper rendering.
- Ensure all environment variables and configurations are set before running the application.

## Contributors

- **Mohamed Jafran** (Repo Lead) — [GitHub](https://github.com/AKMJafran) — [LinkedIn](https://linkedin.com/in/mohamed-jafran-14362b272)
- **HajithMohamed** — [GitHub](https://github.com/HajithMohamed) — [LinkedIn](https://linkedin.com/in/mohamed-hajith-b53559295)
- **J.Dhanushiya**
- **T.Dharshika**
