package com.medical.doctormanagement.service;

import com.medical.doctormanagement.model.Doctor;
import com.medical.doctormanagement.model.BaseRecord;
import java.util.*;
import com.medical.doctormanagement.validation.InputValidation;
import java.util.concurrent.atomic.AtomicLong;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.io.IOException;

@org.springframework.stereotype.Service
public class DoctorService {
    private final Map<Long, Doctor> records = new LinkedHashMap<>();

    private final AtomicLong nextId = new AtomicLong(1);
    private final Path file;

    public DoctorService() {
        this(Paths.get("data", "doctors.txt"));
    }

    // Package-private constructor lets tests use temporary files without touching real records.
    DoctorService(Path file) {
        this.file = Objects.requireNonNull(file);
        load();
    }

    public synchronized List<Doctor> all() {
        return new ArrayList<>(records.values());
    }

    public synchronized Doctor find(long id) {
        Doctor item = records.get(id);
        if (item == null) throw new NoSuchElementException("Record not found: " + id);
        return item;
    }

    public synchronized Doctor create(Map<String, String> values) {
        Doctor obj = fromValues(0, values);
        checkUniqueContact(obj);
        long id = nextId.getAndIncrement();
        obj.setId(id);
        records.put(id, obj);
        try {
            save();
        } catch (RuntimeException ex) {
            records.remove(id);
            throw ex;
        }
        return obj;
    }

    public synchronized Doctor update(long id, Map<String, String> values) {
        Doctor old = find(id);
        Doctor updated = fromValues(id, values);
        checkUniqueContact(updated);
        records.put(id, updated);
        try {
            save();
        } catch (RuntimeException ex) {
            records.put(id, old);
            throw ex;
        }
        return updated;
    }

    public synchronized void delete(long id) {
        Doctor old = find(id);
        records.remove(id);
        try {
            save();
        } catch (RuntimeException ex) {
            records.put(id, old);
            throw ex;
        }
    }

    private void checkUniqueContact(Doctor candidate) {
        String candidatePhone = localPhone(candidate.getPhone());
        for (Doctor existing : records.values()) {
            if (existing.getId() == candidate.getId() && candidate.getId() != 0) {
                continue;
            }
            if (candidate.getEmail().equalsIgnoreCase(existing.getEmail().trim())) {
                throw new IllegalArgumentException("A doctor with this email address already exists.");
            }
            if (candidatePhone.equals(localPhone(existing.getPhone()))) {
                throw new IllegalArgumentException("A doctor with this phone number already exists.");
            }
        }
    }

    private String localPhone(String phone) {
        String cleaned = phone.trim();
        return cleaned.startsWith("+94") ? "0" + cleaned.substring(3) : cleaned;
    }

    private Doctor fromValues(long id, Map<String, String> values) {
        if (values == null) throw new IllegalArgumentException("Request body is required");
        Doctor obj = new Doctor(id);
        obj.setName(values.getOrDefault("name", ""));
        obj.setSpecialization(values.getOrDefault("specialization", ""));
        obj.setEmail(InputValidation.email(values.getOrDefault("email", "")));
        obj.setPhone(InputValidation.phone(values.getOrDefault("phone", "")));
        obj.setRoom(values.getOrDefault("room", ""));
        obj.setStatus(values.getOrDefault("status", ""));
        if (obj.getName().isBlank()) throw new IllegalArgumentException("Doctor Name is required");
        if (obj.getSpecialization().isBlank()) throw new IllegalArgumentException("Specialization is required");
        if (obj.getEmail().isBlank()) throw new IllegalArgumentException("Email is required");
        if (obj.getPhone().isBlank()) throw new IllegalArgumentException("Phone Number is required");
        if (obj.getStatus().isBlank()) throw new IllegalArgumentException("Doctor Status is required");

        BaseRecord polymorphic = obj;
        polymorphic.describe(); // virtual method dispatch (polymorphism)
        return obj;
    }

    private static String encode(String s) {
        return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }

    private static String decode(String s) {
        return new String(Base64.getDecoder().decode(s), StandardCharsets.UTF_8);
    }

    private void save() {
        try {
            Files.createDirectories(file.getParent());
            List<String> lines = new ArrayList<>();
            for (Doctor item : records.values()) {
                List<String> parts = new ArrayList<>();
                parts.add(String.valueOf(item.getId()));
                parts.add(encode(item.getName()));
                parts.add(encode(item.getSpecialization()));
                parts.add(encode(item.getEmail()));
                parts.add(encode(item.getPhone()));
                parts.add(encode(item.getRoom()));
                parts.add(encode(item.getStatus()));
                lines.add(String.join("\t", parts));
            }
            Path tmp = file.resolveSibling(file.getFileName().toString() + ".tmp");
            Files.write(tmp, lines, StandardCharsets.UTF_8);
            try {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Could not save records: " + ex.getMessage(), ex);
        }
    }

    private void load() {
        if (!Files.exists(file)) return;
        try {
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                if (line.isBlank()) continue;
                String[] parts = line.split("\t", -1);
                if (parts.length != 7) continue;
                try {
                    long id = Long.parseLong(parts[0]);
                    Doctor item = new Doctor(id);
                    item.setName(decode(parts[1]));
                    item.setSpecialization(decode(parts[2]));
                    item.setEmail(decode(parts[3]));
                    item.setPhone(decode(parts[4]));
                    item.setRoom(decode(parts[5]));
                    item.setStatus(decode(parts[6]));
                    records.put(id, item);
                    nextId.set(Math.max(nextId.get(), id+1));
                } catch (IllegalArgumentException ex) {
                    System.err.println("Skipped invalid saved record: " + ex.getMessage());
                }
            }
        } catch(IOException ex) {
            throw new IllegalStateException("Could not load records", ex);
        }
    }
}
