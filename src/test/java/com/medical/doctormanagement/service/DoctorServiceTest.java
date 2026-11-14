package com.medical.doctormanagement.service;

import com.medical.doctormanagement.model.Doctor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.*;

class DoctorServiceTest {
    @TempDir Path temporaryDirectory;

    private Path file() { return temporaryDirectory.resolve("data").resolve("doctors.txt"); }

    private Map<String, String> validFields() {
        return new HashMap<>(Map.of(
                "name", "Dr. Test Doctor",
                "specialization", "Cardiology",
                "email", "doctor@example.com",
                "phone", "0771234567",
                "room", "Room 204",
                "status", "Active"));
    }

    @Test
    void newDirectoryStartsEmpty() {
        assertTrue(new DoctorService(file()).all().isEmpty());
        assertFalse(Files.exists(file()));
    }

    @Test
    void createsNumericIdsAndPersistsEveryField() {
        DoctorService service = new DoctorService(file());
        Doctor created = service.create(validFields());
        assertEquals(1L, created.getId());
        Doctor reloaded = new DoctorService(file()).find(created.getId());
        assertAll(
                () -> assertEquals("Dr. Test Doctor", reloaded.getName()),
                () -> assertEquals("Cardiology", reloaded.getSpecialization()),
                () -> assertEquals("doctor@example.com", reloaded.getEmail()),
                () -> assertEquals("0771234567", reloaded.getPhone()),
                () -> assertEquals("Room 204", reloaded.getRoom()),
                () -> assertEquals("Active", reloaded.getStatus()));
    }

    @Test
    void updateKeepsIdAndPersistsRoomAndCustomStatus() {
        DoctorService service = new DoctorService(file());
        long id = service.create(validFields()).getId();
        Map<String, String> changed = validFields();
        changed.put("name", "Dr. Updated");
        changed.put("room", "Suite 7");
        changed.put("status", "Visiting");
        Doctor updated = service.update(id, changed);
        assertEquals(id, updated.getId());
        Doctor reloaded = new DoctorService(file()).find(id);
        assertEquals("Dr. Updated", reloaded.getName());
        assertEquals("Suite 7", reloaded.getRoom());
        assertEquals("Visiting", reloaded.getStatus());
    }

    @Test
    void deleteRemovesRecordFromMemoryAndFile() {
        DoctorService service = new DoctorService(file());
        long id = service.create(validFields()).getId();
        service.delete(id);
        assertTrue(service.all().isEmpty());
        assertTrue(new DoctorService(file()).all().isEmpty());
        assertThrows(NoSuchElementException.class, () -> service.find(id));
    }

    @Test
    void restartContinuesIdsWithoutOverwritingExistingDoctor() {
        long first = new DoctorService(file()).create(validFields()).getId();
        DoctorService restarted = new DoctorService(file());
        long second = restarted.create(secondDoctorFields()).getId();
        assertTrue(second > first);
        assertEquals(2, new DoctorService(file()).all().size());
    }

    @Test
    void roomIsOptionalAndInputIsTrimmed() {
        Map<String, String> values = validFields();
        values.remove("room");
        values.put("name", "  Dr. Trimmed  ");
        values.put("email", "  doctor@example.com  ");
        Doctor saved = new DoctorService(file()).create(values);
        assertEquals("", saved.getRoom());
        assertEquals("Dr. Trimmed", saved.getName());
        assertEquals("doctor@example.com", saved.getEmail());
    }

    @Test
    void invalidUpdateLeavesOriginalDoctorUnchanged() {
        DoctorService service = new DoctorService(file());
        long id = service.create(validFields()).getId();
        Map<String, String> invalid = validFields();
        invalid.put("phone", "12345");
        invalid.put("name", "Must not replace original");
        assertThrows(IllegalArgumentException.class, () -> service.update(id, invalid));
        assertEquals("Dr. Test Doctor", service.find(id).getName());
        assertEquals("0771234567", new DoctorService(file()).find(id).getPhone());
    }

    @Test
    void invalidCreateDoesNotAddRecord() {
        DoctorService service = new DoctorService(file());
        Map<String, String> invalid = validFields();
        invalid.put("name", "   ");
        assertThrows(IllegalArgumentException.class, () -> service.create(invalid));
        assertTrue(service.all().isEmpty());
        assertFalse(Files.exists(file()));
    }

    @Test
    void missingRecordsFailClearly() {
        DoctorService service = new DoctorService(file());
        assertThrows(NoSuchElementException.class, () -> service.find(99));
        assertThrows(NoSuchElementException.class, () -> service.update(99, validFields()));
        assertThrows(NoSuchElementException.class, () -> service.delete(99));
    }

    @Test
    void unicodeAndTabsRoundTripWithoutBreakingFileColumns() {
        Map<String, String> values = validFields();
        values.put("name", "වෛද්‍ය Test மருத்துவர்");
        values.put("room", "Building A\tLevel 2");
        Doctor created = new DoctorService(file()).create(values);
        Doctor reloaded = new DoctorService(file()).find(created.getId());
        assertEquals(values.get("name"), reloaded.getName());
        assertEquals(values.get("room"), reloaded.getRoom());
    }

    @Test
    void failedFileWriteRollsBackNewRecord() throws Exception {
        Path blockedParent = temporaryDirectory.resolve("not-a-directory");
        Files.writeString(blockedParent, "A regular file blocks directory creation.");
        DoctorService service = new DoctorService(blockedParent.resolve("doctors.txt"));
        assertThrows(IllegalStateException.class, () -> service.create(validFields()));
        assertTrue(service.all().isEmpty());
    }

    private Map<String, String> secondDoctorFields() {
        Map<String, String> fields = validFields();
        fields.put("email", "second@example.com");
        fields.put("phone", "0712345678");
        return fields;
    }

    @Test
    void rejectsDuplicateEmailAfterReloadIgnoringCase() {
        new DoctorService(file()).create(validFields());
        DoctorService service = new DoctorService(file());
        Map<String, String> duplicate = secondDoctorFields();
        duplicate.put("email", " DOCTOR@EXAMPLE.COM ");
        var error = assertThrows(IllegalArgumentException.class, () -> service.create(duplicate));
        assertTrue(error.getMessage().contains("email address"));
        assertEquals(1, service.all().size());
    }

    @Test
    void rejectsDuplicatePhoneInInternationalFormat() {
        DoctorService service = new DoctorService(file());
        service.create(validFields());
        Map<String, String> duplicate = secondDoctorFields();
        duplicate.put("phone", "+94771234567");
        var error = assertThrows(IllegalArgumentException.class, () -> service.create(duplicate));
        assertTrue(error.getMessage().contains("phone number"));
        assertEquals(1, service.all().size());
    }

    @Test
    void editAllowsOwnContactButRejectsAnotherDoctorsContact() {
        DoctorService service = new DoctorService(file());
        Doctor first = service.create(validFields());
        Doctor second = service.create(secondDoctorFields());
        Map<String, String> changes = secondDoctorFields();
        changes.put("name", "Dr. Updated Name");
        assertEquals("Dr. Updated Name", service.update(second.getId(), changes).getName());
        changes.put("email", first.getEmail());
        assertThrows(IllegalArgumentException.class, () -> service.update(second.getId(), changes));
        changes.put("email", second.getEmail());
        changes.put("phone", first.getPhone());
        assertThrows(IllegalArgumentException.class, () -> service.update(second.getId(), changes));
        Doctor reloaded = new DoctorService(file()).find(second.getId());
        assertEquals(second.getEmail(), reloaded.getEmail());
        assertEquals(second.getPhone(), reloaded.getPhone());
    }
}
