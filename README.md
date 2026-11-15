# Northern Care | Medical Appointment Scheduling System

Northern Care is an SE1020 group project for managing hospital appointments. One Spring Boot application provides an admin sign-in page, a dashboard, and six connected management modules.

## Modules and features

All six modules support creating, reading, updating, and deleting records.

| Module | Screens and actions | Data file |
| --- | --- | --- |
| Patient Management | Register or edit patients, search the patient list, and view profiles with appointment history. | `patients.txt` |
| Doctor Management | Browse the doctor directory, open profiles, and add or edit doctor details. | `doctors.txt` |
| Appointment Management | Check availability and book an appointment, view bookings, reschedule, or cancel. | `appointments.txt` |
| Doctor Schedule Management | Add or edit schedule slots, view the list or calendar, and check for scheduling conflicts. | `schedules.txt` |
| Payment Management | Record payments, filter the payment list, edit entries, and track payment status. | `payments.txt` |
| Medical Records Management | Add, search, view, or edit visit records with diagnoses and treatment notes. | `records.txt` |

The admin login and dashboard are shared across the six modules.

## Run locally

1. Install JDK 17 and Maven.
2. Open the project folder containing `pom.xml` in VS Code or IntelliJ IDEA.
3. Run this command from the project terminal:

   ```powershell
   mvn spring-boot:run
   ```

   You can also run `com.medical.MedicalApplication` from your IDE. Use the project folder as the working directory.

4. Open [http://localhost:8080](http://localhost:8080). For the local demo, sign in with any non-blank username and password.

If an embedded browser cannot keep the sign-in session, open the address directly in Chrome or Edge with cookies enabled. Press `Ctrl+C` in the terminal to stop the application.

## How it works

- **Backend:** Java 17, Spring Boot, and REST endpoints for the six modules.
- **Frontend:** HTML, CSS, and JavaScript in `src/main/resources/static/`.
- **Data:** Each module stores its records in a text file under `data/`. The dashboard uses those records for its totals and appointment chart. A fresh copy starts with no records. The `data/` folder is excluded from Git.

## Object-oriented design

- **Encapsulation:** Model classes such as `Patient` and `Appointment` keep their fields private and expose methods to read or change them.
- **Abstraction and inheritance:** The abstract `Appointment` class defines the fields and behavior shared by `OnlineAppointment` and `PhysicalAppointment`.
- **Polymorphism:** Both appointment subclasses override `getAppointmentType()`. The service can work with an `Appointment` reference, and each subclass supplies its own type.

## Require admin credentials

The app starts in local demo mode by default. To require a configured login, set `HOSPITAL_DEMO_LOGIN` to `false` and set `HOSPITAL_ADMIN_PASSWORD` to a password of at least eight characters before starting the app. The username defaults to `admin`. Set `HOSPITAL_ADMIN_USERNAME` to use a different one.

## Team workflow

Develop module changes on feature branches and open pull requests into the shared `main` branch. Run the combined application locally to check your changes before opening a pull request.
