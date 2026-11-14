package com.medical.medicalrecordsmanagement.service;

import com.medical.medicalrecordsmanagement.model.MedicalRecord;
import com.medical.medicalrecordsmanagement.model.BaseRecord;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.io.IOException;

public class MedicalRecordService {
    private final Map<Long, MedicalRecord> records = new LinkedHashMap<>();

    private final AtomicLong nextId = new AtomicLong(1);
    private final Path file = Paths.get("data", "records.txt");

    public MedicalRecordService() {
        load();
    }

    public synchronized List<MedicalRecord> all() {
        return new ArrayList<>(records.values());
    }

    public synchronized MedicalRecord find(long id) {
        MedicalRecord item = records.get(id);
        if (item == null) throw new NoSuchElementException("Record not found: " + id);
        return item;
    }

    public synchronized MedicalRecord create(Map<String, String> values) {
        MedicalRecord obj = fromValues(0, values);
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

    public synchronized MedicalRecord update(long id, Map<String, String> values) {
        MedicalRecord old = find(id);
        MedicalRecord updated = fromValues(id, values);
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
        MedicalRecord old = find(id);
        records.remove(id);
        try {
            save();
        } catch (RuntimeException ex) {
            records.put(id, old);
            throw ex;
        }
    }

    private MedicalRecord fromValues(long id, Map<String, String> values) {
        if (values == null) throw new IllegalArgumentException("Request body is required");
        MedicalRecord obj = new MedicalRecord(id);
        obj.setPatientId(values.getOrDefault("patientId", ""));
        obj.setPatientName(values.getOrDefault("patientName", ""));
        obj.setVisitDate(values.getOrDefault("visitDate", ""));
        obj.setDoctorName(values.getOrDefault("doctorName", ""));
        obj.setDiagnosis(values.getOrDefault("diagnosis", ""));
        obj.setTreatment(values.getOrDefault("treatment", ""));
        if (obj.getPatientId().isBlank()) throw new IllegalArgumentException("Patient ID is required");
        if (obj.getPatientName().isBlank()) throw new IllegalArgumentException("Patient Name is required");
        if (obj.getVisitDate().isBlank()) throw new IllegalArgumentException("Visit Date is required");
        if (obj.getDoctorName().isBlank()) throw new IllegalArgumentException("Doctor Name is required");
        if (obj.getDiagnosis().isBlank()) throw new IllegalArgumentException("Diagnosis is required");
        if (obj.getTreatment().isBlank()) throw new IllegalArgumentException("Treatment / Notes is required");

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
            for (MedicalRecord item : records.values()) {
                List<String> parts = new ArrayList<>();
                parts.add(String.valueOf(item.getId()));
                parts.add(encode(item.getPatientId()));
                parts.add(encode(item.getPatientName()));
                parts.add(encode(item.getVisitDate()));
                parts.add(encode(item.getDoctorName()));
                parts.add(encode(item.getDiagnosis()));
                parts.add(encode(item.getTreatment()));
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
                    MedicalRecord item = new MedicalRecord(id);
                    item.setPatientId(decode(parts[1]));
                    item.setPatientName(decode(parts[2]));
                    item.setVisitDate(decode(parts[3]));
                    item.setDoctorName(decode(parts[4]));
                    item.setDiagnosis(decode(parts[5]));
                    item.setTreatment(decode(parts[6]));
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
