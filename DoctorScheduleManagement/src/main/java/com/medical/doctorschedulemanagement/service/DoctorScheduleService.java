package com.medical.doctorschedulemanagement.service;
 import com.medical.doctorschedulemanagement.model.DoctorSchedule;
 import com.medical.doctorschedulemanagement.model.BaseRecord;
 import java.util.*;
 import com.medical.doctorschedulemanagement.validation.InputValidation;
 import java.util.concurrent.atomic.AtomicLong;
 import java.nio.charset.StandardCharsets;
 import java.nio.file.*;
 import java.io.IOException;

 public class DoctorScheduleService {
     private final Map<Long,DoctorSchedule> records = new LinkedHashMap<>();
     private final AtomicLong nextId = new AtomicLong(1);
     private final Path file = Paths.get("data", "schedules.txt");
     public DoctorScheduleService() { load(); }

     public synchronized List<DoctorSchedule> all() { return new ArrayList<>(records.values()); }
     public synchronized DoctorSchedule find(long id) {
         DoctorSchedule item = records.get(id);
         if (item == null) throw new NoSuchElementException("Record not found: " + id);
         return item;
     }
     public synchronized DoctorSchedule create(Map<String,String> values) {
         DoctorSchedule obj = fromValues(0, values);
         long id = nextId.getAndIncrement();
         obj.setId(id);
         records.put(id, obj);
         try { save(); } catch (RuntimeException ex) { records.remove(id); throw ex; }
         return obj;
     }
     public synchronized DoctorSchedule update(long id, Map<String,String> values) {
         DoctorSchedule old = find(id);
         DoctorSchedule updated = fromValues(id,values);
         records.put(id,updated);
         try { save(); } catch (RuntimeException ex) { records.put(id,old); throw ex; }
         return updated;
     }
     public synchronized void delete(long id) {
         DoctorSchedule old = find(id);
         records.remove(id);
         try { save(); } catch (RuntimeException ex) { records.put(id,old); throw ex; }
     }
     private DoctorSchedule fromValues(long id,Map<String,String> values) {
         if (values == null) throw new IllegalArgumentException("Request body is required");
         DoctorSchedule obj = new DoctorSchedule(id);
         obj.setDoctorId(values.getOrDefault("doctorId", ""));
        obj.setDoctorName(values.getOrDefault("doctorName", ""));
        obj.setDate(values.getOrDefault("date", ""));
        obj.setStartTime(values.getOrDefault("startTime", ""));
        obj.setEndTime(values.getOrDefault("endTime", ""));
        obj.setAvailability(values.getOrDefault("availability", ""));
         if (obj.getDoctorId().isBlank()) throw new IllegalArgumentException("Doctor ID is required");
        if (obj.getDoctorName().isBlank()) throw new IllegalArgumentException("Doctor Name is required");
        if (obj.getDate().isBlank()) throw new IllegalArgumentException("Schedule Date is required");
        if (obj.getStartTime().isBlank()) throw new IllegalArgumentException("Start Time is required");
        if (obj.getEndTime().isBlank()) throw new IllegalArgumentException("End Time is required");
        if (obj.getAvailability().isBlank()) throw new IllegalArgumentException("Availability is required");
         InputValidation.schedule(obj.getDate(), obj.getStartTime(), obj.getEndTime());

         BaseRecord polymorphic = obj;
         polymorphic.describe(); // virtual method dispatch (polymorphism)
         return obj;
     }
     private static String encode(String s) { return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }
     private static String decode(String s) { return new String(Base64.getDecoder().decode(s),StandardCharsets.UTF_8); }
     private void save() {
         try {
             Files.createDirectories(file.getParent());
             List<String> lines = new ArrayList<>();
             for (DoctorSchedule item : records.values()) {
                 List<String> parts = new ArrayList<>();
                 parts.add(String.valueOf(item.getId()));
                 parts.add(encode(item.getDoctorId()));
                parts.add(encode(item.getDoctorName()));
                parts.add(encode(item.getDate()));
                parts.add(encode(item.getStartTime()));
                parts.add(encode(item.getEndTime()));
                parts.add(encode(item.getAvailability()));
                 lines.add(String.join("\t", parts));
             }
             Path tmp = file.resolveSibling(file.getFileName().toString() + ".tmp");
             Files.write(tmp, lines,StandardCharsets.UTF_8);
             try { Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE); }
             catch (AtomicMoveNotSupportedException ex) { Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING); }
         } catch (IOException ex) { throw new IllegalStateException("Could not save records: " + ex.getMessage(),ex); }
     }
     private void load() {
         if (!Files.exists(file)) return;
         try {
             for (String line : Files.readAllLines(file,StandardCharsets.UTF_8)) {
                 if (line.isBlank()) continue;
                 String[] parts = line.split("\t",-1);
                 if (parts.length != 7) continue;
                 try {
                     long id = Long.parseLong(parts[0]);
                     DoctorSchedule item = new DoctorSchedule(id);
                     item.setDoctorId(decode(parts[1]));
                    item.setDoctorName(decode(parts[2]));
                    item.setDate(decode(parts[3]));
                    item.setStartTime(decode(parts[4]));
                    item.setEndTime(decode(parts[5]));
                    item.setAvailability(decode(parts[6]));
                     records.put(id,item);
                     nextId.set(Math.max(nextId.get(),id+1));
                 } catch (IllegalArgumentException ex) { System.err.println("Skipped invalid saved record: " + ex.getMessage()); }
             }
         } catch(IOException ex) { throw new IllegalStateException("Could not load records",ex); }
     }
 }
