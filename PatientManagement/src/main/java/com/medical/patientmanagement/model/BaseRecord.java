package com.medical.patientmanagement.model;
 public abstract class BaseRecord {
     private long id;
     protected BaseRecord(long id) { this.id = id; }
     public long getId() { return id; }
     public void setId(long id) { this.id = id; }
     public abstract String describe();
 }
