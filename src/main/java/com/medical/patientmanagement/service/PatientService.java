package com.medical.patientmanagement.service;

import com.medical.patientmanagement.model.Patient;
import com.medical.patientmanagement.model.BaseRecord;
import java.util.*;
import com.medical.patientmanagement.validation.InputValidation;
import java.util.concurrent.atomic.AtomicLong;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.io.IOException;

public class PatientService {
    private final Map<Long, Patient> records = new LinkedHashMap<>();

    private final AtomicLong nextId = new AtomicLong(1);
    private final Path file = Paths.get("data", "patients.txt");

    public PatientService() {
        load();
    }

    public synchronized List<Patient> all() {
        return new ArrayList<>(records.values());
    }

    public synchronized Patient find(long id) {
        Patient item = records.get(id);
        if (item == null) throw new NoSuchElementException("Record not found: " + id);
        return item;
    }

    public synchronized Patient create(Map<String, String> values) {
        Patient obj = fromValues(0, values);
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

    public synchronized Patient update(long id, Map<String, String> values) {
        Patient old = find(id);
        Patient updated = fromValues(id, values);
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
        Patient old = find(id);
        records.remove(id);
        try {
            save();
        } catch (RuntimeException ex) {
            records.put(id, old);
            throw ex;
        }
    }

    private Patient fromValues(long id, Map<String, String> values) {
        if (values == null) throw new IllegalArgumentException("Request body is required");
        Patient obj = new Patient(id);
        obj.setName(values.getOrDefault("name", ""));
        obj.setAge(values.getOrDefault("age", ""));
        obj.setGender(values.getOrDefault("gender", ""));
        obj.setEmail(InputValidation.email(values.getOrDefault("email", "")));
        obj.setPhone(InputValidation.phone(values.getOrDefault("phone", "")));
        obj.setAddress(values.getOrDefault("address", ""));
        if (obj.getName().isBlank()) throw new IllegalArgumentException("Patient Name is required");
        if (obj.getAge().isBlank()) throw new IllegalArgumentException("Age is required");
        if (obj.getGender().isBlank()) throw new IllegalArgumentException("Gender is required");
        if (obj.getEmail().isBlank()) throw new IllegalArgumentException("Email is required");
        if (obj.getPhone().isBlank()) throw new IllegalArgumentException("Phone Number is required");
        try {
            if (Integer.parseInt(obj.getAge()) < 0 || Integer.parseInt(obj.getAge()) > 125) throw new NumberFormatException();
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Age must be 0 to 125");
        }

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
            for (Patient item : records.values()) {
                List<String> parts = new ArrayList<>();
                parts.add(String.valueOf(item.getId()));
                parts.add(encode(item.getName()));
                parts.add(encode(item.getAge()));
                parts.add(encode(item.getGender()));
                parts.add(encode(item.getEmail()));
                parts.add(encode(item.getPhone()));
                parts.add(encode(item.getAddress()));
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
                    Patient item = new Patient(id);
                    item.setName(decode(parts[1]));
                    item.setAge(decode(parts[2]));
                    item.setGender(decode(parts[3]));
                    item.setEmail(decode(parts[4]));
                    item.setPhone(decode(parts[5]));
                    item.setAddress(decode(parts[6]));
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
