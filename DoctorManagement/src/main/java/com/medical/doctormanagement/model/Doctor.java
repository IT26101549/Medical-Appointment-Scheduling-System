package com.medical.doctormanagement.model;
 public class Doctor extends BaseRecord {
     private String name;
    private String specialization;
    private String email;
    private String phone;
    private String room;
    private String status;
     public Doctor() { super(0); }
    public Doctor(long id) { super(id); }
     public String getName() { return name; }
    public void setName(String value) { this.name = value == null ? "" : value.trim(); }
    public String getSpecialization() { return specialization; }
    public void setSpecialization(String value) { this.specialization = value == null ? "" : value.trim(); }
    public String getEmail() { return email; }
    public void setEmail(String value) { this.email = value == null ? "" : value.trim(); }
    public String getPhone() { return phone; }
    public void setPhone(String value) { this.phone = value == null ? "" : value.trim(); }
    public String getRoom() { return room; }
    public void setRoom(String value) { this.room = value == null ? "" : value.trim(); }
    public String getStatus() { return status; }
    public void setStatus(String value) { this.status = value == null ? "" : value.trim(); }
     public String describe() { return "Doctor Management: " + getId() + " — " + getName(); }
 }
