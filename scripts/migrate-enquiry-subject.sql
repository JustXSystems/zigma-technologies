-- Add subject select to default enquiry form (idempotent)

SET @form_id = (SELECT id FROM form_definitions WHERE form_key = 'enquiry_default' LIMIT 1);

INSERT INTO form_fields (form_id, field_name, label, field_type, required, options_json, placeholder, sort_order, enabled)
SELECT
  @form_id,
  'subject',
  'I''m Getting in Touch About',
  'select',
  1,
  JSON_ARRAY(
    'Solar Solution',
    'UPS Solution',
    'BESS- Battery System',
    'Site Visit Request',
    'AMC & Service Request',
    'Request a Quote',
    'EV Charging Solution',
    'Emergency Service Support',
    'General Enquiry',
    'Careers'
  ),
  'Select a topic',
  4,
  1
FROM DUAL
WHERE @form_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM form_fields WHERE form_id = @form_id AND field_name = 'subject');

UPDATE form_fields SET sort_order = 5
WHERE form_id = @form_id AND field_name = 'company';

UPDATE form_fields SET sort_order = 6
WHERE form_id = @form_id AND field_name = 'message';

UPDATE form_fields SET required = 0
WHERE form_id = @form_id AND field_name = 'message';
