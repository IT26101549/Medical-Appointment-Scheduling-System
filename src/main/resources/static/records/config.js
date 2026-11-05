window.APP_CONFIG = {
  "title": "Medical Records Management",
  "subtitle": "Maintain and review patient medical history",
  "entity": "MedicalRecord",
  "plural": "records",
  "fields": [
    {
      "key": "patientId",
      "label": "Patient ID",
      "type": "number",
      "required": true
    },
    {
      "key": "patientName",
      "label": "Patient Name",
      "type": "text",
      "required": true
    },
    {
      "key": "visitDate",
      "label": "Visit Date",
      "type": "date",
      "required": true
    },
    {
      "key": "doctorName",
      "label": "Doctor Name",
      "type": "text",
      "required": true
    },
    {
      "key": "diagnosis",
      "label": "Diagnosis",
      "type": "textarea",
      "required": true
    },
    {
      "key": "treatment",
      "label": "Treatment / Notes",
      "type": "textarea",
      "required": true
    }
  ]
};
