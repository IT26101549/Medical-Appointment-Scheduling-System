package com.medical.medicalrecordsmanagement.model;

public class MedicalRecord extends BaseRecord {
    private String patientId;
    private String patientName;
    private String visitDate;
    private String doctorName;
    private String diagnosis;
    private String treatment;

    public MedicalRecord() {
        super(0);
    }

    public MedicalRecord(long id) {
        super(id);
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String value) {
        this.patientId = value == null ? "" : value.trim();
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String value) {
        this.patientName = value == null ? "" : value.trim();
    }

    public String getVisitDate() {
        return visitDate;
    }

    public void setVisitDate(String value) {
        this.visitDate = value == null ? "" : value.trim();
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String value) {
        this.doctorName = value == null ? "" : value.trim();
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String value) {
        this.diagnosis = value == null ? "" : value.trim();
    }

    public String getTreatment() {
        return treatment;
    }

    public void setTreatment(String value) {
        this.treatment = value == null ? "" : value.trim();
    }

    @Override
    public String describe() {
        return "Medical Records Management: " + getId() + " — " + getPatientName();
    }
}
