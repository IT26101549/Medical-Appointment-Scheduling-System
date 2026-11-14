package com.medical.paymentmanagement.model;

public class Payment extends BaseRecord {
    private String appointmentId;
    private String patientName;
    private String amount;
    private String method;
    private String paymentDate;
    private String status;

    public Payment() {
        super(0);
    }

    public Payment(long id) {
        super(id);
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String value) {
        this.appointmentId = value == null ? "" : value.trim();
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String value) {
        this.patientName = value == null ? "" : value.trim();
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String value) {
        this.amount = value == null ? "" : value.trim();
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String value) {
        this.method = value == null ? "" : value.trim();
    }

    public String getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(String value) {
        this.paymentDate = value == null ? "" : value.trim();
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String value) {
        this.status = value == null ? "" : value.trim();
    }

    @Override
    public String describe() {
        return "Payment Management: " + getId() + " — " + getPatientName();
    }
}
