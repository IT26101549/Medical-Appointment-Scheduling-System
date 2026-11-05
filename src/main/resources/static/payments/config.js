window.APP_CONFIG = {
  "title": "Payment Management",
  "subtitle": "Record and track appointment payments",
  "entity": "Payment",
  "plural": "payments",
  "fields": [
    {
      "key": "appointmentId",
      "label": "Appointment ID",
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
      "key": "amount",
      "label": "Amount",
      "type": "number",
      "required": true
    },
    {
      "key": "method",
      "label": "Payment Method",
      "type": "select:Cash|Card|Bank Transfer|Online",
      "required": true
    },
    {
      "key": "paymentDate",
      "label": "Payment Date",
      "type": "date",
      "required": true
    },
    {
      "key": "status",
      "label": "Payment Status",
      "type": "select:Pending|Paid|Failed|Refunded",
      "required": true
    }
  ]
};
