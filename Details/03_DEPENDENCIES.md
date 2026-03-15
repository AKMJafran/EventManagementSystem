# 📦 Dependencies — Spring Boot & React

---

## 🍃 Spring Boot — `pom.xml`

```xml
<dependencies>

    <!-- ✅ Spring Web — REST APIs -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- ✅ Spring Security — Auth & Route Protection -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>

    <!-- ✅ Spring Data JPA — Database ORM -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- ✅ MySQL Driver -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- ✅ JWT — Token Generate & Validate -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- ✅ Java Mail Sender — Send OTP emails -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-mail</artifactId>
    </dependency>

    <!-- ✅ Validation — @NotNull, @Email, @Size etc -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- ✅ Lombok — Reduce boilerplate (@Getter, @Setter, @Builder) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- ✅ DevTools — Auto restart on code change -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>

    <!-- ✅ Test — JUnit5, Mockito, MockMvc included -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>

</dependencies>
```

> 💡 `@EnableScheduling` in main class enables scheduled tasks (no extra dependency needed)

---

## ⚙️ `application.properties`

```properties
# ── Database ──────────────────────────────────────────
spring.datasource.url=jdbc:mysql://localhost:3306/event_db
spring.datasource.username=root
spring.datasource.password=yourpassword
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# ── JPA ───────────────────────────────────────────────
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# ── JWT ───────────────────────────────────────────────
jwt.secret=your_super_secret_key_minimum_32_characters
jwt.access-token-expiry=900000          # 15 minutes
jwt.refresh-token-expiry=604800000      # 7 days

# ── Mail (Gmail SMTP) ─────────────────────────────────
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=yourgmail@gmail.com
spring.mail.password=your_app_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# ── App Port ──────────────────────────────────────────
server.port=8080
```

> 💡 For Gmail: Google Account → Security → 2FA → App Passwords → Generate

---

## ⚛️ React — Installation Commands

### Step 1 — Create Project
```bash
npm create vite@latest frontend -- --template react
cd frontend
```

### Step 2 — Install All Dependencies
```bash
# Routing
npm install react-router-dom

# HTTP requests
npm install axios

# Styling
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Toast notifications
npm install react-hot-toast

# Icons
npm install react-icons

# Date formatting
npm install date-fns

# Form handling
npm install react-hook-form

# Schema validation
npm install zod @hookform/resolvers

# Global state management
npm install zustand
```

---

## ⚙️ Tailwind Setup

**`tailwind.config.js`**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

**`src/index.css`**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 📊 Quick Reference Table

| Purpose | Spring Boot | React |
|---------|------------|-------|
| REST API | `spring-boot-starter-web` | `axios` |
| Auth/Security | `spring-boot-starter-security` | `zustand` |
| JWT | `jjwt-api/impl/jackson` | localStorage + axios interceptor |
| Database | `spring-data-jpa` + `mysql-connector` | — |
| Email/OTP | `spring-boot-starter-mail` | — |
| Form Validation | `spring-boot-starter-validation` | `react-hook-form` + `zod` |
| Styling | — | `tailwindcss` |
| Toast Alerts | — | `react-hot-toast` |
| Routing | — | `react-router-dom` |
| Boilerplate | `lombok` | — |
| Date Handling | — | `date-fns` |
