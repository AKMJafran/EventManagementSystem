# Faculty Event Management System

This repository contains:

- `frontend/`: React + Vite client
- `ems_server/`: Spring Boot backend

## Current Setup

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8081`
- Database: MySQL
- Image storage: Cloudinary

The app no longer uses the old external file server on `localhost:8080`.

## Image Upload Architecture

Image upload still goes through the backend route:

- `POST /files/upload`

Flow:

1. frontend sends the selected image to the Spring backend
2. backend validates file type and size
3. backend uploads the image directly to Cloudinary
4. backend stores the returned Cloudinary URL as the image ID
5. event and profile image URLs are built from that stored value

## Prerequisites

- Java 17+
- Node.js 18+
- MySQL
- Cloudinary account

## Backend Configuration

Local backend config lives in:

- `ems_server/src/main/resources/application.properties`

That file is gitignored. Use [application-template.properties](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/resources/application-template.properties:1) as the template.

Required properties:

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
spring.servlet.multipart.max-request-size=10MB

cloudinary.cloud-name=your_cloudinary_cloud_name
cloudinary.api-key=your_cloudinary_api_key
cloudinary.api-secret=your_cloudinary_api_secret
cloudinary.folder=ems
cloudinary.connect-timeout-ms=5000
cloudinary.read-timeout-ms=15000
cloudinary.images.max-size=5MB
```

Optional but currently used locally:

- SMTP settings for email notifications

## Frontend Configuration

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:8081
```

## Run The Project

### 1. Start MySQL

Make sure the `ems_database` database exists and the configured credentials are correct.

### 2. Start the backend

From `ems_server/`:

```powershell
./mvnw.cmd spring-boot:run
```

If Maven is installed globally:

```powershell
mvn spring-boot:run
```

### 3. Start the frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

Open:

- `http://localhost:5173`

## Important Notes

- After backend code changes, restart the Spring Boot server before testing again.
- Existing records that were saved during the earlier local-fallback phase may still contain old values like `local-...png`.
- Those old records should no longer crash event pages, but that specific old image may not render correctly until it is uploaded again through the Cloudinary-based uploader.

## Relevant Files

- [CreateEventPage.jsx](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/pages/CreateEventPage.jsx:1)
- [ManageEvents.jsx](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/pages/ManageEvents.jsx:1)
- [StudentHeader.jsx](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/components/layout/StudentHeader.jsx:1)
- [FileController.java](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/java/com/project/ems_server/controller/FileController.java:1)
- [FileServerService.java](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/java/com/project/ems_server/service/FileServerService.java:1)
- [application-template.properties](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/resources/application-template.properties:1)

## Current Status

The uploader is now designed around Cloudinary instead of the previous file-server integration.
