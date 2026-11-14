package com.medical.paymentmanagement.service;

import com.medical.paymentmanagement.model.Payment;
import com.medical.paymentmanagement.model.BaseRecord;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.io.IOException;

public class PaymentService {
    private final Map<Long, Payment> records = new LinkedHashMap<>();

    private final AtomicLong nextId = new AtomicLong(1);
    private final Path file = Paths.get("data", "payments.txt");

    public PaymentService() {
        load();
    }

    public synchronized List<Payment> all() {
        return new ArrayList<>(records.values());
    }

    public synchronized Payment find(long id) {
        Payment item = records.get(id);
        if (item == null) throw new NoSuchElementException("Record not found: " + id);
        return item;
    }

    public synchronized Payment create(Map<String, String> values) {
        Payment obj = fromValues(0, values);
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

    public synchronized Payment update(long id, Map<String, String> values) {
        Payment old = find(id);
        Payment updated = fromValues(id, values);
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
        Payment old = find(id);
        records.remove(id);
        try {
            save();
        } catch (RuntimeException ex) {
            records.put(id, old);
            throw ex;
        }
    }

    private Payment fromValues(long id, Map<String, String> values) {
        if (values == null) throw new IllegalArgumentException("Request body is required");
        Payment obj = new Payment(id);
        obj.setAppointmentId(values.getOrDefault("appointmentId", ""));
        obj.setPatientName(values.getOrDefault("patientName", ""));
        obj.setAmount(values.getOrDefault("amount", ""));
        obj.setMethod(values.getOrDefault("method", ""));
        obj.setPaymentDate(values.getOrDefault("paymentDate", ""));
        obj.setStatus(values.getOrDefault("status", ""));
        if (obj.getAppointmentId().isBlank()) throw new IllegalArgumentException("Appointment ID is required");
        if (obj.getPatientName().isBlank()) throw new IllegalArgumentException("Patient Name is required");
        if (obj.getAmount().isBlank()) throw new IllegalArgumentException("Amount is required");
        if (obj.getMethod().isBlank()) throw new IllegalArgumentException("Payment Method is required");
        if (obj.getPaymentDate().isBlank()) throw new IllegalArgumentException("Payment Date is required");
        if (obj.getStatus().isBlank()) throw new IllegalArgumentException("Payment Status is required");
        try {
            if (Double.parseDouble(obj.getAmount()) < 0 || !Double.isFinite(Double.parseDouble(obj.getAmount()))) throw new NumberFormatException();
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Amount must be a valid non-negative number");
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
            for (Payment item : records.values()) {
                List<String> parts = new ArrayList<>();
                parts.add(String.valueOf(item.getId()));
                parts.add(encode(item.getAppointmentId()));
                parts.add(encode(item.getPatientName()));
                parts.add(encode(item.getAmount()));
                parts.add(encode(item.getMethod()));
                parts.add(encode(item.getPaymentDate()));
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
                    Payment item = new Payment(id);
                    item.setAppointmentId(decode(parts[1]));
                    item.setPatientName(decode(parts[2]));
                    item.setAmount(decode(parts[3]));
                    item.setMethod(decode(parts[4]));
                    item.setPaymentDate(decode(parts[5]));
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
