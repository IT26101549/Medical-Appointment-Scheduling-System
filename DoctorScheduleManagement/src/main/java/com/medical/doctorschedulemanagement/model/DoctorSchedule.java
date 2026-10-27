package com.medical.doctorschedulemanagement.model;
 public class DoctorSchedule extends BaseRecord {
     private String doctorId;
    private String doctorName;
    private String date;
    private String startTime;
    private String endTime;
    private String availability;
     public DoctorSchedule() { super(0); }
    public DoctorSchedule(long id) { super(id); }
     public String getDoctorId() { return doctorId; }
    public void setDoctorId(String value) { this.doctorId = value == null ? "" : value.trim(); }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String value) { this.doctorName = value == null ? "" : value.trim(); }
    public String getDate() { return date; }
    public void setDate(String value) { this.date = value == null ? "" : value.trim(); }
    public String getStartTime() { return startTime; }
    public void setStartTime(String value) { this.startTime = value == null ? "" : value.trim(); }
    public String getEndTime() { return endTime; }
    public void setEndTime(String value) { this.endTime = value == null ? "" : value.trim(); }
    public String getAvailability() { return availability; }
    public void setAvailability(String value) { this.availability = value == null ? "" : value.trim(); }
     public String describe() { return "Doctor Schedule Management: " + getId() + " — " + getDoctorName(); }
 }
