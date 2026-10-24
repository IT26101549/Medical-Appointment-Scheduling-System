window.APP_CONFIG = {
  "title": "Doctor Schedule Management",
  "subtitle": "Manage time slots and doctor availability",
  "entity": "DoctorSchedule",
  "plural": "schedules",
  "fields": [
    {
      "key": "doctorId",
      "label": "Doctor ID",
      "type": "number",
      "required": true
    },
    {
      "key": "doctorName",
      "label": "Doctor Name",
      "type": "text",
      "required": true
    },
    {
      "key": "date",
      "label": "Schedule Date",
      "type": "date",
      "required": true
    },
    {
      "key": "startTime",
      "label": "Start Time",
      "type": "time",
      "required": true
    },
    {
      "key": "endTime",
      "label": "End Time",
      "type": "time",
      "required": true
    },
    {
      "key": "availability",
      "label": "Availability",
      "type": "select:Available|Booked|Unavailable",
      "required": true
    }
  ]
};
