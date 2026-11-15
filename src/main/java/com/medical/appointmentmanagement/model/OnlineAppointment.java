package com.medical.appointmentmanagement.model;

public class OnlineAppointment extends Appointment {
    public OnlineAppointment(int id, String patientName, String doctorName,
        String date, String time, String status) {
        super(id, patientName, doctorName, date, time, status);
    }

    public OnlineAppointment(int id, String patientName, String doctorName,
            String date, String time, String status, Long patientId) {
        super(id, patientName, doctorName, date, time, status, patientId);
    }

    @Override
    public String getAppointmentType() {
        return "Online";
    }
}
