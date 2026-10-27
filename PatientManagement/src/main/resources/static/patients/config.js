window.APP_CONFIG = {
  "title": "Patient Management",
  "subtitle": "Manage registrations and patient profiles",
  "entity": "Patient",
  "plural": "patients",
  "fields": [
    {
      "key": "name",
      "label": "Patient Name",
      "type": "text",
      "required": true
    },
    {
      "key": "age",
      "label": "Age",
      "type": "number",
      "required": true
    },
    {
      "key": "gender",
      "label": "Gender",
      "type": "select:Male|Female|Other|Prefer not to say",
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
      "key": "address",
      "label": "Address",
      "type": "text",
      "required": false
    }
  ]
};
