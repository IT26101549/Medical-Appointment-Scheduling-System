package com.medical.doctormanagement.controller;

import com.medical.doctormanagement.model.Doctor;
import com.medical.doctormanagement.service.DoctorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {
    private final DoctorService service = new DoctorService();
    @GetMapping
    public List<Doctor> all() {
        return service.all();
    }

    @GetMapping("/{id}")
    public Doctor one(@PathVariable long id) {
        return service.find(id);
    }

    @PostMapping
    public ResponseEntity<Doctor> create(@RequestBody Map<String, String> fields) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(fields));
    }

    @PutMapping("/{id}")
    public Doctor update(@PathVariable long id, @RequestBody Map<String, String> fields) {
        return service.update(id, fields);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> missing(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> ioError(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
    }
}
