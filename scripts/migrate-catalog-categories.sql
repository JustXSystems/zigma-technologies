-- Align catalog categories with live Zigma inventory hubs.
-- Safe to re-run.

INSERT INTO catalog_categories (item_type, name, slug, sort_order, enabled) VALUES
  ('project', 'Solar EPC', 'solar-epc', 1, 1),
  ('project', 'UPS & Battery', 'ups-battery', 2, 1),
  ('project', 'Hybrid Power', 'hybrid-power', 3, 1),
  ('product', 'UPS Systems', 'ups-systems', 1, 1),
  ('product', 'Studer Hybrid', 'studer-hybrid', 2, 1),
  ('product', 'Solar Solutions', 'solar-solutions', 3, 1),
  ('product', 'Inverters', 'inverters', 4, 1),
  ('product', 'Batteries', 'batteries', 5, 1),
  ('product', 'Stabilizers', 'stabilizers', 6, 1),
  ('product', 'BMS', 'bms', 7, 1),
  ('product', 'BESS', 'bess', 8, 1),
  ('product', 'EV Charging', 'ev-charging', 9, 1),
  ('service', 'Field Services', 'field-services', 1, 1),
  ('service', 'UPS AMC', 'ups-amc', 2, 1),
  ('service', 'UPS Repair', 'ups-repair', 3, 1),
  ('service', 'UPS Rental', 'ups-rental', 4, 1),
  ('service', 'Solar O&M', 'solar-om', 5, 1),
  ('service', 'Design & Engineering', 'engineering-design', 6, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), enabled = VALUES(enabled);
