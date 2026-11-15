package com.medical.patientmanagement.model;

public class Patient extends BaseRecord {
    private String name;
    private String age;
    private String birthDate = "";
    private String gender;
    private String email;
    private String phone;
    private String address;

    public Patient() {
        super(0);
    }

    public Patient(long id) {
        super(id);
    }

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value == null ? "" : value.trim();
    }

    public String getAge() {
        return age;
    }

    public void setAge(String value) {
        this.age = value == null ? "" : value.trim();
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String value) {
        this.birthDate = value == null ? "" : value.trim();
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String value) {
        this.gender = value == null ? "" : value.trim();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String value) {
        this.email = value == null ? "" : value.trim();
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String value) {
        this.phone = value == null ? "" : value.trim();
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String value) {
        this.address = value == null ? "" : value.trim();
    }

    @Override
    public String describe() {
        return "Patient Management: " + getId() + " — " + getName();
    }
}
