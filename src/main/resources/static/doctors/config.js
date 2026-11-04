window.APP_CONFIG = {
  "title": "Doctor Management",
  "subtitle": "Organize the medical team",
  "entity": "Doctor",
  "plural": "doctors",
  "fields": [
    {
      "key": "name",
      "label": "Doctor Name",
      "type": "text",
      "required": true
    },
    {
      "key": "specialization",
      "label": "Specialization",
      "type": "text",
      "required": true
    },
    {
      "key": "email",
      "label": "Email",
      "type": "email",
      "required": true
    },
    {
      "key": "phone",
      "label": "Phone Number",
      "type": "tel",
      "required": true
    },
    {
      "key": "room",
      "label": "Consultation Room",
      "type": "text",
      "required": false
    },
    {
      "key": "status",
      "label": "Doctor Status",
      "type": "select:Active|On Leave|Inactive",
      "required": true
    }
  ]
};
