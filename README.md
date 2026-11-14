# HospitalSystem

The dashboard and six management modules run in one Spring Boot application.

## Run

Open a terminal in this folder (where pom.xml is located). Use Java 17 and Maven:

```powershell
mvn spring-boot:run
```

Open http://localhost:8080/. Enter any non-blank username and password for the local demo. Sign out from the sidebar.

To require credentials, set HOSPITAL_DEMO_LOGIN to false and HOSPITAL_ADMIN_PASSWORD to a password of at least eight characters before starting. The username defaults to admin and can be configured with HOSPITAL_ADMIN_USERNAME.

Dashboard counts and the appointment chart use actual records from the app. A fresh installation starts with empty records. Each module saves to its own text file in the data folder. Start the application from this project folder so it can find those files. Use Ctrl+C to stop it.

## Team development

The dashboard files are src/main/resources/static/index.html, dashboard.css and dashboard.js. For a shared GitHub repository, use feature branches and pull requests so each member's changes remain visible in the history. This ZIP contains the combined source files for local running.
