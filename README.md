# Faculty Event Management System

## 🎯 Project Overview

This is a comprehensive **Faculty Event Management System** for the University of Ruhuna's Faculty of Technology, designed to manage student-organized events, club activities, and academic gatherings. Built with **Spring Boot** (backend) and **React** (frontend), it incorporates **advanced Java concepts** to demonstrate academic excellence.

### Key Features
- **User Roles**: Students (create events), Admins/Deans (approve/reject).
- **Event Management**: Create, approve, and track events with categories (Cultural, Sports, Technical, Academic).
- **Conflict Detection**: Automatic venue/time conflict alerts with notifications.
- **Notifications**: In-app and email alerts for approvals, conflicts, and reminders.
- **Advanced Java Highlights**:
  - OOP: Abstraction, Inheritance, Polymorphism (Event hierarchy).
  - Design Patterns: Factory (event creation), Singleton (approval service), Observer (notifications), DAO (data access).
  - Features: Streams API, Lambdas, Multithreading (@Scheduled), Custom Exceptions, File Handling.
- **Demo-Attractive Elements**: Clean UI, real-time conflict resolution, calendar views, and viva-ready explanations.

### Vision Alignment
Based on faculty activities (e.g., HackTrail, Technospirits), this system handles diverse events with multi-level approvals and advanced architecture.

## 👥 Team Plan & Roles
- **Team Lead**: Oversee integration and demo preparation.
- **Backend Developer**: Enhance advanced Java concepts (patterns, multithreading).
- **Frontend Developer**: Improve UI/UX (add calendar, real-time updates).
- **Tester/Documenter**: Write tests, update docs, prepare viva notes.
- **Milestones**:
  1. Week 1: Analyze gaps and refactor for advanced concepts.
  2. Week 2: Implement missing features (e.g., Event subclasses, Factory pattern).
  3. Week 3: Testing, UI polish, and demo rehearsal.
  4. Week 4: Final demo with Q&A on advanced Java.

## 🚀 How to Run the Project

### Prerequisites
- **Java 17** or higher
- **Node.js 18+** and npm
- **MySQL** (or PostgreSQL) database
- **Maven** for backend
- **Git** for cloning

### Backend Setup (Spring Boot)
1. Clone the repo: `git clone <repo-url>`
2. Navigate to `ems_server/`: `cd ems_server`
3. DataSource configuration uses Spring singleton `@Bean` in `src/main/java/com/project/ems_server/config/DataSourceConfig.java`:
   - `@Configuration`
   - `@Bean` with `DataSourceProperties.initializeDataSourceBuilder().build()`
   - This keeps exactly one `DataSource` instance in the Spring context (singleton scope)

4. Create `src/main/resources/application.properties` (copy from `application-template.properties`):
   ```
   # Database
   spring.datasource.url=jdbc:mysql://localhost:3306/event_db
   spring.datasource.username=your_mysql_username
   spring.datasource.password=your_mysql_password

   # For local tests with H2 (optional)
   # spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE

   # JPA
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=true

   # JWT Secret (generate a secure key)
   jwt.secret=your_secure_jwt_secret_here

   # Email (for notifications)
   spring.mail.host=localhost
   spring.mail.port=25
   spring.mail.username=your_email@gmail.com
   spring.mail.password=your_app_password
   spring.mail.properties.mail.smtp.auth=false
   spring.mail.properties.mail.smtp.starttls.enable=false
   ```
   **Security Note**: `application.properties` is gitignored. Never commit real secrets!
5. Install dependencies: `mvn clean install`
6. Run the app: `mvn spring-boot:run`
7. API available at `http://localhost:8081`

### Frontend Setup (React)
1. Navigate to `frontend/`: `cd frontend`
2. Create `.env` file (if not present):
   ```
   VITE_API_BASE_URL=http://localhost:8081/api
   ```
3. Install dependencies: `npm install`
4. Run the app: `npm run dev`
5. Open `http://localhost:5173` in browser

### Testing
- Use Postman for API testing (import collection from `Details/` if available).
- Test user flows: Register → Login → Create Event → Admin Approve → Check Notifications.
- Verify conflicts: Create overlapping events and check alerts.

## 🎓 Academic Demo Highlights
- **Showcase Advanced Java**: Explain patterns (e.g., "Factory creates events polymorphically") with code snippets.
- **Live Demo**: Create an event, trigger conflict, approve via admin, receive email.
- **Viva Prep**: Be ready to discuss why Singleton for approval, Observer for notifications, etc.
- **Attractiveness**: Simple UI, real-world relevance (faculty events), and technical depth.

## 📚 Additional Resources
- [Details/](Details/) for requirements and roadmap.
- [Spring Boot Docs](https://spring.io/projects/spring-boot) for backend.
- [React Docs](https://react.dev/) for frontend.
- Contact team lead for questions.

Let's build an outstanding system! 🚀