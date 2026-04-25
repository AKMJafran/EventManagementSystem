# Faculty Event Management System

Faculty Event Management System is a full-stack app for managing student and faculty events. The repository contains:

- `frontend/`: React + Vite client
- `ems_server/`: Spring Boot API
- an external file server integration used for image upload and file access

## Current Local Setup

These are the ports and services the project is currently wired for:

- Frontend: `http://localhost:5173`
- Spring Boot backend: `http://localhost:8081`
- File server API: `http://localhost:8080/api`

Event and profile images are stored through the file server only. If the file server is down or misconfigured, image upload will fail.

## Prerequisites

- Java 17
- Node.js 18+
- MySQL
- A running file server compatible with:
  - `POST /api/login`
  - `POST /api/upload_file`
  - `GET /api/files/content/{fileId}`

## Backend Configuration

The backend reads configuration from `ems_server/src/main/resources/application.properties`.

That file is gitignored by [`ems_server/.gitignore`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/.gitignore:28), so each machine should keep its own local copy.

You can start from [`application-template.properties`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/resources/application-template.properties:1) and fill in real values.

Minimum required properties:

```properties
server.port=8081

spring.datasource.url=jdbc:mysql://localhost:3306/EMS_Database
spring.datasource.username=your_mysql_username
spring.datasource.password=your_mysql_password

jwt.secret=your_jwt_secret

fileserver.url=http://localhost:8080/api
fileserver.client.name=test_backend
fileserver.client.secret=your_file_server_client_secret
fileserver.public-base-url=http://localhost:8081

spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

Optional but present in the current local setup:

- SMTP mail settings for notification email
- file server timeout and retry settings
- file access signing secret

## Frontend Configuration

The frontend uses `VITE_API_BASE_URL` and defaults to `http://localhost:8081`.

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:8081
```

## Running the Project

### 1. Start MySQL

Make sure the target database exists and the credentials in `application.properties` are correct.

### 2. Start the file server

The backend depends on the external file server for all image uploads. It must be reachable at the configured `fileserver.url`.

### 3. Start the Spring Boot backend

From `ems_server/`:

```powershell
./mvnw.cmd spring-boot:run
```

If Maven is installed globally, this also works:

```powershell
mvn spring-boot:run
```

### 4. Start the frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Image Upload Notes

- Frontend uploads images to `POST /files/upload` on the Spring backend.
- The Spring backend forwards the upload to the external file server.
- The backend also generates signed URLs for `GET /files/content/{fileId}`.
- If you get a `502` during upload, check the file server first:
  - is it running
  - is `fileserver.url` correct
  - do `fileserver.client.name` and `fileserver.client.secret` match the file server

## Useful Paths

- [`frontend/src/pages/CreateEventPage.jsx`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/pages/CreateEventPage.jsx:1)
- [`frontend/src/pages/ManageEvents.jsx`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/pages/ManageEvents.jsx:1)
- [`frontend/src/api/axiosInstance.js`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/frontend/src/api/axiosInstance.js:1)
- [`ems_server/src/main/java/com/project/ems_server/service/FileServerService.java`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/java/com/project/ems_server/service/FileServerService.java:1)
- [`ems_server/src/main/java/com/project/ems_server/controller/FileController.java`](C:/Level%203%20Semester%201/Advanced%20Programming/EventManagementSystem/ems_server/src/main/java/com/project/ems_server/controller/FileController.java:1)

## Current Status

The backend is now set to use the file server only for image storage. The local fallback was removed, but the multipart upload fix remains in place.
