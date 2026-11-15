package com.medical.appointmentmanagement.model;

public class PhysicalAppointment extends Appointment {
    public PhysicalAppointment(int id, String patientName, String doctorName,
        String date, String time, String status) {
        super(id, patientName, doctorName, date, time, status);
    }

    public PhysicalAppointment(int id, String patientName, String doctorName,
            String date, String time, String status, Long patientId) {
        super(id, patientName, doctorName, date, time, status, patientId);
    }

    @Override
    public String getAppointmentType() {
        return "Physical";
    }
}
