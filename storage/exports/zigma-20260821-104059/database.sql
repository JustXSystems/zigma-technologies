-- Zigma Technologies CMS dump
-- Generated: 2026-08-21T05:11:00.024Z
-- Database: zigmatech
-- Tables: 23
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- ----------------------------
-- Table `admin_roles`
-- ----------------------------
DROP TABLE IF EXISTS `admin_roles`;
CREATE TABLE `admin_roles` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `screens` json NOT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `admin_roles` (`id`, `name`, `slug`, `description`, `screens`, `is_system`, `created_at`, `updated_at`) VALUES
(1, 'Full Admin', 'admin', 'Unrestricted access to every admin screen.', '[\"dashboard\",\"guide\",\"pages\",\"inventory\",\"catalogSettings\",\"resources\",\"press\",\"testimonials\",\"enquiries\",\"forms\",\"newsletter\",\"nav\",\"siteSettings\",\"siteCopy\",\"media\",\"theme\",\"redirects\",\"newClient\",\"partners\",\"users\",\"roles\",\"account\"]', 1, '2026-08-14 16:59:27', '2026-08-14 16:59:27'),
(2, 'Editor', 'editor', 'Default content and leads access (legacy editor permissions).', '[\"dashboard\",\"guide\",\"pages\",\"inventory\",\"catalogSettings\",\"resources\",\"press\",\"testimonials\",\"enquiries\",\"forms\",\"nav\",\"siteSettings\",\"media\",\"partners\",\"account\"]', 1, '2026-08-14 16:59:27', '2026-08-14 16:59:27'),
(3, 'Sales Admin', 'sales-admin', 'Sales Admin', '[\"inventory\",\"enquiries\",\"testimonials\",\"media\"]', 0, '2026-08-14 17:02:05', '2026-08-14 17:02:05');

-- ----------------------------
-- Table `admin_users`
-- ----------------------------
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(120) NOT NULL,
  `role` enum('admin','editor') NOT NULL DEFAULT 'admin',
  `role_id` int unsigned DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_admin_users_role` (`role_id`),
  CONSTRAINT `fk_admin_users_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `admin_users` (`id`, `email`, `password_hash`, `name`, `role`, `role_id`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin@zigma-technologies.com', '$2b$12$88qhCOcXCMoNoR8PN.8IYePp73NvZCq7xQd09wAgFnApf69UpBjiG', 'Site Admin', 'admin', 1, '2026-08-20 21:55:58', '2026-08-12 07:05:02', '2026-08-20 21:55:58'),
(2, 'salesadmin@zigma-technologies.com', '$2b$12$X.GZ9HXavCv7riWS5iyF4u626uPoJLw0hR9SAhjr4vhGMdL3s03TK', 'sales Admin', 'editor', 3, '2026-08-14 17:11:22', '2026-08-14 17:03:46', '2026-08-14 17:11:22');

-- ----------------------------
-- Table `catalog_categories`
-- ----------------------------
DROP TABLE IF EXISTS `catalog_categories`;
CREATE TABLE `catalog_categories` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_type` enum('project','product','service') NOT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cat_type_slug` (`item_type`,`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `catalog_categories` (`id`, `item_type`, `name`, `slug`, `sort_order`, `enabled`) VALUES
(1, 'project', 'Solar EPC', 'solar-epc', 1, 1),
(2, 'project', 'UPS & Battery', 'ups-battery', 2, 1),
(3, 'project', 'Energy Management', 'energy-management', 3, 1),
(4, 'product', 'UPS Systems', 'ups-systems', 1, 1),
(5, 'product', 'Batteries', 'batteries', 5, 1),
(6, 'product', 'Solar Modules', 'solar-modules', 3, 1),
(7, 'service', 'AMC', 'amc', 1, 1),
(8, 'service', 'Design & Engineering', 'engineering-design', 6, 1),
(9, 'service', 'Installation', 'installation', 3, 1),
(10, 'project', 'Hybrid Power', 'hybrid-power', 3, 1),
(11, 'product', 'Studer Hybrid', 'studer-hybrid', 2, 1),
(12, 'product', 'Solar Solutions', 'solar-solutions', 3, 1),
(13, 'product', 'Inverters', 'inverters', 4, 1),
(14, 'product', 'Stabilizers', 'stabilizers', 6, 1),
(15, 'product', 'BMS', 'bms', 7, 1),
(16, 'service', 'Field Services', 'field-services', 1, 1),
(17, 'service', 'UPS AMC', 'ups-amc', 2, 1),
(18, 'service', 'UPS Repair', 'ups-repair', 3, 1),
(19, 'service', 'UPS Rental', 'ups-rental', 4, 1),
(20, 'service', 'Solar O&M', 'solar-om', 5, 1),
(42, 'product', 'BESS', 'bess', 8, 1),
(43, 'product', 'EV Charging', 'ev-charging', 9, 1);

-- ----------------------------
-- Table `catalog_items`
-- ----------------------------
DROP TABLE IF EXISTS `catalog_items`;
CREATE TABLE `catalog_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_type` enum('project','product','service') NOT NULL,
  `slug` varchar(160) NOT NULL,
  `title` varchar(255) NOT NULL,
  `summary` text,
  `description` mediumtext,
  `category_id` int unsigned DEFAULT NULL,
  `tags_json` json DEFAULT NULL,
  `specs_json` json DEFAULT NULL,
  `price_label` varchar(120) DEFAULT NULL,
  `availability_label` varchar(120) DEFAULT NULL,
  `lead_time_label` varchar(120) DEFAULT NULL,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `cta_config_json` json DEFAULT NULL,
  `case_study_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_item_type_slug` (`item_type`,`slug`),
  KEY `idx_items_type_enabled` (`item_type`,`enabled`,`status`),
  KEY `fk_items_category` (`category_id`),
  CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `catalog_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `catalog_items` (`id`, `item_type`, `slug`, `title`, `summary`, `description`, `category_id`, `tags_json`, `specs_json`, `price_label`, `availability_label`, `lead_time_label`, `status`, `featured`, `sort_order`, `enabled`, `cta_config_json`, `case_study_json`, `created_at`, `updated_at`) VALUES
(53, 'service', 'field-installation-commissioning', 'Field Installation & Commissioning', 'UPS and solar field services — install, commission, maintain, and modernize critical power assets.', 'Zigma field teams deliver installation & commissioning, maintenance & operations, safety services, UPS installation & operations, and equipment refresh programs. Process: site assessment → equipment selection → system design → electrical connections → testing & validation.', 16, '[\"Field Services\",\"Commissioning\",\"UPS\",\"Solar\"]', '{\"Process\":\"Assess → Design → Connect → Test\",\"Coverage\":\"UPS & solar field execution\",\"Services\":\"Install / maintain / modernize\",\"Highlight\":\"UPS and solar field services — install, commission, maintain, and modernize critical power assets.\"}', NULL, NULL, NULL, 'published', 1, 0, 1, NULL, '{\"scope\":\"Installation, commissioning, maintenance operations, safety, and equipment modernization.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Reduced commissioning risk\",\"Documented testing & validation\",\"Longer asset life through proper field practices\"],\"solution\":\"Structured field methodology from assessment through validation with specialized UPS and solar crews.\",\"challenge\":\"Sites need disciplined field execution to install and commission critical UPS/solar assets without downtime risk.\",\"technologies\":[\"UPS field services\",\"Solar commissioning\",\"Safety procedures\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(54, 'service', 'ups-amc', 'UPS Annual Maintenance Contract (AMC)', 'PAN-India UPS AMC with preventive maintenance, battery care, and emergency response (1–500 kVA).', 'UPS AMC programs after warranty — Zigma has fulfilled 10,000+ AMCs via infrastructure across 500 cities. Coverage for major brands from 1 kVA to 500 kVA with Standard/Customized SLAs: preventive maintenance, battery testing & replacement, emergency calls, load testing, and helpdesk support.', 17, '[\"AMC\",\"UPS\",\"PAN-India\"]', '{\"SLA\":\"Standard / customized\",\"Range\":\"1–500 kVA\",\"Reach\":\"500+ cities\",\"Track\":\"10,000+ AMCs fulfilled\",\"Highlight\":\"PAN-India UPS AMC with preventive maintenance, battery care, and emergency response (1–500 kVA).\"}', NULL, NULL, NULL, 'published', 1, 1, 1, NULL, '{\"scope\":\"Preventive visits, battery testing/replacement, emergency response, load testing, technical helpdesk.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Lower unplanned downtime\",\"Battery health visibility\",\"Priority emergency desk across PAN-India network\"],\"solution\":\"Tiered AMC packages with PM schedules, battery programs, and priority helpdesk.\",\"challenge\":\"Post-warranty UPS fleets need predictable preventive care and fast emergency response.\",\"technologies\":[\"UPS AMC\",\"Battery health checks\",\"Load testing\"],\"client_sector\":\"Industrial operations\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(55, 'service', 'ups-repair-service', 'UPS Repair & Reverse Engineering Support', 'Workshop and onsite UPS repair, non-warranty breakdowns, and battery health checkups.', 'Diagnoses and restores failed UPS systems to minimize downtime. Includes corrective maintenance, workshop repair, onsite repair, non-warranty breakdown visits, and battery health checkup/maintenance — focused on expertise, timely response, quality repairs, and business continuity.', 18, '[\"Repair\",\"UPS\",\"Breakdown\"]', '{\"Extra\":\"Battery health checkup\",\"Modes\":\"Workshop / onsite\",\"Coverage\":\"Warranty & non-warranty\",\"Highlight\":\"Workshop and onsite UPS repair, non-warranty breakdowns, and battery health checkups.\"}', NULL, NULL, NULL, 'published', 1, 2, 1, NULL, '{\"scope\":\"Fault diagnosis, corrective repair, non-warranty visits, battery health maintenance.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Faster restoration of protection\",\"Extended asset life\",\"Business continuity preserved\"],\"solution\":\"Reverse engineering and industrial repair support with workshop/onsite capability.\",\"challenge\":\"Failed or aging UPS units threaten continuity when OEM warranty windows have closed.\",\"technologies\":[\"UPS repair\",\"Battery diagnostics\",\"Corrective maintenance\"],\"client_sector\":\"Critical facilities\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(56, 'service', 'ups-rental', 'UPS Rental', 'Short-term UPS rental for events, exam centres, and temporary critical power needs.', 'Flexible UPS rental from hours to months — cost-effective versus purchase, with installation setup, battery backup, on-site monitoring, maintenance support, and return/pickup included.', 19, '[\"Rental\",\"UPS\",\"Events\"]', '{\"Duration\":\"Hours to months\",\"Includes\":\"Install, monitor, pickup\",\"Highlight\":\"Short-term UPS rental for events, exam centres, and temporary critical power needs.\",\"Use cases\":\"Events / exam centres / temporary loads\"}', NULL, NULL, NULL, 'published', 0, 3, 1, NULL, '{\"scope\":\"Delivery, installation setup, on-site monitoring, maintenance, return & pickup.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"No CapEx for short-term needs\",\"Maintained backup during events\",\"Hassle-free pickup\"],\"solution\":\"Turnkey UPS rental packages avoiding CapEx while covering install and monitoring.\",\"challenge\":\"Customers need reliable ups rental with measurable SLAs, local response, and documented execution.\",\"technologies\":[\"Rental UPS\",\"Temporary battery backup\"],\"client_sector\":\"Events & temporary facilities\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(57, 'service', 'solar-maintenance-service', 'Solar O&M / Maintenance Service', 'Complete solar O&M for industrial and residential plants — inspect, clean, repair, optimize.', 'Solar operations & maintenance addressing dust, weather, and wear on panels, inverters, and wiring. Includes preventive maintenance, upgrade/replacement, performance optimization, early issue detection, and safety assurance for industrial and residential systems.', 20, '[\"Solar\",\"O&M\",\"Maintenance\"]', '{\"Extra\":\"Upgrade & replacement\",\"Scope\":\"Industrial & residential O&M\",\"Highlight\":\"Complete solar O&M for industrial and residential plants — inspect, clean, repair, optimize.\",\"Activities\":\"Inspect / clean / repair / optimize\"}', NULL, NULL, NULL, 'published', 1, 4, 1, NULL, '{\"scope\":\"Preventive maintenance, upgrades/replacements, safety checks, yield improvement actions.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Higher energy yield\",\"Longer system life\",\"Earlier fault detection\"],\"solution\":\"Structured O&M programs for inspections, cleaning, repairs, and performance optimization.\",\"challenge\":\"Dust and weather degrade solar yield without disciplined O&M.\",\"technologies\":[\"Solar O&M\",\"Inverter health checks\",\"Module cleaning programs\"],\"client_sector\":\"C&I and residential solar\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(58, 'service', 'design-outsource-support', 'Design & Outsource Support (EPLAN & AutoCAD)', 'Outsourced electrical design using EPLAN & AutoCAD across industrial verticals.', 'External engineering capacity for machinery & plant construction, panel building, automotive, process industry, energy, and building technology. Delivers expertise, customization, QA, cost-effective scaling, and confidentiality using EPLAN and AutoCAD workflows.', 8, '[\"Design\",\"EPLAN\",\"AutoCAD\"]', '{\"Tools\":\"EPLAN & AutoCAD\",\"Highlight\":\"Outsourced electrical design using EPLAN & AutoCAD across industrial verticals.\",\"Verticals\":\"Plant / panel / auto / process / energy / building\",\"Deliverables\":\"SLD, panel design, documentation\"}', NULL, NULL, NULL, 'published', 1, 5, 1, NULL, '{\"scope\":\"Electrical design, panel building documentation, process/energy drawings, QA reviews.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Faster design throughput\",\"Consistent documentation quality\",\"Flexible engineering capacity\"],\"solution\":\"Outsourced EPLAN/AutoCAD design support that scales with project demand.\",\"challenge\":\"Peak engineering loads and skill gaps slow plant/panel delivery schedules.\",\"technologies\":[\"EPLAN\",\"AutoCAD\",\"Electrical design packages\"],\"client_sector\":\"Industrial engineering & OEMs\"}', '2026-08-13 00:10:50', '2026-08-13 00:10:50'),
(59, 'project', 'studer-hybrid-lithium-petroleum-project', 'Studer Hybrid + Lithium — Petroleum Project', 'Studer hybrid inverter/charger with lithium batteries for a petroleum-site power solution.', 'Zigma engineered and commissioned a Studer hybrid power architecture with lithium battery storage for a petroleum project, combining solar/hybrid conversion, battery storage, and resilient backup for critical site loads.', 10, '[\"Studer\",\"Hybrid\",\"Lithium\",\"Petroleum\"]', '{\"Sector\":\"Petroleum / energy\",\"Highlight\":\"Hybrid + lithium continuity for petroleum site loads\",\"Technology\":\"Studer hybrid + lithium battery\"}', NULL, NULL, NULL, 'published', 1, 0, 1, NULL, '{\"scope\":\"System design support, Studer hybrid equipment supply/integration, lithium battery bank, commissioning, and handover documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Reliable hybrid power continuity for petroleum site operations\",\"Lithium storage for efficient backup and cycling\",\"Remote-ready monitoring for operational visibility\"],\"solution\":\"Deployed a Studer hybrid inverter/charger platform with lithium batteries, configured for hybrid energy management, seamless backup, and remote monitoring.\",\"challenge\":\"The site needed resilient hybrid power with lithium storage to support critical petroleum operations where grid quality and outages could disrupt production.\",\"client_name\":\"Petroleum project operator\",\"technologies\":[\"Studer hybrid inverter/charger\",\"Lithium batteries\",\"Hybrid energy management\"],\"client_sector\":\"Oil & energy\",\"delivery_year\":\"2025\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(60, 'project', 'amc-engineering-college-200kw-bangalore', 'AMC Engineering College — 200 kW Rooftop Solar', '200 kW rooftop solar installation for AMC Engineering College, Bangalore.', 'Turnkey rooftop solar delivery for AMC Engineering College covering module layout, inverter integration, and commissioning for campus energy offset in Bangalore.', 1, '[\"Solar EPC\",\"Rooftop\",\"Education\"]', '{\"Capacity\":\"200 kW\",\"Location\":\"Bangalore\",\"Highlight\":\"200 kW campus rooftop solar — Bangalore\"}', NULL, NULL, NULL, 'published', 1, 1, 1, NULL, '{\"scope\":\"Site assessment, rooftop mounting, module & inverter installation, electrical integration, testing, and handover.\",\"enabled\":true,\"location\":\"Bangalore\",\"outcomes\":[\"200 kW of on-site solar generation capacity\",\"Lower daytime campus grid draw\",\"Documented commissioning and operational handover\"],\"solution\":\"Zigma delivered a 200 kW rooftop solar EPC package with structured installation sequencing and commissioning.\",\"challenge\":\"The campus needed a sizable rooftop solar plant to reduce grid dependency without disrupting academic operations.\",\"client_name\":\"AMC Engineering College\",\"technologies\":[\"Rooftop solar modules\",\"String inverters\",\"LT integration\"],\"client_sector\":\"Education\",\"delivery_year\":\"2023\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(61, 'project', 'sri-rajalakshimi-agro-foods-600kw-tumkur', 'Sri Rajalakshimi Agro Foods — 600 kW Solar', '600 kW industrial solar installation for Sri Rajalakshimi Agro Foods, Tumkur.', 'Large-capacity industrial solar EPC for an agro-foods facility in Tumkur, engineered for high daytime process loads and long-term energy cost reduction.', 1, '[\"Solar EPC\",\"Industrial\",\"Agro\"]', '{\"Capacity\":\"600 kW\",\"Location\":\"Tumkur\",\"Highlight\":\"600 kW industrial solar — Tumkur agro plant\"}', NULL, NULL, NULL, 'published', 1, 2, 1, NULL, '{\"scope\":\"Engineering, supply, installation, commissioning, and performance validation for a 600 kW plant.\",\"enabled\":true,\"location\":\"Tumkur\",\"outcomes\":[\"600 kW solar capacity online for industrial operations\",\"Significant daytime energy offset for process loads\",\"Scalable platform for future capacity expansion\"],\"solution\":\"Executed a 600 kW solar EPC installation aligned to plant load profile and site constraints.\",\"challenge\":\"High process loads required a large solar plant sized for industrial daytime consumption and commercial payback.\",\"client_name\":\"Sri Rajalakshimi Agro Foods\",\"technologies\":[\"Industrial solar EPC\",\"Grid-tied inverters\",\"Plant electrical integration\"],\"client_sector\":\"Agro & food processing\",\"delivery_year\":\"2023\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(62, 'project', 'karnataka-rice-industries-200kw-tumkur', 'Karnataka Rice Industries — 200 kW Solar', '200 kW solar project for Karnataka Rice Industries, Tumkur.', 'Industrial rooftop/plant solar delivery for a rice processing facility, focused on reducing operating energy cost and stabilizing daytime power demand.', 1, '[\"Solar EPC\",\"Industrial\"]', '{\"Capacity\":\"200 kW\",\"Location\":\"Tumkur\",\"Highlight\":\"200 kW solar for rice industry — Tumkur\"}', NULL, NULL, NULL, 'published', 0, 3, 1, NULL, '{\"scope\":\"Solar EPC installation, electrical tie-in, testing, and commissioning.\",\"enabled\":true,\"location\":\"Tumkur\",\"outcomes\":[\"200 kW solar generation for process loads\",\"Improved daytime energy economics\",\"Reliable plant handover\"],\"solution\":\"Installed and commissioned a 200 kW solar plant matched to industrial operating hours.\",\"challenge\":\"Rice processing loads required reliable daytime generation to cut grid energy spend.\",\"client_name\":\"Karnataka Rice Industries\",\"technologies\":[\"Solar modules\",\"Inverters\",\"Industrial LT integration\"],\"client_sector\":\"Agro processing\",\"delivery_year\":\"2022\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(63, 'project', 'eshwari-agro-foods-200kw-tumkur', 'Eshwari Agro Foods — 200 kW Solar', '200 kW solar installation for Eshwari Agro Foods, Tumkur.', 'Commercial-industrial solar EPC for an agro-foods plant in Tumkur, delivering clean generation capacity for production loads.', 1, '[\"Solar EPC\",\"Agro\"]', '{\"Capacity\":\"200 kW\",\"Location\":\"Tumkur\",\"Highlight\":\"200 kW solar — agro foods plant, Tumkur\"}', NULL, NULL, NULL, 'published', 0, 4, 1, NULL, '{\"scope\":\"Design support, installation, commissioning, and documentation.\",\"enabled\":true,\"location\":\"Tumkur\",\"outcomes\":[\"200 kW solar capacity commissioned\",\"Lower grid dependency in daylight hours\",\"Operational handover completed\"],\"solution\":\"Delivered a 200 kW solar installation with commissioning for continuous plant use.\",\"challenge\":\"Facility needed dedicated solar capacity to offset rising industrial power costs.\",\"client_name\":\"Eshwari Agro Foods\",\"technologies\":[\"Solar EPC\",\"Grid-tied inverters\"],\"client_sector\":\"Agro & food processing\",\"delivery_year\":\"2022\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(64, 'project', 'shiva-stones-149kw-tumkur', 'Shiva Stones — 149 kW Solar', '149 kW solar project executed for Shiva Stones.', 'Industrial solar installation sized at 149 kW for stone-industry operations, supporting daytime energy offset and plant sustainability goals.', 1, '[\"Solar EPC\",\"Industrial\"]', '{\"Capacity\":\"149 kW\",\"Location\":\"Tumkur\",\"Highlight\":\"149 kW industrial solar — Shiva Stones\"}', NULL, NULL, NULL, 'published', 0, 5, 1, NULL, '{\"scope\":\"Solar EPC delivery including installation and commissioning.\",\"enabled\":true,\"location\":\"Tumkur\",\"outcomes\":[\"149 kW solar plant online\",\"Daytime energy cost reduction\",\"Stable plant electrical integration\"],\"solution\":\"Commissioned a 149 kW solar plant tailored to site load and available mounting area.\",\"challenge\":\"Stone processing operations needed cost-effective solar generation aligned to daytime production.\",\"client_name\":\"Shiva Stones\",\"technologies\":[\"Solar modules\",\"Inverters\"],\"client_sector\":\"Stone & industrial manufacturing\",\"delivery_year\":\"2022\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(65, 'project', 'mysore-drier-tech-55kw-tumkur', 'Mysore Drier Tech — 55 kW Solar', '55 kW solar installation for Mysore Drier Tech, Tumkur.', 'Compact industrial solar EPC for Mysore Drier Tech, delivering 55 kW of generation capacity for process and facility loads.', 1, '[\"Solar EPC\",\"Industrial\"]', '{\"Capacity\":\"55 kW\",\"Location\":\"Tumkur\",\"Highlight\":\"55 kW solar — Mysore Drier Tech, Tumkur\"}', NULL, NULL, NULL, 'published', 0, 6, 1, NULL, '{\"scope\":\"Survey, installation, commissioning, and handover.\",\"enabled\":true,\"location\":\"Tumkur\",\"outcomes\":[\"55 kW solar capacity delivered\",\"Improved daytime energy mix\",\"Clean handover documentation\"],\"solution\":\"Installed and commissioned a 55 kW solar system matched to facility demand.\",\"challenge\":\"Needed a right-sized solar plant for industrial drying operations without oversizing CapEx.\",\"client_name\":\"Mysore Drier Tech\",\"technologies\":[\"Rooftop/plant solar\",\"String inverters\"],\"client_sector\":\"Industrial manufacturing\",\"delivery_year\":\"2023\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(66, 'project', 'abb-ups-installation-bangalore-320kw', 'ABB UPS Installation — Bangalore (320 kW)', 'ABB UPS installation for critical power continuity in Bangalore (320 kW / 160 kVA × 2).', 'Industrial UPS installation and commissioning using ABB platforms (dual 160 kVA configuration) to protect critical loads at a Bangalore site.', 2, '[\"UPS\",\"ABB\",\"Critical Power\"]', '{\"Brand\":\"ABB\",\"Capacity\":\"320 kW (160 kVA × 2)\",\"Location\":\"Bangalore\",\"Highlight\":\"ABB UPS install — 320 kW class, Bangalore\"}', NULL, NULL, NULL, 'published', 1, 7, 1, NULL, '{\"scope\":\"UPS placement, electrical integration, battery interface, testing, and commissioning.\",\"enabled\":true,\"location\":\"Bangalore\",\"outcomes\":[\"ABB UPS platform commissioned for critical loads\",\"Redundant dual-unit topology for continuity\",\"Site-ready documentation and handover\"],\"solution\":\"Installed ABB UPS systems in a dual-unit configuration and commissioned for site continuity.\",\"challenge\":\"Critical loads required OEM-grade UPS protection with professional installation and commissioning.\",\"client_name\":\"Bangalore industrial / commercial site\",\"technologies\":[\"ABB UPS\",\"Battery banks\",\"Critical power commissioning\"],\"client_sector\":\"Industrial & infrastructure\",\"delivery_year\":\"2023\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(67, 'project', 'emudra-data-centre-ups-chennai-90kva', 'eMudhra Data Centre UPS — Chennai (90 kVA)', '90 kVA UPS installation for eMudhra data centre operations in Chennai.', 'Data-centre UPS installation and commissioning for eMudhra in Chennai, protecting IT/infrastructure loads with professional field execution.', 2, '[\"UPS\",\"Data Centre\",\"Critical Power\"]', '{\"Client\":\"eMudhra\",\"Capacity\":\"90 kVA\",\"Location\":\"Chennai\",\"Highlight\":\"90 kVA data-centre UPS — Chennai\"}', NULL, NULL, NULL, 'published', 1, 8, 1, NULL, '{\"scope\":\"UPS installation, battery integration, load testing support, and commissioning.\",\"enabled\":true,\"location\":\"Chennai\",\"outcomes\":[\"90 kVA UPS protecting data-centre loads\",\"Commissioned with operational handover\",\"Improved continuity posture for critical IT services\"],\"solution\":\"Supplied and commissioned a 90 kVA UPS system for data-centre continuity.\",\"challenge\":\"Data-centre loads required dependable UPS protection with clean installation in a live IT environment.\",\"client_name\":\"eMudhra\",\"technologies\":[\"UPS systems\",\"Battery banks\",\"Data-centre power\"],\"client_sector\":\"IT / data centre\",\"delivery_year\":\"2021\"}', '2026-08-13 00:10:56', '2026-08-13 00:10:56'),
(90, 'product', 'abb-industrial-server-ups', 'ABB Industrial & Server UPS', 'ABB UPS platforms for industrial plants, process control, and mission-critical server rooms.', 'Zigma supplies and supports ABB UPS lines spanning single-phase, three-phase standalone/modular, high-power, industrial, and specialized applications. Suitable for manufacturing plants, process industries, and data infrastructure where power continuity is non-negotiable.', 4, '[\"UPS\",\"ABB\",\"Industrial\"]', '{\"Brand\":\"ABB\",\"Support\":\"Supply, install, AMC-ready\",\"Highlight\":\"ABB UPS platforms for industrial plants, process control, and mission-critical server rooms.\",\"Applications\":\"Industrial / server / modular UPS\"}', 'On request', NULL, NULL, 'published', 1, 0, 1, NULL, '{\"scope\":\"Product supply, sizing guidance, installation support, and AMC transition.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned UPS continuity\",\"Scalable topologies for growth\",\"Serviceable with Zigma AMC desk\"],\"solution\":\"ABB UPS platforms configured for industrial machinery, control systems, and server environments.\",\"challenge\":\"Buyers need OEM-aligned ABB Industrial & Server UPS with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"ABB UPS\",\"Modular/standalone topologies\",\"Battery integration\"],\"client_sector\":\"Industrial & data infrastructure\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(91, 'product', 'apc-schneider-ups-systems', 'APC / Schneider UPS Systems', 'APC by Schneider Electric UPS solutions for IT, commercial, and industrial backup.', 'Authorized-aligned APC/Schneider UPS portfolio for IT rooms, commercial facilities, and industrial loads — with surge protection, voltage regulation, and battery-backed continuity.', 4, '[\"UPS\",\"APC\",\"Schneider\"]', '{\"Brand\":\"APC / Schneider Electric\",\"Highlight\":\"APC by Schneider Electric UPS solutions for IT, commercial, and industrial backup.\",\"Monitoring\":\"SNMP-ready options\",\"Applications\":\"IT / commercial / industrial\"}', 'On request', NULL, NULL, 'published', 1, 1, 1, NULL, '{\"scope\":\"Supply, commissioning support, battery health planning, and AMC options.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"APC/Schneider UPS systems selected for rack, room, and facility-level protection.\",\"challenge\":\"Buyers need OEM-aligned APC / Schneider UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"APC UPS\",\"Schneider ecosystem\",\"Battery management ready\"],\"client_sector\":\"IT & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(92, 'product', 'vertiv-ups-systems', 'Vertiv UPS Systems', 'Vertiv UPS platforms for data centres and critical facility power.', 'Vertiv UPS solutions for high-availability environments including data centres and critical facilities, backed by Zigma installation and service capability.', 4, '[\"UPS\",\"Vertiv\",\"Data Centre\"]', '{\"Brand\":\"Vertiv\",\"Focus\":\"Critical / data-centre UPS\",\"Highlight\":\"Vertiv UPS platforms for data centres and critical facility power.\"}', 'On request', NULL, NULL, 'published', 0, 2, 1, NULL, '{\"scope\":\"Supply of Vertiv UPS Systems, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Vertiv UPS platforms for data centres and critical facility power.\",\"challenge\":\"Buyers need OEM-aligned Vertiv UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"UPS\",\"Vertiv\",\"Data Centre\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(93, 'product', 'numeric-ups-systems', 'Numeric UPS Systems', 'Numeric UPS systems for commercial and industrial backup applications.', 'Numeric UPS portfolio supplied and supported by Zigma for commercial buildings, industrial loads, and IT backup needs.', 4, '[\"UPS\",\"Numeric\"]', '{\"Brand\":\"Numeric\",\"Highlight\":\"Numeric UPS systems for commercial and industrial backup applications.\",\"Applications\":\"Commercial / industrial\"}', 'On request', NULL, NULL, 'published', 0, 3, 1, NULL, '{\"scope\":\"Supply of Numeric UPS Systems, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Numeric UPS systems for commercial and industrial backup applications.\",\"challenge\":\"Buyers need OEM-aligned Numeric UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"UPS\",\"Numeric\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(94, 'product', 'eaton-ups-systems', 'Eaton UPS Systems', 'Eaton UPS solutions for enterprise and industrial power protection.', 'Eaton UPS systems for enterprise IT and industrial environments, with Zigma support for supply, commissioning, and maintenance.', 4, '[\"UPS\",\"Eaton\"]', '{\"Brand\":\"Eaton\",\"Highlight\":\"Eaton UPS solutions for enterprise and industrial power protection.\",\"Applications\":\"Enterprise / industrial\"}', 'On request', NULL, NULL, 'published', 0, 4, 1, NULL, '{\"scope\":\"Supply of Eaton UPS Systems, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Eaton UPS solutions for enterprise and industrial power protection.\",\"challenge\":\"Buyers need OEM-aligned Eaton UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"UPS\",\"Eaton\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(95, 'product', 'delta-ups-systems', 'Delta UPS Systems', 'Delta UPS platforms for industrial and IT continuity.', 'Delta UPS product line for industrial and IT backup applications, available through Zigma with installation and AMC pathways.', 4, '[\"UPS\",\"Delta\"]', '{\"Brand\":\"Delta\",\"Highlight\":\"Delta UPS platforms for industrial and IT continuity.\",\"Applications\":\"Industrial / IT\"}', 'On request', NULL, NULL, 'published', 0, 5, 1, NULL, '{\"scope\":\"Supply of Delta UPS Systems, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Delta UPS platforms for industrial and IT continuity.\",\"challenge\":\"Buyers need OEM-aligned Delta UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"UPS\",\"Delta\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(96, 'product', 'powerone-ups-systems', 'Powerone UPS Systems', 'Powerone UPS systems for commercial and industrial backup power.', 'Powerone UPS solutions supplied by Zigma for facilities needing dependable backup with local service support.', 4, '[\"UPS\",\"Powerone\"]', '{\"Brand\":\"Powerone\",\"Highlight\":\"Powerone UPS systems for commercial and industrial backup power.\",\"Applications\":\"Commercial / industrial\"}', 'On request', NULL, NULL, 'published', 0, 6, 1, NULL, '{\"scope\":\"Supply of Powerone UPS Systems, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Powerone UPS systems for commercial and industrial backup power.\",\"challenge\":\"Buyers need OEM-aligned Powerone UPS Systems with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"UPS\",\"Powerone\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:33', '2026-08-13 00:29:33'),
(97, 'product', 'studer-xtm-series', 'Studer XTM Series Hybrid Inverter/Charger', 'Modular Swiss Studer XTM hybrid inverter/charger for scalable off-grid and hybrid systems.', 'Studer XTM Series modular hybrid inverter/chargers deliver high-efficiency hybrid energy management, multi-chemistry battery support, remote monitoring, and parallel expansion for homes, telecom, and industrial sites.', 11, '[\"Studer\",\"Hybrid\",\"Inverter\"]', '{\"Type\":\"Modular hybrid inverter/charger\",\"Brand\":\"Studer\",\"Series\":\"XTM\",\"Batteries\":\"Lead-acid / lithium compatible\",\"Highlight\":\"Modular Swiss Studer XTM hybrid inverter/charger for scalable off-grid and hybrid systems.\"}', 'On request', NULL, NULL, 'published', 1, 7, 1, NULL, '{\"scope\":\"Product supply, system design guidance, commissioning support.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Scalable modular architecture\",\"Seamless backup during grid failure\",\"Multi-chemistry battery flexibility\"],\"solution\":\"Modular Studer XTM hybrid platforms for scalable solar + battery + grid architectures.\",\"challenge\":\"Buyers need OEM-aligned Studer XTM Series Hybrid Inverter/Charger with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Studer XTM\",\"Hybrid energy management\",\"Remote monitoring\"],\"client_sector\":\"Off-grid & hybrid power\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(98, 'product', 'studer-xth-series', 'Studer XTH Series High-Performance Hybrid', 'High-performance Studer XTH hybrid inverter for demanding hybrid and backup applications.', 'Studer XTH Series high-performance hybrid inverters are engineered for robust hybrid energy management with Swiss durability, efficient conversion, and reliable backup behaviour.', 11, '[\"Studer\",\"Hybrid\",\"XTH\"]', '{\"Type\":\"High-performance hybrid inverter\",\"Brand\":\"Studer\",\"Series\":\"XTH\",\"Highlight\":\"High-performance Studer XTH hybrid inverter for demanding hybrid and backup applications.\"}', 'On request', NULL, NULL, 'published', 1, 8, 1, NULL, '{\"scope\":\"Supply of Studer XTH Series High-Performance Hybrid, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"High-performance Studer XTH hybrid inverter for demanding hybrid and backup applications.\",\"challenge\":\"Buyers need OEM-aligned Studer XTH Series High-Performance Hybrid with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Studer\",\"Hybrid\",\"XTH\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(99, 'product', 'studer-xts-series', 'Studer XTS Series Compact Hybrid', 'Compact Studer XTS hybrid inverter/charger for space-efficient hybrid installations.', 'Studer XTS Series compact hybrid inverter/chargers suit installations needing Swiss hybrid performance in a smaller footprint for residential and light-commercial applications.', 11, '[\"Studer\",\"Hybrid\",\"XTS\"]', '{\"Type\":\"Compact hybrid inverter/charger\",\"Brand\":\"Studer\",\"Series\":\"XTS\",\"Highlight\":\"Compact Studer XTS hybrid inverter/charger for space-efficient hybrid installations.\"}', 'On request', NULL, NULL, 'published', 0, 9, 1, NULL, '{\"scope\":\"Supply of Studer XTS Series Compact Hybrid, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Compact Studer XTS hybrid inverter/charger for space-efficient hybrid installations.\",\"challenge\":\"Buyers need OEM-aligned Studer XTS Series Compact Hybrid with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Studer\",\"Hybrid\",\"XTS\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(100, 'product', 'kirloskar-solar-modules', 'Kirloskar Solar Modules', 'Kirloskar Solar modules for residential, commercial, and industrial rooftops and plants.', 'High-efficiency Kirloskar Solar modules designed for durability in harsh weather, low maintenance, and customizable system capacities — backed by Zigma solar EPC and O&M capability.', 12, '[\"Solar\",\"Kirloskar\",\"Modules\"]', '{\"Brand\":\"Kirloskar Solar\",\"Focus\":\"High efficiency & durability\",\"Highlight\":\"Kirloskar Solar modules for residential, commercial, and industrial rooftops and plants.\",\"Applications\":\"Residential / commercial / industrial\"}', 'On request', NULL, NULL, 'published', 1, 10, 1, NULL, '{\"scope\":\"Module supply guidance, system integration, and commissioning support.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Kirloskar solar modules for rooftop and plant applications with Zigma EPC delivery.\",\"challenge\":\"Buyers need OEM-aligned Kirloskar Solar Modules with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Kirloskar Solar modules\",\"Rooftop mounting\",\"Grid-tied systems\"],\"client_sector\":\"C&I solar\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(101, 'product', 'on-grid-string-solar-inverters', 'On-Grid String Solar Inverters', 'On-grid string inverters for commercial and industrial solar plants.', 'On-grid string inverter solutions for exporting/self-consuming solar generation with reliable MPPT performance and plant monitoring readiness.', 12, '[\"Solar\",\"On-Grid\",\"Inverter\"]', '{\"Type\":\"On-grid string inverter\",\"Highlight\":\"On-grid string inverters for commercial and industrial solar plants.\",\"Application\":\"C&I solar\"}', 'On request', NULL, NULL, 'published', 1, 11, 1, NULL, '{\"scope\":\"Supply of On-Grid String Solar Inverters, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"On-grid string inverters for commercial and industrial solar plants.\",\"challenge\":\"Buyers need OEM-aligned On-Grid String Solar Inverters with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Solar\",\"On-Grid\",\"Inverter\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(102, 'product', 'off-grid-solar-inverters', 'Off-Grid Solar Inverters', 'Off-grid solar inverters for battery-backed standalone and hybrid sites.', 'Off-grid solar inverter solutions for sites needing battery-backed autonomy, remote locations, and hybrid backup architectures.', 12, '[\"Solar\",\"Off-Grid\",\"Inverter\"]', '{\"Type\":\"Off-grid solar inverter\",\"Highlight\":\"Off-grid solar inverters for battery-backed standalone and hybrid sites.\",\"Application\":\"Standalone / hybrid\"}', 'On request', NULL, NULL, 'published', 0, 12, 1, NULL, '{\"scope\":\"Supply of Off-Grid Solar Inverters, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Off-grid solar inverters for battery-backed standalone and hybrid sites.\",\"challenge\":\"Buyers need OEM-aligned Off-Grid Solar Inverters with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Solar\",\"Off-Grid\",\"Inverter\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(103, 'product', 'on-off-grid-solar-combos', 'On-Grid & Off-Grid Solar Combos', 'Combined on-grid and off-grid solar packages for flexible site energy strategies.', 'Packaged solar combo solutions blending on-grid and off-grid capabilities for facilities that need both export/self-consumption and backup autonomy.', 12, '[\"Solar\",\"Hybrid Combo\"]', '{\"Type\":\"On/Off-grid combo\",\"Highlight\":\"Combined on-grid and off-grid solar packages for flexible site energy strategies.\",\"Application\":\"Flexible solar architectures\"}', 'On request', NULL, NULL, 'published', 0, 13, 1, NULL, '{\"scope\":\"Supply of On-Grid & Off-Grid Solar Combos, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Combined on-grid and off-grid solar packages for flexible site energy strategies.\",\"challenge\":\"Buyers need OEM-aligned On-Grid & Off-Grid Solar Combos with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Solar\",\"Hybrid Combo\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(104, 'product', 'microtek-inverters', 'Microtek Inverters', 'Microtek inverters for home, office, and hybrid solar backup applications.', 'Microtek inverter range for residential and office backup, including solar-compatible hybrid options. Zigma supports selection, supply, and service.', 13, '[\"Inverter\",\"Microtek\"]', '{\"Brand\":\"Microtek\",\"Highlight\":\"Microtek inverters for home, office, and hybrid solar backup applications.\",\"Applications\":\"Home / office / hybrid solar\"}', 'On request', NULL, NULL, 'published', 1, 14, 1, NULL, '{\"scope\":\"Supply of Microtek Inverters, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Microtek inverters for home, office, and hybrid solar backup applications.\",\"challenge\":\"Buyers need OEM-aligned Microtek Inverters with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Inverter\",\"Microtek\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(105, 'product', 'luminous-inverters', 'Luminous Inverters', 'Luminous inverters for residential, commercial, and industrial backup power.', 'Luminous inverter solutions spanning home backup to commercial/industrial use, including solar-compatible models supported by Zigma.', 13, '[\"Inverter\",\"Luminous\"]', '{\"Brand\":\"Luminous\",\"Highlight\":\"Luminous inverters for residential, commercial, and industrial backup power.\",\"Applications\":\"Residential / commercial / industrial\"}', 'On request', NULL, NULL, 'published', 1, 15, 1, NULL, '{\"scope\":\"Supply of Luminous Inverters, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Luminous inverters for residential, commercial, and industrial backup power.\",\"challenge\":\"Buyers need OEM-aligned Luminous Inverters with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Inverter\",\"Luminous\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(106, 'product', 'eastman-inverters', 'Eastman Inverters', 'Eastman inverters for reliable backup and solar-compatible power conversion.', 'Eastman inverter lineup for homes and businesses needing dependable DC–AC conversion and backup readiness.', 13, '[\"Inverter\",\"Eastman\"]', '{\"Brand\":\"Eastman\",\"Highlight\":\"Eastman inverters for reliable backup and solar-compatible power conversion.\",\"Applications\":\"Backup / solar-compatible\"}', 'On request', NULL, NULL, 'published', 0, 16, 1, NULL, '{\"scope\":\"Supply of Eastman Inverters, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Eastman inverters for reliable backup and solar-compatible power conversion.\",\"challenge\":\"Buyers need OEM-aligned Eastman Inverters with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Inverter\",\"Eastman\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(107, 'product', 'amaron-quanta-batteries', 'Amaron Quanta Batteries', 'Amaron Quanta sealed VRLA batteries for UPS, inverter, and telecom loads.', 'Maintenance-free Amaron Quanta VRLA batteries engineered for deep-cycle inverter/UPS duty, spill-proof construction, and long service life in homes, offices, and industry.', 5, '[\"Battery\",\"Amaron Quanta\",\"VRLA\"]', '{\"Brand\":\"Amaron Quanta\",\"Chemistry\":\"VRLA / sealed MF\",\"Highlight\":\"Amaron Quanta sealed VRLA batteries for UPS, inverter, and telecom loads.\",\"Applications\":\"UPS / inverter / telecom\"}', 'On request', NULL, NULL, 'published', 1, 17, 1, NULL, '{\"scope\":\"Battery selection, string sizing guidance, installation support, health checks.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Amaron Quanta VRLA banks sized for UPS autonomy and inverter backup.\",\"challenge\":\"Buyers need OEM-aligned Amaron Quanta Batteries with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"VRLA batteries\",\"UPS autonomy sizing\"],\"client_sector\":\"UPS & backup power\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(108, 'product', 'exide-batteries', 'Exide Batteries', 'Exide deep-cycle and UPS batteries for backup and solar applications.', 'Exide battery solutions for inverter, UPS, solar, and industrial backup duty — supplied and supported by Zigma with health-check and replacement services.', 5, '[\"Battery\",\"Exide\"]', '{\"Brand\":\"Exide\",\"Highlight\":\"Exide deep-cycle and UPS batteries for backup and solar applications.\",\"Applications\":\"UPS / inverter / solar\"}', 'On request', NULL, NULL, 'published', 1, 18, 1, NULL, '{\"scope\":\"Supply of Exide Batteries, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Exide deep-cycle and UPS batteries for backup and solar applications.\",\"challenge\":\"Buyers need OEM-aligned Exide Batteries with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Battery\",\"Exide\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(109, 'product', 'eastman-batteries', 'Eastman Batteries', 'Eastman batteries for inverter and UPS backup systems.', 'Eastman battery range for residential and commercial backup applications, available through Zigma with installation and maintenance support.', 5, '[\"Battery\",\"Eastman\"]', '{\"Brand\":\"Eastman\",\"Highlight\":\"Eastman batteries for inverter and UPS backup systems.\",\"Applications\":\"Inverter / UPS backup\"}', 'On request', NULL, NULL, 'published', 0, 19, 1, NULL, '{\"scope\":\"Supply of Eastman Batteries, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Eastman batteries for inverter and UPS backup systems.\",\"challenge\":\"Buyers need OEM-aligned Eastman Batteries with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"Battery\",\"Eastman\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(110, 'product', 'zigma-static-voltage-regulators', 'Zigma Static Voltage Regulators (Optimus Series)', 'PWM/IGBT static voltage regulators with ±1% regulation and ≤20 ms correction.', 'Zigma Optimus Series static voltage regulators use high-frequency IGBT/PWM technology for real-time ±1% regulation without tap switching. Ideal for sensitive industrial, IT, medical, and engineering loads. Isolation transformers also available for noise/spike attenuation and neutral isolation.', 14, '[\"Stabilizer\",\"SVR\",\"Zigma\"]', '{\"Brand\":\"Zigma\",\"Series\":\"Optimus\",\"Highlight\":\"PWM/IGBT static voltage regulators with ±1% regulation and ≤20 ms correction.\",\"Correction\":\"≤20 ms (1 cycle)\",\"Regulation\":\"±1% real-time\",\"Technology\":\"PWM / IGBT solid-state\"}', 'On request', NULL, NULL, 'published', 1, 20, 1, NULL, '{\"scope\":\"Product selection, supply, and commissioning support for SVR / isolation transformer packages.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Precise voltage conditioning\",\"No mechanical tap wear\",\"Protection for sensitive equipment\"],\"solution\":\"Solid-state SVR platforms delivering continuous conditioned power free from surge/spike/brown-out events.\",\"challenge\":\"Buyers need OEM-aligned Zigma Static Voltage Regulators (Optimus Series) with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"IGBT PWM SVR\",\"Isolation transformers\"],\"client_sector\":\"Industrial & sensitive loads\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(111, 'product', 'apc-battery-management-system', 'APC Battery Management System (BMS)', 'APC BMS modules, sensors, and harnesses for UPS battery health monitoring.', 'APC Battery Management System portfolio including current sensors (incl. 2000 Amp UPS sensor), main/expansion modules, and management harnesses (25/50/100 ft) to monitor UPS battery health, safety, and life.', 15, '[\"BMS\",\"APC\",\"Battery Monitoring\"]', '{\"Brand\":\"APC\",\"Highlight\":\"APC BMS modules, sensors, and harnesses for UPS battery health monitoring.\",\"Components\":\"Sensors, main/EM modules, harnesses\",\"Application\":\"UPS battery monitoring\"}', 'On request', NULL, NULL, 'published', 1, 21, 1, NULL, '{\"scope\":\"BMS product supply, harness selection, and integration guidance.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"APC BMS components for continuous battery health visibility and safer UPS operation.\",\"challenge\":\"Buyers need OEM-aligned APC Battery Management System (BMS) with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"APC BMS\",\"Current sensors\",\"Battery harness kits\"],\"client_sector\":\"UPS & critical power\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(112, 'product', 'utility-scale-bess', 'Utility-Scale Battery Energy Storage (BESS)', 'Containerised and plant-scale BESS for peak shaving, backup, and renewable firming.', 'Zigma designs and delivers utility- and C&I-scale battery energy storage systems — from containerised racks to plant-integrated storage — with EMS coordination, PCS integration, and lifecycle service support for peak shaving, backup, and solar firming.', 42, '[\"BESS\",\"EMS\",\"Storage\",\"Utility\"]', '{\"Type\":\"Utility / C&I BESS\",\"Brand\":\"BESS\",\"Focus\":\"Peak shaving, backup, renewable firming\",\"Highlight\":\"Containerised and plant-scale BESS for peak shaving, backup, and renewable firming.\",\"Integration\":\"PCS + EMS + solar/grid\"}', 'On request', NULL, NULL, 'published', 1, 22, 1, NULL, '{\"scope\":\"System design, supply coordination, EMS setup, and field commissioning.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Lower peak demand costs\",\"Improved renewable utilisation\",\"Grid-independent backup windows\"],\"solution\":\"Engineered BESS packages with EMS controls, PCS integration, and commissioning for peak shaving and backup duty.\",\"challenge\":\"Sites need dispatchable storage to cut demand charges, ride through outages, and firm intermittent renewables.\",\"technologies\":[\"Lithium BESS\",\"PCS\",\"Energy management system\"],\"client_sector\":\"Utility & C&I energy storage\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(113, 'product', 'peak-shaving-ems-bess', 'Peak Shaving & Energy Management (EMS)', 'BESS + EMS packages that cut demand charges and automate energy dispatch.', 'Peak-shaving and EMS-led BESS solutions that monitor site load, dispatch stored energy at the right moments, and coordinate with solar or grid supply — ideal for factories, campuses, and commercial facilities with high demand tariffs.', 42, '[\"BESS\",\"EMS\",\"Peak Shaving\"]', '{\"Type\":\"BESS + EMS\",\"Brand\":\"BESS\",\"Focus\":\"Demand charge reduction & automated dispatch\",\"Highlight\":\"BESS + EMS packages that cut demand charges and automate energy dispatch.\",\"Applications\":\"Factories / campuses / commercial\"}', 'On request', NULL, NULL, 'published', 1, 23, 1, NULL, '{\"scope\":\"Supply of Peak Shaving & Energy Management (EMS), application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"BESS + EMS packages that cut demand charges and automate energy dispatch.\",\"challenge\":\"Buyers need OEM-aligned Peak Shaving & Energy Management (EMS) with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"BESS\",\"EMS\",\"Peak Shaving\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(114, 'product', 'ev-charging-infrastructure', 'EV Charging Infrastructure', 'AC/DC EV charging infrastructure for campuses, fleets, and commercial sites.', 'End-to-end EV charging infrastructure — AC and DC chargers, electrical design, installation, and commissioning — for corporate campuses, fleet depots, malls, and public parking. Zigma also integrates chargers with solar and BESS for lower operating cost.', 43, '[\"EV\",\"Smart\",\"Infrastructure\"]', '{\"Type\":\"AC / DC EV charging\",\"Brand\":\"EV\",\"Highlight\":\"AC/DC EV charging infrastructure for campuses, fleets, and commercial sites.\",\"Integration\":\"Standalone or solar + BESS\",\"Applications\":\"Campus / fleet / commercial\"}', 'On request', NULL, NULL, 'published', 1, 24, 1, NULL, '{\"scope\":\"Site survey, charger selection, electrical works, commissioning, and handover.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"Ready-to-use charging bays\",\"Controlled peak demand\",\"Path to solar-backed charging\"],\"solution\":\"Right-sized AC/DC charger layouts with electrical upgrades and optional solar/BESS buffering.\",\"challenge\":\"Sites need reliable EV charging capacity without overloading electrical infrastructure.\",\"technologies\":[\"AC chargers\",\"DC fast chargers\",\"Load management\"],\"client_sector\":\"Fleet & commercial mobility\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(115, 'product', 'smart-ev-charging-solutions', 'Smart EV Charging Solutions', 'Load-managed smart charging with monitoring and fleet-ready controls.', 'Smart EV charging solutions with load management, remote monitoring, and access control — designed so multiple chargers share available capacity safely while operators track utilisation and energy cost.', 43, '[\"EV\",\"Smart\",\"Load Management\"]', '{\"Type\":\"Smart / networked charging\",\"Brand\":\"EV\",\"Focus\":\"Load management & monitoring\",\"Highlight\":\"Load-managed smart charging with monitoring and fleet-ready controls.\",\"Applications\":\"Multi-bay campuses & fleets\"}', 'On request', NULL, NULL, 'published', 1, 25, 1, NULL, '{\"scope\":\"Supply of Smart EV Charging Solutions, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Load-managed smart charging with monitoring and fleet-ready controls.\",\"challenge\":\"Buyers need OEM-aligned Smart EV Charging Solutions with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"EV\",\"Smart\",\"Load Management\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34'),
(116, 'product', 'solar-bess-ev-charging', 'Solar + BESS + EV Integrated Charging', 'Integrated solar, storage, and EV charging for lower cost and greener mobility.', 'Integrated Solar + BESS + EV architectures that charge vehicles from on-site generation and stored energy, reducing grid dependence and enabling green mobility programs for campuses and fleets.', 43, '[\"EV\",\"Solar\",\"BESS\"]', '{\"Type\":\"Solar + BESS + EV\",\"Brand\":\"EV\",\"Focus\":\"On-site generation + storage + charging\",\"Highlight\":\"Integrated solar, storage, and EV charging for lower cost and greener mobility.\",\"Applications\":\"Campuses / fleets / green mobility\"}', 'On request', NULL, NULL, 'published', 0, 26, 1, NULL, '{\"scope\":\"Supply of Solar + BESS + EV Integrated Charging, application sizing guidance, installation/commissioning support, and AMC-ready documentation.\",\"enabled\":true,\"location\":\"India\",\"outcomes\":[\"OEM-aligned product fit for the target application\",\"Clear sizing and commissioning support from Zigma\",\"Service/AMC pathway for long-term reliability\"],\"solution\":\"Integrated solar, storage, and EV charging for lower cost and greener mobility.\",\"challenge\":\"Buyers need OEM-aligned Solar + BESS + EV Integrated Charging with correct sizing guidance, installation support, and a clear service pathway.\",\"technologies\":[\"EV\",\"Solar\",\"BESS\"],\"client_sector\":\"Industrial & commercial facilities\"}', '2026-08-13 00:29:34', '2026-08-13 00:29:34');

-- ----------------------------
-- Table `catalog_media`
-- ----------------------------
DROP TABLE IF EXISTS `catalog_media`;
CREATE TABLE `catalog_media` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_id` int unsigned NOT NULL,
  `kind` enum('image','video','svg') NOT NULL DEFAULT 'image',
  `url` varchar(500) NOT NULL,
  `alt` varchar(255) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_item_sort` (`item_id`,`sort_order`),
  CONSTRAINT `fk_media_item` FOREIGN KEY (`item_id`) REFERENCES `catalog_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `catalog_media` (`id`, `item_id`, `kind`, `url`, `alt`, `sort_order`, `is_primary`, `created_at`) VALUES
(56, 53, 'image', '/assets/images/seed-service-field.jpg', 'Field Installation & Commissioning', 0, 1, '2026-08-13 00:10:50'),
(57, 54, 'image', '/assets/images/seed-service-ups-amc.jpg', 'UPS Annual Maintenance Contract (AMC)', 0, 1, '2026-08-13 00:10:50'),
(58, 55, 'image', '/assets/images/seed-service-ups-repair.jpg', 'UPS Repair & Reverse Engineering Support', 0, 1, '2026-08-13 00:10:50'),
(59, 56, 'image', '/assets/images/seed-service-ups-rental.jpg', 'UPS Rental', 0, 1, '2026-08-13 00:10:50'),
(60, 57, 'image', '/assets/images/seed-service-solar-om.jpg', 'Solar O&M / Maintenance Service', 0, 1, '2026-08-13 00:10:50'),
(61, 58, 'image', '/assets/images/seed-service-design.jpg', 'Design & Outsource Support (EPLAN & AutoCAD)', 0, 1, '2026-08-13 00:10:50'),
(62, 59, 'image', '/assets/images/seed-project-petroleum.jpg', 'Studer Hybrid + Lithium — Petroleum Project', 0, 1, '2026-08-13 00:10:56'),
(63, 60, 'image', '/assets/images/seed-project-amc-college.jpg', 'AMC Engineering College — 200 kW Rooftop Solar', 0, 1, '2026-08-13 00:10:56'),
(64, 61, 'image', '/assets/images/seed-project-rajalakshimi.jpg', 'Sri Rajalakshimi Agro Foods — 600 kW Solar', 0, 1, '2026-08-13 00:10:56'),
(65, 62, 'image', '/assets/images/seed-project-karnataka-rice.jpg', 'Karnataka Rice Industries — 200 kW Solar', 0, 1, '2026-08-13 00:10:56'),
(66, 63, 'image', '/assets/images/seed-project-eshwari.jpg', 'Eshwari Agro Foods — 200 kW Solar', 0, 1, '2026-08-13 00:10:56'),
(67, 64, 'image', '/assets/images/seed-project-shiva-stones.jpg', 'Shiva Stones — 149 kW Solar', 0, 1, '2026-08-13 00:10:56'),
(68, 65, 'image', '/assets/images/seed-project-mysore-drier.jpg', 'Mysore Drier Tech — 55 kW Solar', 0, 1, '2026-08-13 00:10:56'),
(69, 66, 'image', '/assets/images/seed-project-abb-ups.jpg', 'ABB UPS Installation — Bangalore (320 kW)', 0, 1, '2026-08-13 00:10:56'),
(70, 67, 'image', '/assets/images/seed-project-emudra.jpg', 'eMudhra Data Centre UPS — Chennai (90 kVA)', 0, 1, '2026-08-13 00:10:56'),
(93, 90, 'image', '/assets/images/seed-abb-ups.jpg', 'ABB Industrial & Server UPS', 0, 1, '2026-08-13 00:29:33'),
(94, 91, 'image', '/assets/images/seed-apc-ups.jpg', 'APC / Schneider UPS Systems', 0, 1, '2026-08-13 00:29:33'),
(95, 92, 'image', '/assets/images/seed-vertiv-ups.jpg', 'Vertiv UPS Systems', 0, 1, '2026-08-13 00:29:33'),
(96, 93, 'image', '/assets/images/seed-numeric-ups.jpg', 'Numeric UPS Systems', 0, 1, '2026-08-13 00:29:33'),
(97, 94, 'image', '/assets/images/seed-eaton-ups.jpg', 'Eaton UPS Systems', 0, 1, '2026-08-13 00:29:33'),
(98, 95, 'image', '/assets/images/seed-delta-ups.jpg', 'Delta UPS Systems', 0, 1, '2026-08-13 00:29:33'),
(99, 96, 'image', '/assets/images/seed-powerone-ups.jpg', 'Powerone UPS Systems', 0, 1, '2026-08-13 00:29:34'),
(100, 97, 'image', '/assets/images/seed-studer-xtm.jpg', 'Studer XTM Series Hybrid Inverter/Charger', 0, 1, '2026-08-13 00:29:34'),
(101, 98, 'image', '/assets/images/seed-studer-xth.jpg', 'Studer XTH Series High-Performance Hybrid', 0, 1, '2026-08-13 00:29:34'),
(102, 99, 'image', '/assets/images/seed-studer-xts.jpg', 'Studer XTS Series Compact Hybrid', 0, 1, '2026-08-13 00:29:34'),
(103, 100, 'image', '/assets/images/seed-solar-modules.jpg', 'Kirloskar Solar Modules', 0, 1, '2026-08-13 00:29:34'),
(104, 101, 'image', '/assets/images/seed-ongrid-inverter.jpg', 'On-Grid String Solar Inverters', 0, 1, '2026-08-13 00:29:34'),
(105, 102, 'image', '/assets/images/seed-offgrid-inverter.jpg', 'Off-Grid Solar Inverters', 0, 1, '2026-08-13 00:29:34'),
(106, 103, 'image', '/assets/images/seed-solar-combo.jpg', 'On-Grid & Off-Grid Solar Combos', 0, 1, '2026-08-13 00:29:34'),
(107, 104, 'image', '/assets/images/seed-microtek-inverter.jpg', 'Microtek Inverters', 0, 1, '2026-08-13 00:29:34'),
(108, 105, 'image', '/assets/images/seed-luminous-inverter.jpg', 'Luminous Inverters', 0, 1, '2026-08-13 00:29:34'),
(109, 106, 'image', '/assets/images/seed-eastman-inverter.jpg', 'Eastman Inverters', 0, 1, '2026-08-13 00:29:34'),
(110, 107, 'image', '/assets/images/seed-amaron-battery.jpg', 'Amaron Quanta Batteries', 0, 1, '2026-08-13 00:29:34'),
(111, 108, 'image', '/assets/images/seed-exide-battery.jpg', 'Exide Batteries', 0, 1, '2026-08-13 00:29:34'),
(112, 109, 'image', '/assets/images/seed-eastman-battery.jpg', 'Eastman Batteries', 0, 1, '2026-08-13 00:29:34'),
(113, 110, 'image', '/assets/images/seed-stabilizer-optimus.png', 'Zigma Static Voltage Regulators (Optimus Series)', 0, 1, '2026-08-13 00:29:34'),
(114, 111, 'image', '/assets/images/seed-bms-apc.png', 'APC Battery Management System (BMS)', 0, 1, '2026-08-13 00:29:34'),
(115, 112, 'image', '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', 'Utility-Scale Battery Energy Storage (BESS)', 0, 1, '2026-08-13 00:29:34'),
(116, 113, 'image', '/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg', 'Peak Shaving & Energy Management (EMS)', 0, 1, '2026-08-13 00:29:34'),
(117, 114, 'image', '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg', 'EV Charging Infrastructure', 0, 1, '2026-08-13 00:29:34'),
(118, 115, 'image', '/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg', 'Smart EV Charging Solutions', 0, 1, '2026-08-13 00:29:34'),
(119, 116, 'image', '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', 'Solar + BESS + EV Integrated Charging', 0, 1, '2026-08-13 00:29:34');

-- ----------------------------
-- Table `catalog_page_settings`
-- ----------------------------
DROP TABLE IF EXISTS `catalog_page_settings`;
CREATE TABLE `catalog_page_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `item_type` enum('project','product','service') NOT NULL,
  `layout` enum('grid','list') NOT NULL DEFAULT 'grid',
  `grid_columns` tinyint unsigned NOT NULL DEFAULT '3',
  `filters_json` json DEFAULT NULL,
  `search_fields_json` json DEFAULT NULL,
  `card_fields_json` json DEFAULT NULL,
  `modal_fields_json` json DEFAULT NULL,
  `hero_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `hero_autoplay_ms` int unsigned NOT NULL DEFAULT '6000',
  `hero_item_ids_json` json DEFAULT NULL,
  `hero_eyebrow` varchar(160) DEFAULT NULL,
  `hero_title` varchar(255) DEFAULT NULL,
  `hero_lead` text,
  `visual_style` enum('classic','premium','glass','minimal','bold-corporate') NOT NULL DEFAULT 'premium',
  `hero_variant` enum('standard','spotlight') NOT NULL DEFAULT 'spotlight',
  `loading_skeleton_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `reveal_animation_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `premium_borders_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_type` (`item_type`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `catalog_page_settings` (`id`, `item_type`, `layout`, `grid_columns`, `filters_json`, `search_fields_json`, `card_fields_json`, `modal_fields_json`, `hero_enabled`, `hero_autoplay_ms`, `hero_item_ids_json`, `hero_eyebrow`, `hero_title`, `hero_lead`, `visual_style`, `hero_variant`, `loading_skeleton_enabled`, `reveal_animation_enabled`, `premium_borders_enabled`, `updated_at`) VALUES
(1, 'project', 'grid', 3, '[\"category\",\"tags\"]', '[\"title\",\"summary\",\"tags\"]', '[\"title\",\"summary\",\"category\",\"primary_image\"]', '[\"title\",\"description\",\"specs\",\"media\",\"enquiry\"]', 1, 6000, NULL, 'Selected Projects', 'Projects engineered for performance and long-term reliability.', 'Browse selected delivery highlights, then dive into the full portfolio below.', 'premium', 'spotlight', 1, 1, 1, '2026-08-12 13:04:22'),
(2, 'product', 'grid', 3, '[\"category\",\"tags\"]', '[\"title\",\"summary\",\"tags\"]', '[\"title\",\"summary\",\"price_label\",\"primary_image\"]', '[\"title\",\"description\",\"specs\",\"media\",\"enquiry\"]', 1, 6000, NULL, 'Product Spotlight', 'Configured power and automation products for critical infrastructure.', 'Highlight priority products in the hero while keeping the rest of the catalog fully searchable.', 'premium', 'spotlight', 1, 1, 1, '2026-08-12 13:04:22'),
(3, 'service', 'grid', 3, '[\"category\",\"tags\"]', '[\"title\",\"summary\",\"tags\"]', '[\"title\",\"summary\",\"category\",\"primary_image\"]', '[\"title\",\"description\",\"specs\",\"media\",\"enquiry\"]', 1, 6000, '[14,13]', 'Service Spotlight', 'End-to-end services for uptime, efficiency, and expansion.', 'Feature selected service capabilities in a rotating hero to guide visitors before they browse.', 'premium', 'spotlight', 1, 1, 1, '2026-08-12 13:41:01');

-- ----------------------------
-- Table `css_overrides`
-- ----------------------------
DROP TABLE IF EXISTS `css_overrides`;
CREATE TABLE `css_overrides` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `version` int NOT NULL,
  `css_text` mediumtext NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `published_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_css_status_version` (`status`,`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (empty)

-- ----------------------------
-- Table `enquiries`
-- ----------------------------
DROP TABLE IF EXISTS `enquiries`;
CREATE TABLE `enquiries` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `form_id` int unsigned DEFAULT NULL,
  `item_id` int unsigned DEFAULT NULL,
  `item_type` enum('project','product','service','general') DEFAULT NULL,
  `payload_json` json NOT NULL,
  `status` enum('new','in_progress','closed') NOT NULL DEFAULT 'new',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_enq_form` (`form_id`),
  KEY `fk_enq_item` (`item_id`),
  KEY `idx_enq_status_created` (`status`,`created_at`),
  CONSTRAINT `fk_enq_form` FOREIGN KEY (`form_id`) REFERENCES `form_definitions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_enq_item` FOREIGN KEY (`item_id`) REFERENCES `catalog_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `enquiries` (`id`, `form_id`, `item_id`, `item_type`, `payload_json`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'product', '{\"name\":\"Santhosh HS\",\"email\":\"iamsanthosh@gmail.com\",\"phone\":\"09972800544\",\"message\":\"check\"}', 'new', '2026-08-12 07:49:21', '2026-08-12 07:49:21'),
(2, 1, NULL, 'general', '{\"name\":\"Santhosh HS\",\"role\":\"Solar Design Engineer\",\"email\":\"iamsanthosh@gmail.com\",\"phone\":\"09972800544\",\"source\":\"careers_apply\",\"message\":null,\"experience\":null,\"resume_url\":\"/uploads/resumes/1786509635889-damqsr2i.pdf\",\"resume_mime\":\"application/pdf\",\"resume_name\":\"zigma-technologies-brochure-5x9in.pdf\"}', 'new', '2026-08-12 10:10:35', '2026-08-12 10:10:35');

-- ----------------------------
-- Table `form_definitions`
-- ----------------------------
DROP TABLE IF EXISTS `form_definitions`;
CREATE TABLE `form_definitions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `form_key` varchar(80) NOT NULL,
  `name` varchar(160) NOT NULL,
  `item_type` enum('project','product','service','general') DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `form_key` (`form_key`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `form_definitions` (`id`, `form_key`, `name`, `item_type`, `enabled`, `created_at`, `updated_at`) VALUES
(1, 'enquiry_default', 'Default Enquiry Form', 'general', 1, '2026-08-12 06:50:35', '2026-08-12 06:50:35');

-- ----------------------------
-- Table `form_fields`
-- ----------------------------
DROP TABLE IF EXISTS `form_fields`;
CREATE TABLE `form_fields` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `form_id` int unsigned NOT NULL,
  `field_name` varchar(80) NOT NULL,
  `label` varchar(160) NOT NULL,
  `field_type` enum('text','email','tel','textarea','select','number','checkbox') NOT NULL DEFAULT 'text',
  `required` tinyint(1) NOT NULL DEFAULT '0',
  `options_json` json DEFAULT NULL,
  `placeholder` varchar(255) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `validation_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_form_field_name` (`form_id`,`field_name`),
  KEY `idx_fields_form_sort` (`form_id`,`sort_order`),
  CONSTRAINT `fk_fields_form` FOREIGN KEY (`form_id`) REFERENCES `form_definitions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `form_fields` (`id`, `form_id`, `field_name`, `label`, `field_type`, `required`, `options_json`, `placeholder`, `sort_order`, `enabled`, `validation_json`) VALUES
(1, 1, 'name', 'Full Name', 'text', 1, NULL, 'Your name', 1, 1, NULL),
(2, 1, 'email', 'Email', 'email', 1, NULL, 'you@company.com', 2, 1, NULL),
(3, 1, 'phone', 'Phone', 'tel', 1, NULL, '+91 ...', 3, 1, NULL),
(4, 1, 'company', 'Company', 'text', 0, NULL, 'Company name', 5, 1, NULL),
(5, 1, 'message', 'Message', 'textarea', 0, NULL, 'Tell us about your requirement', 6, 1, NULL),
(6, 1, 'subject', 'I\'m Getting in Touch About', 'select', 1, '[\"Solar Solution\",\"UPS Solution\",\"BESS- Battery System\",\"Site Visit Request\",\"AMC & Service Request\",\"Request a Quote\",\"EV Charging Solution\",\"Emergency Service Support\",\"General Enquiry\",\"Careers\"]', 'Select a topic', 4, 1, NULL);

-- ----------------------------
-- Table `media_assets`
-- ----------------------------
DROP TABLE IF EXISTS `media_assets`;
CREATE TABLE `media_assets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `path` varchar(500) NOT NULL,
  `mime` varchar(120) DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `alt` varchar(255) DEFAULT NULL,
  `tags_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `media_assets` (`id`, `path`, `mime`, `width`, `height`, `alt`, `tags_json`, `created_at`) VALUES
(1, '/assets/images/1786517781469-z51zy6.jpg', 'image/jpeg', NULL, NULL, NULL, NULL, '2026-08-12 12:26:21'),
(2, '/assets/images/1786518180037-61q2dk.jpeg', 'image/jpeg', NULL, NULL, NULL, NULL, '2026-08-12 12:33:00');

-- ----------------------------
-- Table `nav_items`
-- ----------------------------
DROP TABLE IF EXISTS `nav_items`;
CREATE TABLE `nav_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `location` enum('header','footer') NOT NULL DEFAULT 'header',
  `label` varchar(120) NOT NULL,
  `href` varchar(255) DEFAULT NULL,
  `parent_id` int unsigned DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `meta_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nav_location_sort` (`location`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `nav_items` (`id`, `location`, `label`, `href`, `parent_id`, `sort_order`, `enabled`, `meta_json`, `created_at`, `updated_at`) VALUES
(124, 'footer', 'Company', NULL, NULL, 0, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(125, 'footer', 'About Zigma', '/#why', 124, 0, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(126, 'footer', '20-Year Legacy', '/#legacy', 124, 1, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(127, 'footer', 'Careers', '/careers', 124, 2, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(128, 'footer', 'Certifications', '/certifications', 124, 3, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(129, 'footer', 'Industries', '/industries', 124, 4, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(130, 'footer', 'Resources', '/resources', 124, 5, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(131, 'footer', 'Capabilities', NULL, NULL, 1, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(132, 'footer', 'Solar Solutions', '/products?category=solar-solutions', 131, 0, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(133, 'footer', 'UPS Solutions', '/products?category=ups-systems', 131, 1, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(134, 'footer', 'BESS Systems', '/products?category=bess', 131, 2, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(135, 'footer', 'EV Charging', '/products?category=ev-charging', 131, 3, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(136, 'footer', 'AMC & O&M Support', '/services?category=ups-amc', 131, 4, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(137, 'footer', 'Design & Engineering', '/services?category=engineering-design', 131, 5, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(138, 'footer', 'Contact', NULL, NULL, 2, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(139, 'footer', '+91 95901 37444', 'tel:+919590137444', 138, 0, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(140, 'footer', 'info@zigma-technologies.com', 'mailto:info@zigma-technologies.com', 138, 1, 1, '{}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(141, 'footer', 'Emergency Call: +91 9590137666 →', 'tel:+919590137666', 138, 2, 1, '{\"className\":\"foot-emergency\"}', '2026-08-13 00:55:00', '2026-08-13 00:55:00'),
(142, 'header', 'Who We Are', '/#why', NULL, 0, 1, '{\"kind\":\"mega\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(143, 'header', 'About Us', '/#why', 142, 0, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(144, 'header', 'About Zigma', '/#why', 143, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(145, 'header', '20+ Years Legacy', '/#legacy', 143, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(146, 'header', 'Learn more on homepage', '/#why', 143, 2, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(147, 'header', 'Standards', '/certifications', 142, 1, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(148, 'header', 'Certifications', '/certifications', 147, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(149, 'header', 'Quality & Safety', '/certifications#industry-certs', 147, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(150, 'header', 'Company', '/careers', 142, 2, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(151, 'header', 'Life at Zigma', '/careers#why-join-us', 150, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(152, 'header', 'Careers', '/careers', 150, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(153, 'header', 'What We Do', '/services', NULL, 1, 1, '{\"kind\":\"mega\",\"megaClass\":\"mega-2x2\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(154, 'header', 'Generate', '/projects?category=solar-epc', 153, 0, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(155, 'header', 'Solar EPC Solutions', '/projects?category=solar-epc', 154, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(156, 'header', 'Solar AMC - O&M', '/services?category=solar-om', 154, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(157, 'header', 'Solar Inverters', '/products?category=solar-solutions', 154, 2, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(158, 'header', 'Learn more', '/#generate', 154, 3, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(159, 'header', 'Protect', '/products?category=ups-systems', 153, 1, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(160, 'header', 'UPS Solutions', '/products?category=ups-systems', 159, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(161, 'header', 'ABB UPS', '/products?category=ups-systems&tag=ABB', 159, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(162, 'header', 'APC / Schneider UPS', '/products?category=ups-systems&tag=APC', 159, 2, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(163, 'header', 'UPS AMC Services', '/services?category=ups-amc', 159, 3, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(164, 'header', 'Field Commissioning', '/services?category=field-services', 159, 4, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(165, 'header', 'Learn more', '/#protect', 159, 5, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(166, 'header', 'BESS', '/products?category=bess', 153, 2, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(167, 'header', 'Utility-Scale BESS', '/products?category=bess', 166, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(168, 'header', 'Peak Shaving & EMS', '/products?category=bess&tag=EMS', 166, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(169, 'header', 'Hybrid Solar + BESS', '/products?category=studer-hybrid', 166, 2, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(170, 'header', 'Hybrid Projects', '/projects?category=hybrid-power', 166, 3, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(171, 'header', 'Learn more', '/#bess', 166, 4, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(172, 'header', 'Maintain', '/services', 153, 3, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(173, 'header', 'Field Commissioning', '/services?category=field-services', 172, 0, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(174, 'header', 'UPS Repair Support', '/services?category=ups-repair', 172, 1, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(175, 'header', 'UPS Rental', '/services?category=ups-rental', 172, 2, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(176, 'header', 'Solar O&M', '/services?category=solar-om', 172, 3, 1, '{}', '2026-08-13 00:55:05', '2026-08-13 00:55:05'),
(177, 'header', 'Learn more', '/#maintain', 172, 4, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(178, 'header', 'EV Charging', '/products?category=ev-charging', 153, 4, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(179, 'header', 'EV Infrastructure', '/products?category=ev-charging', 178, 0, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(180, 'header', 'Smart Charging', '/products?category=ev-charging&tag=Smart', 178, 1, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(181, 'header', 'Solar + BESS + EV', '/products?category=ev-charging&tag=Solar', 178, 2, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(182, 'header', 'Learn more', '/#ev-charging', 178, 3, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(183, 'header', 'Engineering', '/services?category=engineering-design', 153, 5, 1, '{\"kind\":\"column\"}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(184, 'header', 'Design & Development', '/services?category=engineering-design', 183, 0, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(185, 'header', 'Electrical Engineering', '/services?category=engineering-design&tag=EPLAN', 183, 1, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(186, 'header', 'Project Support', '/services?category=field-services', 183, 2, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(187, 'header', 'Learn more', '/#engineering-design', 183, 3, 1, '{\"className\":\"mega-secondary\"}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(188, 'header', 'Industries', '/industries', NULL, 2, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(189, 'header', 'Projects', '/projects', NULL, 3, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(190, 'header', 'Products', '/products', NULL, 4, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(191, 'header', 'Services', '/services', NULL, 5, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(192, 'header', 'Resources', '/resources', NULL, 6, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06'),
(193, 'header', 'Contact', '/contact#contact-form', NULL, 7, 1, '{}', '2026-08-13 00:55:06', '2026-08-13 00:55:06');

-- ----------------------------
-- Table `page_sections`
-- ----------------------------
DROP TABLE IF EXISTS `page_sections`;
CREATE TABLE `page_sections` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `page_id` int unsigned NOT NULL,
  `type` varchar(64) NOT NULL,
  `section_key` varchar(120) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `content_json` json DEFAULT NULL,
  `style_json` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_page_sections_page_sort` (`page_id`,`sort_order`),
  CONSTRAINT `fk_page_sections_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `page_sections` (`id`, `page_id`, `type`, `section_key`, `title`, `sort_order`, `enabled`, `content_json`, `style_json`, `created_at`, `updated_at`) VALUES
(1, 1, 'hero', 'home', 'Hero Slider', 0, 1, '{\"slides\":[{\"cta\":\"Discover Our Legacy →\",\"lead\":\"Built on a Legacy of Trust. Driven by Service & Innovation. Powering industries with reliable power, solar, and engineering solutions for over two decades.\",\"tags\":[\"Trusted Engineering Partner\",\"Industrial Power Solutions\",\"Reliability\",\"Customer-Centric Service\"],\"image\":\"/assets/images/zigma-technologies-engineers-monitoring-.jpg\",\"theme\":\"theme-legacy\",\"title\":\"20+ Years of Engineering Excellence\",\"ctaHref\":\"#legacy\",\"eyebrow\":\"◆ EST. 2006 — TWO DECADES OF ENGINEERING\",\"numeral\":\"20+\"},{\"cta\":\"Explore Power Continuity →\",\"lead\":\"Integrated UPS, battery, and power continuity solutions engineered to protect critical operations, maximize uptime, and ensure uninterrupted business performance.\",\"tags\":[\"UPS Sales, AMC & Repair\",\"Industrial UPS Solutions\",\"Inverter & Battery Backup\",\"Power Quality Solutions\"],\"image\":\"/assets/images/solar-farm-with-wind-turbines-at-sunset-.jpg\",\"theme\":\"theme-ups\",\"title\":\"Reliable Power. Preserved Productivity. Zero Downtime.\",\"ctaHref\":\"#protect\",\"eyebrow\":\"◆ ZERO DOWNTIME · MISSION-CRITICAL POWER\"},{\"cta\":\"Explore Solar Solutions →\",\"lead\":\"Complete Solar EPC, engineering, installation, monitoring, and long-term maintenance solutions for commercial, industrial, and utility-scale projects.\",\"tags\":[\"Solar EPC & Power Plants\",\"Rooftop, Industrial & Commercial Solar\",\"Solar AMC & O&M\",\"Green Energy Solutions\",\"EV Charging & BESS\"],\"image\":\"/assets/images/engineers-reviewing-electrical-design-dr.jpg\",\"theme\":\"theme-solar\",\"title\":\"Smart Solar with Sustainable Energy Future\",\"ctaHref\":\"#generate\",\"eyebrow\":\"◆ RENEWABLE ENERGY · SUSTAINABLE FUTURE\"},{\"cta\":\"Explore Engineering Services →\",\"lead\":\"Delivering precision engineering design, technical consulting, project support, and outsourced engineering services for industrial, infrastructure, and energy projects.\",\"tags\":[\"Electrical Engineering Design\",\"CAD Drafting & Documentation\",\"Technical Consulting\",\"Engineering Outsourcing\"],\"image\":\"/assets/images/city-skyline-with-solar-panels-and-indus.jpg\",\"theme\":\"theme-eng\",\"title\":\"Engineering Expertise Beyond Boundaries\",\"ctaHref\":\"#experts\",\"eyebrow\":\"◆ ENGINEERING DESIGN & TECHNICAL SERVICES\"},{\"cta\":\"Talk to an Engineer →\",\"lead\":\"Building intelligent, sustainable, and future-ready power, renewable energy, and industrial infrastructure solutions for a smarter tomorrow.\",\"tags\":[\"Smart Energy & Digital Monitoring\",\"Predictive Maintenance\",\"AI-Driven Power Management\",\"IoT Integration\"],\"image\":\"/assets/images/engineers-inspecting-switchgear-panels-i.jpg\",\"theme\":\"theme-future\",\"title\":\"Building the Future-Ready Energy Ecosystem\",\"ctaHref\":\"#contact\",\"eyebrow\":\"◆ SMART, SUSTAINABLE & FUTURE-READY\"}]}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(2, 1, 'eco', 'eco', 'Ecosystem', 1, 1, '{\"cta\":\"Learn More About Zigma →\",\"body\":\"A trusted engineering partner with over 20 years of expertise delivering comprehensive power, energy, and engineering solutions across manufacturing, healthcare, commercial, and institutional industries — from solar generation to power protection to the engineering design behind it all.\",\"title\":\"Zigma Technologies — Premium Power & Energy Solutions Company\",\"groups\":[{\"dot\":\"dot-orange\",\"items\":[\"UPS Sales & Services\",\"UPS AMC Services\",\"Battery & Energy Storage\"],\"className\":\"cap-group-orange\"},{\"dot\":\"dot-green\",\"items\":[\"Solar EPC Solutions\",\"Solar AMC & O&M Services\",\"Solar Power Generation\"],\"className\":\"cap-group-green\"},{\"dot\":\"dot-blue\",\"items\":[\"Industrial Power Solutions\",\"Industrial & Power Electronics\",\"Electrical Engineering\"],\"className\":\"cap-group-blue\"},{\"dot\":\"dot-purple\",\"items\":[\"Energy Auditing & Optimization\",\"Engineering Design & Outsourcing\",\"Technical Consulting\"],\"className\":\"cap-group-purple\"}],\"ctaHref\":\"#why\",\"eyebrow\":\"ONE ENGINEERING ECOSYSTEM\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(3, 1, 'stats', 'stats', 'Stat Bar', 2, 1, '{\"stats\":[{\"label\":\"Years Experience\",\"value\":20,\"suffix\":\"+\"},{\"label\":\"Projects Delivered\",\"value\":1500,\"suffix\":\"+\"},{\"label\":\"Satisfied Clients\",\"value\":1200,\"suffix\":\"+\"},{\"label\":\"Industries We Serve\",\"value\":25,\"suffix\":\"+\"},{\"label\":\"Certified Engineers\",\"value\":100,\"suffix\":\"+\"},{\"label\":\"Client Satisfaction\",\"value\":99,\"suffix\":\"%+\"}]}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(4, 1, 'why', 'why', 'Why Zigma', 3, 1, '{\"body\":\"Power infrastructure is more reliable when every system works as one. Zigma brings together Solar Energy, UPS Systems, Battery Storage, Engineering Excellence, AMC and 24×7 Service Support to deliver seamless, end-to-end power solutions.\",\"cards\":[{\"desc\":\"Teams who\'ve solved this exact failure before, not first-time installers.\",\"tint\":\"tint-1\",\"index\":\"01\",\"title\":\"20-Year Engineering Bench\"},{\"desc\":\"Design, supply, install, and maintain — one contract, one escalation path.\",\"tint\":\"tint-2\",\"index\":\"02\",\"title\":\"One Partner Accountability\"},{\"desc\":\"Authorized partnerships and certified processes for critical infrastructure.\",\"tint\":\"tint-3\",\"index\":\"03\",\"title\":\"OEM-Aligned Delivery\"},{\"desc\":\"Mission-critical support when downtime is not an option.\",\"tint\":\"tint-4\",\"index\":\"04\",\"title\":\"24×7 Response Culture\"},{\"desc\":\"From a single rooftop system to multi-MW industrial EPC, without changing partners.\",\"tint\":\"tint-5\",\"index\":\"05\",\"title\":\"Built for Scale\"},{\"desc\":\"CapEx decisions tied to OpEx reality — AMC, monitoring, and upgrade paths included.\",\"tint\":\"tint-6\",\"index\":\"06\",\"title\":\"Lifecycle Thinking\"}],\"title\":\"One Partner. One Responsibility. Complete Power Solutions\",\"eyebrow\":\"WHY ZIGMA\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(5, 1, 'split', 'generate', 'Generate Solar', 4, 1, '{\"cta\":\"Explore Solar Solutions →\",\"body\":\"Designing and delivering intelligent solar energy systems that maximize performance, efficiency, sustainability, and long-term return on investment for commercial, industrial, institutional, and utility-scale projects.\",\"tone\":\"ice\",\"image\":\"/assets/images/aerial-view-of-dense-commercial-rooftop-.jpg\",\"title\":\"Solar Energy Solutions\",\"ctaHref\":\"/contact\",\"eyebrow\":\"GENERATE\",\"features\":[{\"body\":\"Complete engineering, procurement, construction, and commissioning for rooftop, ground-mounted, and utility-scale solar.\",\"title\":\"Solar EPC\"},{\"body\":\"Performance monitoring, preventive maintenance, and long-term asset care.\",\"title\":\"Solar AMC & O&M\"},{\"body\":\"Solutions tuned for factories, warehouses, campuses, and commercial roofs.\",\"title\":\"Rooftop & Industrial\"},{\"body\":\"Pair solar with storage and EV charging for a future-ready energy stack.\",\"title\":\"Green Energy Integration\"}],\"eyebrowClass\":\"eyebrow-green\",\"imagePosition\":\"right\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(6, 1, 'split', 'protect', 'Protect Power', 5, 1, '{\"cta\":\"Protect Your Business →\",\"body\":\"Delivering reliable and uninterrupted power infrastructure through advanced UPS systems, battery solutions, critical power engineering, and electrical protection systems.\",\"tone\":\"light\",\"image\":\"/assets/images/engineers-inspecting-switchgear-panels-i.jpg\",\"title\":\"Power Continuity Solutions\",\"ctaHref\":\"/contact\",\"eyebrow\":\"PROTECT\",\"features\":[{\"body\":\"Industrial and commercial UPS systems with structured maintenance contracts.\",\"title\":\"UPS Sales & AMC\"},{\"body\":\"High-performance battery banks, replacement, testing, and lifecycle management.\",\"title\":\"Battery Solutions\"},{\"body\":\"Engineered continuity architectures for hospitals, data centers, and plants.\",\"title\":\"Critical Power Design\"},{\"body\":\"Stabilization and protection against disturbances that damage equipment.\",\"title\":\"Power Quality\"}],\"eyebrowClass\":\"eyebrow-orange\",\"imagePosition\":\"left\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(7, 1, 'split', 'bess', 'BESS', 6, 1, '{\"cta\":\"Request a BESS Consultation →\",\"body\":\"Intelligent energy storage for commercial, industrial, and utility-scale applications. We design, supply, install, integrate, and maintain advanced BESS that improve energy efficiency, reduce peak demand charges, provide reliable backup power, and maximize renewable energy utilization.\",\"tone\":\"ice\",\"image\":\"https://images.unsplash.com/photo-1589276534126-adef63a95e05?fm=jpg&q=80&w=1600&auto=format&fit=crop\",\"title\":\"Battery Energy Storage Systems (BESS)\",\"ctaHref\":\"/contact\",\"eyebrow\":\"BESS\",\"features\":[{\"body\":\"Turnkey battery storage sized for facility loads, backup requirements, and utility-scale deployments.\",\"title\":\"Commercial & Industrial BESS\"},{\"body\":\"Combined solar generation and storage for maximum renewable utilization and grid independence.\",\"title\":\"Hybrid Solar + BESS\"},{\"body\":\"Reduce peak demand charges and shift loads intelligently to cut energy costs.\",\"title\":\"Peak Shaving & Load Management\"},{\"body\":\"Battery Management Systems, Energy Management Systems, and remote SCADA monitoring built in.\",\"title\":\"BMS, EMS & SCADA Integration\"}],\"eyebrowClass\":\"eyebrow-orange\",\"imagePosition\":\"right\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(8, 1, 'split', 'maintain', 'Maintain', 7, 1, '{\"cta\":\"Discover Engineering Services →\",\"body\":\"Comprehensive operation, maintenance, asset management, and engineering support services that ensure maximum system reliability and operational efficiency.\",\"tone\":\"light\",\"image\":\"https://images.unsplash.com/photo-1758101755915-462eddc23f57?auto=format&fit=crop&w=1000&q=75\",\"title\":\"Engineering Operations & Lifecycle Services\",\"ctaHref\":\"/contact\",\"eyebrow\":\"MAINTAIN\",\"features\":[{\"body\":\"Preventive and corrective maintenance for solar plants, electrical infrastructure, UPS systems, and industrial assets.\",\"title\":\"Operations & Maintenance (O&M)\"},{\"body\":\"Flexible AMC programs providing scheduled inspections, maintenance, and priority technical support.\",\"title\":\"Annual Maintenance Contracts (AMC)\"},{\"body\":\"24×7 system monitoring, predictive maintenance, fault detection, and performance reporting.\",\"title\":\"Remote Monitoring & Diagnostics\"},{\"body\":\"Technical audits, troubleshooting, modernization, retrofits, documentation, and lifecycle engineering support.\",\"title\":\"Engineering Support Services\"}],\"eyebrowClass\":\"eyebrow-cyan\",\"imagePosition\":\"left\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(9, 1, 'split', 'ev-charging', 'EV Charging', 8, 1, '{\"cta\":\"Get an EV Charging Proposal →\",\"body\":\"Empowering India\'s transition to electric mobility with reliable, scalable, and intelligent EV charging solutions — AC & DC charging infrastructure integrated with solar and BESS.\",\"tone\":\"ice\",\"image\":\"/assets/images/blue-electric-vehicle-charging-at-a-mode.jpg\",\"title\":\"EV Charging Infrastructure\",\"ctaHref\":\"/contact\",\"eyebrow\":\"EV CHARGING\",\"features\":[{\"body\":\"Fast and slow charging infrastructure for commercial, industrial, fleet, and public deployment.\",\"title\":\"AC & DC Charging Stations\"},{\"body\":\"Corporate campuses, apartments, highway stations, and dedicated fleet charging depots.\",\"title\":\"Commercial & Fleet Charging\"},{\"body\":\"Charging networks that draw from solar generation and battery storage for lower running costs.\",\"title\":\"Solar + EV + BESS Integration\"},{\"body\":\"OCPP-based load management, remote monitoring, charger repair, and annual maintenance contracts.\",\"title\":\"Smart OCPP Charging & AMC\"}],\"eyebrowClass\":\"eyebrow-orange\",\"imagePosition\":\"right\"}', '{}', '2026-08-12 09:14:16', '2026-08-12 09:14:16'),
(10, 1, 'split', 'engineering-design', 'Engineering Design', 9, 1, '{\"cta\":\"Discuss Your Engineering Project →\",\"body\":\"From concept to commissioning — our engineering bench designs, models, and validates every system before it is installed on-site.\",\"tone\":\"light\",\"image\":\"/assets/images/engineers-reviewing-electrical-design-dr.jpg\",\"title\":\"Engineering Design & Technical Services\",\"ctaHref\":\"/contact\",\"eyebrow\":\"ENGINEERING\",\"features\":[{\"body\":\"Single-line diagrams, load calculations, protection coordination, and detailed engineering packages.\",\"title\":\"Electrical Design\"},{\"body\":\"Precision drafting, as-built documentation, and project deliverables for EPC and industrial clients.\",\"title\":\"CAD & Documentation\"},{\"body\":\"Feasibility studies, audits, and independent engineering reviews.\",\"title\":\"Technical Consulting\"},{\"body\":\"Extend your team with specialized design capacity for peak project loads.\",\"title\":\"Outsourced Engineering\"}],\"eyebrowClass\":\"eyebrow-cyan\",\"imagePosition\":\"left\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(11, 1, 'split', 'experts', 'Experts', 10, 1, '{\"cta\":\"Talk to Our Power Electronics Team →\",\"body\":\"Deep engineering expertise in rectifiers, converters, drives, and industrial power electronics — the foundational layer behind every protection system we build.\",\"tone\":\"ice\",\"image\":\"/assets/images/engineers-inspecting-switchgear-panels-i.jpg\",\"title\":\"Experts in Industrial & Power Electronics\",\"ctaHref\":\"/contact\",\"eyebrow\":\"EXPERTISE\",\"features\":[{\"body\":\"Precision-engineered AC-DC and DC-DC conversion systems built for demanding industrial duty cycles.\",\"title\":\"Rectifiers & Converters\"},{\"body\":\"Variable frequency drives and motor control systems tuned for efficiency and reliability at scale.\",\"title\":\"Drives & Motor Control\"},{\"body\":\"Design reviews, failure analysis, and specification support from engineers who build this equipment.\",\"title\":\"Power Electronics Consulting\"},{\"body\":\"On-site inverter installation, commissioning, repair, and service support across major solar and industrial brands.\",\"title\":\"Inverter Installation & Service\"}],\"eyebrowClass\":\"eyebrow-cyan\",\"imagePosition\":\"right\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(12, 1, 'timeline', 'legacy', 'Legacy Timeline', 11, 1, '{\"cta\":\"Read Our Full Story →\",\"items\":[{\"body\":\"Zigma Technologies founded, focused on industrial electrical and power backup services.\",\"year\":\"2006\",\"title\":\"Founded\"},{\"body\":\"Expansion into UPS sales, service, and structured Annual Maintenance Contracts across manufacturing clients.\",\"year\":\"2010+\",\"title\":\"UPS & AMC Expansion\"},{\"body\":\"Entry into Solar EPC as renewable energy adoption accelerates among Indian industry.\",\"year\":\"2015+\",\"title\":\"Solar Division\"},{\"body\":\"Battery solutions, power quality, and energy management added — completing the integrated offering.\",\"year\":\"2020+\",\"title\":\"Full Power Lifecycle\"},{\"now\":true,\"body\":\"Pan-India service footprint and a new phase of expansion into large-scale industrial solar.\",\"year\":\"Today\",\"title\":\"1,000+ Projects\"},{\"body\":\"Scaling engineering capacity to serve India\'s next decade of industrial energy demand.\",\"next\":true,\"year\":\"What\'s Next\",\"title\":\"Future Vision\"}],\"title\":\"Twenty years isn\'t a number. It\'s a track record.\",\"ctaHref\":\"#\",\"eyebrow\":\"20-YEARS OF LEGACY\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(13, 1, 'projects_teaser', 'projects', 'Featured Projects', 12, 1, '{\"cta\":\"View All Projects →\",\"limit\":3,\"title\":\"Featured projects\",\"source\":\"catalog\",\"ctaHref\":\"/projects\",\"eyebrow\":\"PROOF, NOT PROMISES\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(14, 1, 'industries', 'industries', 'Industries', 13, 1, '{\"items\":[\"Data Centers & IT Parks\",\"Digital Infrastructure\",\"Government & Public Sector\",\"Manufacturing\",\"Automotive Industry\",\"Airport & Metro Infrastructure\",\"Industrial Infrastructure\",\"Hospitality & Hotels\",\"MSMEs & Small-Scale Industries\",\"Telecom & Communication\",\"Smart Cities & Utilities\",\"Special Economic Zones (SEZ)\",\"Warehouse, Logistics & Fleet Operators\",\"Power & Utility Infrastructure\",\"Oil & Gas Refineries\",\"Healthcare & Hospitals\",\"Educational Institutions\",\"Residential Communities\",\"Commercial Real Estate\",\"Corporate Campuses\",\"Banking & Financial Services\",\"Engineering, Procurement & Construction (EPC)\",\"EV Charging Infrastructure\"],\"title\":\"Engineering that understands your industry.\",\"eyebrow\":\"INDUSTRIES\",\"linkHref\":\"#\",\"linkLabel\":\"See All Industries We Serve →\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(15, 1, 'testimonials', 'testimonials', 'Testimonials', 14, 1, '{\"items\":[{\"name\":\"RAJESH IYER\",\"role\":\"Plant Head, Precision Auto Components\",\"quote\":\"When our UPS failed at 2 AM, Zigma\'s engineer was on-site before our own maintenance team could even respond. That\'s twenty years of reliability, not luck.\"},{\"name\":\"DR. ANITA MENON\",\"role\":\"Facility Director, Sunrise Multi-Specialty Hospital\",\"quote\":\"They didn\'t just install our rooftop solar system — they sat with our facilities team and rebuilt our entire load management approach.\"},{\"name\":\"VIKRAM SHARMA\",\"role\":\"Operations Head, Meridian Textiles\",\"quote\":\"We evaluated four EPC vendors. Zigma was the only one that came back with load calculations instead of a quotation.\"}],\"title\":\"Trusted by the people who can\'t afford downtime.\",\"eyebrow\":\"TESTIMONIALS\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(16, 1, 'partners', 'partners', 'Partners', 15, 1, '{\"note\":\"Logos represent equipment and technology brands Zigma sources and services, and organizations Zigma has partnered with or delivered projects for. All logos remain the property of their respective owners and are displayed as provided.\",\"logos\":[{\"alt\":\"ABB\",\"src\":\"/assets/images/abb.png\"},{\"alt\":\"ABB Partner\",\"src\":\"/assets/images/abb-2.png\"},{\"alt\":\"Aditya Birla Group\",\"src\":\"/assets/images/aditya-birla-group.png\"},{\"alt\":\"Amara Raja\",\"src\":\"/assets/images/amara-raja.png\"},{\"alt\":\"Aster Hospital\",\"src\":\"/assets/images/aster-hospital.png\"},{\"alt\":\"Bharat Electronics\",\"src\":\"/assets/images/bharat-electronics.png\"},{\"alt\":\"BIEC\",\"src\":\"/assets/images/bangalore-international-exhibition-centr.png\"},{\"alt\":\"Coca-Cola\",\"src\":\"/assets/images/coca-cola.png\"},{\"alt\":\"Eaton\",\"src\":\"/assets/images/eaton.png\"},{\"alt\":\"eMudhra\",\"src\":\"/assets/images/emudhra.png\"},{\"alt\":\"Exide\",\"src\":\"/assets/images/exide.png\"},{\"alt\":\"Fincare\",\"src\":\"/assets/images/fincare-small-finance-bank.png\"},{\"alt\":\"Hitachi\",\"src\":\"/assets/images/hitachi.png\"},{\"alt\":\"IndiGo\",\"src\":\"/assets/images/indigo.png\"},{\"alt\":\"Jana Bank\",\"src\":\"/assets/images/jana-small-finance-bank.png\"},{\"alt\":\"KIA Bengaluru\",\"src\":\"/assets/images/kempegowda-international-airport-bengalu.png\"},{\"alt\":\"Kirloskar Solar\",\"src\":\"/assets/images/kirloskar-solar.png\"},{\"alt\":\"Kotak Mahindra Bank\",\"src\":\"/assets/images/kotak-mahindra-bank.png\"},{\"alt\":\"Landmark Group\",\"src\":\"/assets/images/landmark-group.png\"},{\"alt\":\"Leoch Battery\",\"src\":\"/assets/images/leoch-battery.png\"},{\"alt\":\"Lifestyle\",\"src\":\"/assets/images/lifestyle.png\"},{\"alt\":\"Luminous\",\"src\":\"/assets/images/luminous.png\"},{\"alt\":\"Max\",\"src\":\"/assets/images/max.png\"},{\"alt\":\"Numeric\",\"src\":\"/assets/images/numeric.png\"},{\"alt\":\"Schneider Electric\",\"src\":\"/assets/images/schneider-electric.png\"},{\"alt\":\"Shadowfax\",\"src\":\"/assets/images/shadowfax.png\"},{\"alt\":\"Somerset Therapeutics\",\"src\":\"/assets/images/somerset-therapeutics.png\"},{\"alt\":\"TKE\",\"src\":\"/assets/images/tke.png\"},{\"alt\":\"Vertiv\",\"src\":\"/assets/images/vertiv.png\"},{\"alt\":\"Vi\",\"src\":\"/assets/images/vi.png\"}],\"title\":\"Trusted by industry leaders and engineering partners.\",\"eyebrow\":\"SOURCED & SERVICED\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(17, 1, 'cert_teaser', 'cert-teaser', 'Certifications Teaser', 16, 1, '{\"cta\":\"View Our Certifications →\",\"body\":\"OEM authorizations, ISO certification, and engineering partnerships that back every project we deliver.\",\"title\":\"Certified Excellence. Trusted Performance.\",\"ctaHref\":\"/certifications\",\"eyebrow\":\"CERTIFICATIONS\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(18, 1, 'cta', 'contact', 'Contact CTA', 17, 1, '{\"body\":\"Whether it\'s a single rooftop system or a multi-site industrial rollout, our engineers will size it right the first time.\",\"title\":\"Let\'s build India\'s next 20 years of reliable power.\",\"primaryCta\":\"Talk to an Engineer\",\"primaryHref\":\"tel:+919590137444\",\"secondaryCta\":\"Contact Us\",\"secondaryHref\":\"/contact\"}', '{}', '2026-08-12 09:14:17', '2026-08-12 09:14:17'),
(33, 5, 'page_hero', 'privacy-hero', 'Privacy Hero', 0, 1, '{\"lead\":\"How Zigma Technologies collects, uses, and protects information shared through our website and enquiry channels.\",\"image\":\"/assets/images/engineers-reviewing-electrical-design-dr.jpg\",\"title\":\"Privacy Policy\",\"eyebrow\":\"LEGAL\",\"bodyClass\":\"legal-page\",\"breadcrumb\":\"Privacy\"}', '{}', '2026-08-12 09:16:17', '2026-08-12 09:16:17'),
(34, 5, 'rich_text', 'privacy-body', 'Privacy Body', 1, 1, '{\"html\":\"<p>We collect contact details you voluntarily submit via enquiry forms, careers applications, newsletter signup, and direct email or phone. This may include name, company, email, phone number, project requirements, and — when you apply for a role — work experience and a CV/resume file.</p>\\n<p>Information is used to respond to requests, evaluate job applications, improve our services, and (with consent) send occasional updates. We do not sell personal data. Resume files are stored privately and are accessible only to authorized staff through the admin portal.</p>\\n<p>Data is stored securely with access limited to authorized staff. You may request correction or deletion by contacting <a href=\\\"mailto:info@zigma-technologies.com\\\">info@zigma-technologies.com</a>.</p>\\n<p>This policy may be updated periodically. Continued use of the site after changes constitutes acceptance of the revised policy.</p>\"}', '{}', '2026-08-12 09:16:17', '2026-08-12 10:48:01'),
(35, 5, 'cta', 'privacy-cta', 'Privacy CTA', 2, 1, '{\"body\":\"Reach our team and we will help with access, correction, or deletion requests.\",\"title\":\"Questions about your data?\",\"primaryCta\":\"Contact us\",\"primaryHref\":\"/contact\",\"secondaryCta\":\"Terms of use\",\"secondaryHref\":\"/terms\"}', '{}', '2026-08-12 09:16:17', '2026-08-12 09:16:17'),
(36, 6, 'page_hero', 'terms-hero', 'Terms Hero', 0, 1, '{\"lead\":\"Guidelines for using the Zigma Technologies website and related digital content.\",\"image\":\"/assets/images/engineers-inspecting-switchgear-panels-i.jpg\",\"title\":\"Terms of Use\",\"eyebrow\":\"LEGAL\",\"bodyClass\":\"legal-page\",\"breadcrumb\":\"Terms\"}', '{}', '2026-08-12 09:16:19', '2026-08-12 09:16:19'),
(37, 6, 'rich_text', 'terms-body', 'Terms Body', 1, 1, '{\"html\":\"<p>Content on this website is provided for general information about our engineering capabilities, products, and services. Specifications and availability may change without notice.</p>\\n<p>All trademarks, logos, and project imagery remain the property of their respective owners. You may not copy or redistribute site materials for commercial use without written permission.</p>\\n<p>Enquiries submitted through the site do not create a binding contract until confirmed in writing by Zigma Technologies.</p>\\n<p>To the fullest extent permitted by law, we are not liable for indirect or consequential damages arising from use of this website. Governing law is that of India, with disputes subject to courts in Bengaluru unless otherwise agreed.</p>\"}', '{}', '2026-08-12 09:16:19', '2026-08-12 09:16:19'),
(38, 6, 'cta', 'terms-cta', 'Terms CTA', 2, 1, '{\"body\":\"Project scopes, SLAs, and commercial terms are issued separately for each engagement.\",\"title\":\"Need a formal agreement?\",\"primaryCta\":\"Request consultation\",\"primaryHref\":\"/contact#contact-form\",\"secondaryCta\":\"Privacy policy\",\"secondaryHref\":\"/privacy\"}', '{}', '2026-08-12 09:16:19', '2026-08-12 09:16:19'),
(39, 4, 'cert_hero', 'cert-hero', 'Certifications Hero', 0, 1, '{\"sub\":\"Certified Excellence. Trusted Performance.\",\"lead\":\"Our OEM authorizations, industry certifications, and engineering partnerships demonstrate our commitment to quality, technical expertise, and reliable service across power, renewable energy, and industrial engineering solutions.\",\"title\":\"Our Certifications, Authorizations & Engineering Partners\",\"eyebrow\":\"CERTIFICATIONS & PARTNERSHIPS\",\"tagline\":\"Recognized by Industry Leaders. Trusted by Businesses Across India.\"}', '{}', '2026-08-12 10:02:18', '2026-08-12 10:02:18'),
(40, 4, 'logo_marquee', 'oem-marquee', 'OEM Marquee', 1, 1, '{\"items\":[{\"name\":\"Kirloskar Solar Technologies\",\"image\":\"/assets/images/kirloskar-solar-technologies-authorizati.jpg\"},{\"name\":\"OCV — ISO 9001:2015\",\"image\":\"/assets/images/ocv-iso-9001-2015-certificate-of-registr.jpg\"},{\"name\":\"ABB Channel Partner\",\"image\":\"/assets/images/abb-channel-partner-certificate.jpg\"},{\"name\":\"Schneider Electric\",\"image\":\"/assets/images/schneider-electric-certificate-of-author.jpg\"},{\"name\":\"Avetta Consortium Member\",\"image\":\"/assets/images/avetta-consortium-membership-certificate.jpg\"},{\"name\":\"Karnataka Annual Solar Awards 2025\",\"image\":\"/assets/images/certifications-img-0.jpg\"}]}', '{}', '2026-08-12 10:02:18', '2026-08-12 10:02:18'),
(41, 4, 'cert_cta', 'cert-cta', 'Certifications CTA', 2, 1, '{\"cta\":\"Talk to Our Engineering Team →\",\"ctaHref\":\"/contact#contact-form\"}', '{}', '2026-08-12 10:02:18', '2026-08-12 10:02:18'),
(42, 3, 'page_hero', 'careers-hero', 'Careers Hero', 0, 1, '{\"lead\":\"At Zigma, engineers don\'t sit on the sidelines — they design, build, and maintain the solar, UPS, and battery systems that keep Indian industry running. If you want real ownership from day one, this is where you\'ll find it.\",\"image\":\"/assets/images/zigma-technologies-engineers-collaborati.jpg\",\"title\":\"Build India\'s Power Infrastructure With Us\",\"eyebrow\":\"JOIN THE TEAM\",\"imageAlt\":\"Zigma Technologies engineers collaborating on a power electronics project\",\"bodyClass\":\"careers-page\",\"breadcrumb\":\"Careers\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(43, 3, 'culture_stats', 'culture', 'Culture Stats', 1, 1, '{\"items\":[{\"label\":\"Years of Engineering\",\"value\":\"20+\"},{\"label\":\"Engineers & Specialists\",\"value\":\"150+\"},{\"label\":\"Projects Delivered\",\"value\":\"1500+\"},{\"label\":\"Cities Across India\",\"value\":\"12+\"}]}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(44, 3, 'feature_grid', 'life-at-zigma', 'Life at Zigma', 2, 1, '{\"body\":\"We\'re a team of people who\'d rather be on-site solving a real problem than sitting through another status meeting. Here\'s what that looks like day to day.\",\"tone\":\"light\",\"cards\":[{\"body\":\"No years-long ramp-up. New engineers get real site and project exposure within their first few months.\",\"icon\":\"<path d=\\\"M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z\\\"/>\",\"title\":\"Hands-On From Day One\"},{\"body\":\"Flat project teams mean your decisions matter — and your name is on the work that ships.\",\"icon\":\"<path d=\\\"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2\\\"/><circle cx=\\\"9\\\" cy=\\\"7\\\" r=\\\"4\\\"/><path d=\\\"M23 21v-2a4 4 0 00-3-3.87\\\"/><path d=\\\"M16 3.13a4 4 0 010 7.75\\\"/>\",\"title\":\"Small Teams, Real Ownership\"},{\"body\":\"Work across solar, UPS, and battery projects in multiple states — not just one client, one city.\",\"icon\":\"<path d=\\\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z\\\"/><circle cx=\\\"12\\\" cy=\\\"10\\\" r=\\\"3\\\"/>\",\"title\":\"Pan-India Project Exposure\"},{\"body\":\"As Zigma grows, so does the scope of what you own — most of our team leads have grown up internally.\",\"icon\":\"<path d=\\\"M12 20V10M18 20V4M6 20v-4\\\"/>\",\"title\":\"Growth That Keeps Pace\"}],\"title\":\"Engineering-First, Every Day\",\"eyebrow\":\"LIFE AT ZIGMA\",\"eyebrowClass\":\"eyebrow-orange\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(45, 3, 'why', 'why-join-us', 'Why Join Us', 3, 1, '{\"body\":\"Beyond the paycheck — here\'s what actually makes people stay at Zigma.\",\"tone\":\"gray\",\"cards\":[{\"desc\":\"Your work keeps hospitals, factories, and data centres powered — not stuck in a slide deck.\",\"tint\":\"tint-1\",\"index\":\"01\",\"title\":\"Real Engineering Impact\"},{\"desc\":\"We\'re scaling quickly across India, which means new roles, new responsibility, and new cities.\",\"tint\":\"tint-2\",\"index\":\"02\",\"title\":\"Fast-Growing Company\"},{\"desc\":\"Work alongside engineers who\'ve spent decades in solar, power electronics, and critical infrastructure.\",\"tint\":\"tint-3\",\"index\":\"03\",\"title\":\"Learn From Specialists\"},{\"desc\":\"Bring a better way to do something and you\'ll be the one who gets to build it.\",\"tint\":\"tint-4\",\"index\":\"04\",\"title\":\"Ownership & Autonomy\"},{\"desc\":\"Clear levels, regular reviews, and a straight line from individual contributor to project lead.\",\"tint\":\"tint-5\",\"index\":\"05\",\"title\":\"Competitive Growth Path\"},{\"desc\":\"Relocate, travel, or stay local — our project spread across India means options, not one fixed desk.\",\"tint\":\"tint-6\",\"index\":\"06\",\"title\":\"Nationwide Opportunities\"}],\"title\":\"What You\'ll Get Working Here\",\"eyebrow\":\"WHY JOIN US\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(46, 3, 'job_list', 'current-openings', 'Current Openings', 4, 1, '{\"body\":\"Don\'t see an exact fit? Apply anyway — we\'re always looking for good engineers.\",\"jobs\":[{\"type\":\"Full-Time\",\"title\":\"Solar Design Engineer\",\"location\":\"Bengaluru\",\"department\":\"Engineering\"},{\"type\":\"Full-Time\",\"title\":\"UPS Service Engineer\",\"location\":\"Mumbai\",\"department\":\"Field Service\"},{\"type\":\"Full-Time\",\"title\":\"Site Supervisor — Solar EPC\",\"location\":\"Delhi\",\"department\":\"Site Operations\"},{\"type\":\"Full-Time\",\"title\":\"Business Development Manager\",\"location\":\"Bengaluru\",\"department\":\"Sales\"},{\"type\":\"Full-Time\",\"title\":\"Graduate Engineer Trainee\",\"location\":\"Multiple Locations\",\"department\":\"Engineering\"}],\"title\":\"Open Roles Right Now\",\"eyebrow\":\"CURRENT OPENINGS\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(47, 3, 'internship', 'internship-program', 'Internship Program', 5, 1, '{\"cta\":\"Apply for Internship →\",\"body\":\"Our internship program puts students and fresh graduates on real solar, UPS, and engineering projects — not just filing paperwork. You\'ll be paired with a senior engineer and given actual project work from week one.\",\"title\":\"Start Your Career in Power Engineering\",\"points\":[{\"label\":\"Duration\",\"value\":\"3 – 6 Months\"},{\"label\":\"Locations\",\"value\":\"Bengaluru, Mumbai, Delhi\"},{\"label\":\"Stipend\",\"value\":\"Paid, Performance-Linked\"},{\"label\":\"Disciplines\",\"value\":\"EEE, ECE, Mechanical\"}],\"eyebrow\":\"INTERNSHIP PROGRAM\",\"cardBody\":\"Open to final-year students and recent graduates in Electrical, Electronics, or Mechanical Engineering.\",\"applyRole\":\"Internship Program\",\"cardTitle\":\"Zigma Engineering Internship\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(48, 3, 'feature_grid', 'employee-benefits', 'Employee Benefits', 6, 1, '{\"body\":\"Benefits designed around real life, not just a checklist.\",\"tone\":\"light\",\"cards\":[{\"body\":\"Comprehensive medical coverage for you and your immediate family.\",\"icon\":\"<path d=\\\"M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z\\\"/>\",\"title\":\"Health Insurance\"},{\"body\":\"Certifications, technical training, and conference sponsorship for the right roles.\",\"icon\":\"<path d=\\\"M22 10v6M2 10l10-5 10 5-10 5-10-5z\\\"/><path d=\\\"M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5\\\"/>\",\"title\":\"Learning & Development\"},{\"body\":\"Annual and project-linked bonuses tied to real outcomes, not just tenure.\",\"icon\":\"<path d=\\\"M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6\\\"/>\",\"title\":\"Performance Bonuses\"},{\"body\":\"Leave that respects family needs, travel, and the realities of field engineering life.\",\"icon\":\"<rect x=\\\"3\\\" y=\\\"4\\\" width=\\\"18\\\" height=\\\"18\\\" rx=\\\"2\\\"/><path d=\\\"M16 2v4M8 2v4M3 10h18\\\"/>\",\"title\":\"Flexible Leave Policy\"},{\"body\":\"Statutory PF contributions and long-term savings support as part of your package.\",\"icon\":\"<path d=\\\"M3 21h18M5 21V9l6-4 6 4v12M9 21v-6h6v6\\\"/>\",\"title\":\"Provident Fund\"},{\"body\":\"Peer and leadership recognition for people who quietly keep critical systems online.\",\"icon\":\"<path d=\\\"M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5-4.94-2.6-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 3.5z\\\"/>\",\"title\":\"Employee Recognition\"}],\"title\":\"We Take Care of Our People\",\"eyebrow\":\"EMPLOYEE BENEFITS\",\"eyebrowClass\":\"eyebrow-orange\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(49, 3, 'careers_apply', 'apply', 'Apply Online', 7, 1, '{\"body\":\"Fill in your details below — our HR team reviews every application within 3–5 business days.\",\"roles\":[\"Solar Design Engineer\",\"UPS Service Engineer\",\"Site Supervisor — Solar EPC\",\"Business Development Manager\",\"Graduate Engineer Trainee\",\"Internship Program\",\"General Application\"],\"title\":\"Ready to Apply?\",\"eyebrow\":\"APPLY ONLINE\",\"formIntro\":\"All fields marked with * are required.\",\"formTitle\":\"Submit Your Application\",\"nextSteps\":[{\"text\":\"We review all applications within 3–5 business days.\"},{\"text\":\"Shortlisted candidates will receive a phone call or email to schedule the first interview.\"},{\"text\":\"The final interview is typically conducted with the Hiring Manager and the Head of Department or Department Manager.\"}],\"nextTitle\":\"What Happens Next?\",\"sideItems\":[{\"href\":\"mailto:careers@zigma-technologies.com\",\"icon\":\"<rect x=\\\"2\\\" y=\\\"4\\\" width=\\\"20\\\" height=\\\"16\\\" rx=\\\"2\\\"/><path d=\\\"M22 6l-10 7L2 6\\\"/>\",\"label\":\"Careers Email\",\"value\":\"careers@zigma-technologies.com\"},{\"href\":\"mailto:hr@zigma-technologies.com\",\"icon\":\"<rect x=\\\"2\\\" y=\\\"4\\\" width=\\\"20\\\" height=\\\"16\\\" rx=\\\"2\\\"/><path d=\\\"M22 6l-10 7L2 6\\\"/>\",\"label\":\"Contact HR\",\"value\":\"hr@zigma-technologies.com\"},{\"href\":\"tel:+919590137444\",\"icon\":\"<path d=\\\"M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z\\\"/>\",\"label\":\"Phone\",\"value\":\"+91 95901 37444\"}],\"sideTitle\":\"Questions About a Role?\",\"privacyNote\":\"By applying, you agree to be contacted by Zigma Technologies regarding your application. We never share your details with third parties.\",\"submitLabel\":\"Submit Application →\",\"successBody\":\"Thank you for applying to Zigma Technologies. We sincerely appreciate your interest in joining our team. Our recruitment team will review your application and contact you if your profile matches our current requirements. We look forward to connecting with you soon.\",\"successTitle\":\"Application received\"}', '{}', '2026-08-12 10:06:48', '2026-08-12 10:06:48'),
(50, 2, 'page_hero', 'contact-hero', 'Contact Hero', 0, 1, '{\"lead\":\"Whether you\'re investing in Solar Energy Systems, UPS & Critical Power Infrastructure, Battery Energy Storage (BESS), AMC & O&M Services, Emergency Technical Support, or comprehensive Power & Energy Engineering Solutions, our team is prepared to support your business at every stage.\",\"image\":\"/assets/images/zigma-technologies-help-desk-team-assist.jpg\",\"title\":\"Contact Us\",\"eyebrow\":\"GET IN TOUCH\",\"imageAlt\":\"Zigma Technologies help desk team assisting customers with solar, UPS, and engineering support\",\"bodyClass\":\"contact-page\",\"breadcrumb\":\"Contact\",\"leadAccent\":\"Tell us what you need, and we\'ll connect you with the right expert to deliver dependable, efficient, and future-ready solutions.\",\"leadEmphasis\":\"Reliable power begins with the right engineering partner.\"}', '{}', '2026-08-12 10:12:25', '2026-08-12 10:12:25'),
(51, 2, 'quick_contact', 'quick-contact', 'Quick Contact', 1, 1, '{\"items\":[{\"href\":\"tel:+919590137444\",\"icon\":\"<path d=\\\"M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z\\\"/>\",\"label\":\"Call Us\",\"value\":\"+91 95901 37444\"},{\"href\":\"mailto:support@zigma-technologies.com\",\"icon\":\"<rect x=\\\"2\\\" y=\\\"4\\\" width=\\\"20\\\" height=\\\"16\\\" rx=\\\"2\\\"/><path d=\\\"M22 6l-10 7L2 6\\\"/>\",\"label\":\"Email Us\",\"value\":\"support@zigma-technologies.com\"},{\"href\":\"#contact-form\",\"icon\":\"<path d=\\\"M9 12h6M9 16h6M9 8h2\\\"/><path d=\\\"M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z\\\"/><path d=\\\"M14 3v5h5\\\"/>\",\"label\":\"Get a Quote\",\"value\":\"Request a Quote\",\"subject\":\"Request a Quote\"},{\"href\":\"tel:+919590137666\",\"icon\":\"<path d=\\\"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z\\\"/><path d=\\\"M12 9v4\\\"/><path d=\\\"M12 17h.01\\\"/>\",\"label\":\"Emergency Call\",\"value\":\"+91 9590137666\",\"emergency\":true}]}', '{}', '2026-08-12 10:12:25', '2026-08-12 10:12:25'),
(52, 2, 'feature_grid', 'how-we-help', 'How Can We Help', 2, 1, '{\"body\":\"Pick the option closest to your requirement and we\'ll route it straight to the right team.\",\"tone\":\"light\",\"cards\":[{\"body\":\"Enquire about a new solar installation, EPC project, or AMC for an existing solar plant.\",\"icon\":\"<circle cx=\\\"12\\\" cy=\\\"12\\\" r=\\\"4\\\"/><path d=\\\"M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41\\\"/>\",\"title\":\"Solar Solution\",\"subject\":\"Solar Solution\",\"variant\":\"pastel-green\",\"linkLabel\":\"Ask About Solar →\"},{\"body\":\"Talk to us about UPS sizing, installation, upgrades, or power backup for your facility.\",\"icon\":\"<path d=\\\"M13 2L4 14h7l-1 8 9-12h-7l1-8z\\\"/>\",\"title\":\"UPS Solution\",\"subject\":\"UPS Solution\",\"variant\":\"pastel-green\",\"linkLabel\":\"Ask About UPS →\"},{\"body\":\"Get guidance on battery energy storage, hybrid systems, or replacement battery banks.\",\"icon\":\"<rect x=\\\"2\\\" y=\\\"8\\\" width=\\\"18\\\" height=\\\"8\\\" rx=\\\"1.5\\\"/><path d=\\\"M22 10v4\\\"/><path d=\\\"M6 8v8M10 8v8\\\"/>\",\"title\":\"BESS- Battery System\",\"subject\":\"BESS- Battery System\",\"variant\":\"pastel-green\",\"linkLabel\":\"Ask About Batteries →\"},{\"body\":\"Get a proposal for AC/DC EV charging stations, fleet charging, or Solar + EV + BESS integration.\",\"icon\":\"<path d=\\\"M13 2L4 14h7l-1 8 9-12h-7l1-8z\\\"/>\",\"title\":\"EV Charging Solution\",\"subject\":\"EV Charging Solution\",\"variant\":\"pastel-green\",\"linkLabel\":\"Ask About EV Charging →\"},{\"body\":\"Set up or renew an Annual Maintenance Contract, or log a routine service, repair, or inspection.\",\"icon\":\"<path d=\\\"M14.7 6.3a4 4 0 00-5.66 5.66l-6.2 6.2a1.5 1.5 0 002.12 2.12l6.2-6.2a4 4 0 005.66-5.66l-2.5 2.5-2.12-2.12z\\\"/>\",\"title\":\"AMC & Service Request\",\"subject\":\"AMC & Service Request\",\"linkLabel\":\"Start Request →\"},{\"body\":\"Get a tailored proposal for a new solar EPC, UPS, battery storage, or engineering project.\",\"icon\":\"<path d=\\\"M9 12h6M9 16h6M9 8h2\\\"/><path d=\\\"M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z\\\"/><path d=\\\"M14 3v5h5\\\"/>\",\"title\":\"Request a Quote\",\"subject\":\"Request a Quote\",\"linkLabel\":\"Get a Quote →\"},{\"body\":\"Schedule an on-site survey or assessment with one of our field engineers.\",\"icon\":\"<rect x=\\\"3\\\" y=\\\"4\\\" width=\\\"18\\\" height=\\\"18\\\" rx=\\\"2\\\"/><path d=\\\"M16 2v4M8 2v4M3 10h18\\\"/><path d=\\\"M9 15l2 2 4-4\\\"/>\",\"title\":\"Site Visit Request\",\"subject\":\"Site Visit Request\",\"linkLabel\":\"Schedule a Visit →\"},{\"body\":\"Power down or system failure? Our 24×7 response team is on call, every day of the year.\",\"icon\":\"<path d=\\\"M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z\\\"/><path d=\\\"M12 9v4\\\"/><path d=\\\"M12 17h.01\\\"/>\",\"title\":\"Emergency Service Support\",\"variant\":\"emergency\",\"linkHref\":\"tel:+919590137666\",\"linkLabel\":\"Call Now: +91 9590137666 →\"}],\"title\":\"Tell Us What You Need\",\"eyebrow\":\"HOW CAN WE HELP\",\"eyebrowClass\":\"eyebrow-orange\"}', '{}', '2026-08-12 10:12:25', '2026-08-12 10:12:25'),
(53, 2, 'locations', 'locations', 'Locations', 3, 1, '{\"body\":\"Head-quartered in Bengaluru with regional service hubs across India, so field engineers are never far from your site.\",\"title\":\"Where to Find Us\",\"eyebrow\":\"LOCATIONS\",\"mapTitle\":\"Zigma Technologies — Bengaluru Head Office\",\"locations\":[{\"tag\":\"Head Office\",\"icon\":\"<path d=\\\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z\\\"/><circle cx=\\\"12\\\" cy=\\\"10\\\" r=\\\"3\\\"/>\",\"phone\":\"+91 95901 37444\",\"title\":\"Bengaluru, Karnataka\",\"address\":\"19 & 20 Brindavan Enclaves, DLF City Road, 3rd Cross, Rukmaiah Layout, Akshayanagar, Bengaluru-560114\",\"phoneHref\":\"tel:+919590137444\",\"directionsUrl\":\"https://maps.app.goo.gl/P4Lxzy9z5p9imzHRA\"},{\"tag\":\"Regional Service Hub\",\"icon\":\"<path d=\\\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z\\\"/><circle cx=\\\"12\\\" cy=\\\"10\\\" r=\\\"3\\\"/>\",\"phone\":\"+91 9590137666\",\"title\":\"Mumbai, Maharashtra\",\"address\":\"Siddhi Vinayak Apt, Plot no - 50, Sector 20, Kopar Khairane, Navi Mumbai, Maharashtra 400709\",\"phoneHref\":\"tel:+919590137666\",\"directionsUrl\":\"https://maps.app.goo.gl/NquKywecruod2gXb7\"},{\"tag\":\"Regional Service Hub\",\"icon\":\"<path d=\\\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z\\\"/><circle cx=\\\"12\\\" cy=\\\"10\\\" r=\\\"3\\\"/>\",\"phone\":\"+91 9590137666\",\"title\":\"Delhi, Uttar Pradesh\",\"address\":\"G. Floor, B Block Ground, 48 B, E Block, Sector 7, Noida, Uttar Pradesh 201301\",\"phoneHref\":\"tel:+919590137666\",\"directionsUrl\":\"https://maps.app.goo.gl/yJWGuMbMmAosL9Zq5\"}],\"mapEmbedUrl\":\"https://www.google.com/maps?q=19+%26+20+Brindavan+Enclaves,+DLF+City+Road,+Akshayanagar,+Bengaluru-560114&output=embed\",\"eyebrowClass\":\"eyebrow-orange\"}', '{}', '2026-08-12 10:12:25', '2026-08-12 10:12:25'),
(54, 2, 'enquiry_form', 'contact-form', 'Contact Form', 4, 1, '{\"body\":\"Fill in the details below — a Zigma engineer will respond within one business day.\",\"hours\":[{\"label\":\"Mon – Sat\",\"value\":\"9:00 AM – 7:00 PM\"},{\"label\":\"Sunday\",\"value\":\"Closed\"}],\"title\":\"Tell Us About Your Project\",\"eyebrow\":\"SEND A MESSAGE\",\"formIntro\":\"All fields marked with * are required.\",\"formTitle\":\"Send us a message\",\"sideItems\":[{\"href\":\"tel:+919590137444\",\"icon\":\"<path d=\\\"M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.34 1.79.65 2.65a2 2 0 01-.45 2.11L8.09 9.7a16 16 0 006 6l1.22-1.22a2 2 0 012.11-.45c.86.31 1.75.53 2.65.65A2 2 0 0122 16.92z\\\"/>\",\"label\":\"Phone\",\"value\":\"+91 95901 37444\"},{\"href\":\"mailto:support@zigma-technologies.com\",\"icon\":\"<rect x=\\\"2\\\" y=\\\"4\\\" width=\\\"20\\\" height=\\\"16\\\" rx=\\\"2\\\"/><path d=\\\"M22 6l-10 7L2 6\\\"/>\",\"label\":\"Email\",\"value\":\"support@zigma-technologies.com\"},{\"icon\":\"<path d=\\\"M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z\\\"/><circle cx=\\\"12\\\" cy=\\\"10\\\" r=\\\"3\\\"/>\",\"label\":\"Head Office\",\"value\":\"Bengaluru, Karnataka\"}],\"sideTitle\":\"Direct Contact\",\"hoursTitle\":\"Business Hours\",\"privacyNote\":\"By submitting, you agree to be contacted by Zigma Technologies regarding your enquiry. We never share your details with third parties.\",\"submitLabel\":\"Submit Request →\",\"successBody\":\"A member of our engineering team will get back to you within one business day. For anything urgent, please call our 24×7 emergency line.\",\"successTitle\":\"Thank you — message received\",\"emergencyNote\":{\"body\":\"Our emergency call line is staffed every day of the year for critical power failures & all technical support.\",\"phone\":\"+91 9590137666\",\"title\":\"Need urgent help?\"}}', '{}', '2026-08-12 10:12:25', '2026-08-12 10:12:25');

-- ----------------------------
-- Table `pages`
-- ----------------------------
DROP TABLE IF EXISTS `pages`;
CREATE TABLE `pages` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(120) NOT NULL,
  `title` varchar(255) NOT NULL,
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` text,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `pages` (`id`, `slug`, `title`, `meta_title`, `meta_description`, `status`, `sort_order`, `enabled`, `created_at`, `updated_at`) VALUES
(1, 'home', 'Home', 'Zigma Technologies', 'Solar, UPS, BESS & EV Charging Infrastructure in India', 'published', 0, 1, '2026-08-12 06:50:35', '2026-08-12 06:50:35'),
(2, 'contact', 'Contact', 'Contact | Zigma Technologies', 'Get in touch with Zigma Technologies for solar, UPS, BESS and EV charging support.', 'published', 0, 1, '2026-08-12 09:16:02', '2026-08-12 09:46:23'),
(3, 'careers', 'Careers', 'Careers | Zigma Technologies', 'Join Zigma Technologies — careers in solar, power systems, and industrial engineering.', 'published', 0, 1, '2026-08-12 09:16:09', '2026-08-12 09:16:09'),
(4, 'certifications', 'Certifications', 'Certifications | Zigma Technologies', 'OEM authorizations, ISO certification, and engineering partnerships.', 'published', 0, 1, '2026-08-12 09:16:13', '2026-08-12 09:16:13'),
(5, 'privacy', 'Privacy Policy', 'Privacy Policy | Zigma Technologies', 'How Zigma Technologies collects, uses, and protects personal information.', 'published', 0, 1, '2026-08-12 09:16:17', '2026-08-12 09:16:17'),
(6, 'terms', 'Terms of Use', 'Terms of Use | Zigma Technologies', 'Terms governing use of the Zigma Technologies website.', 'published', 0, 1, '2026-08-12 09:16:18', '2026-08-12 09:16:18');

-- ----------------------------
-- Table `partner_documents`
-- ----------------------------
DROP TABLE IF EXISTS `partner_documents`;
CREATE TABLE `partner_documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `file_url` varchar(500) NOT NULL,
  `doc_type` varchar(80) NOT NULL DEFAULT 'price_list',
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_partner_docs` (`enabled`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (empty)

-- ----------------------------
-- Table `partner_users`
-- ----------------------------
DROP TABLE IF EXISTS `partner_users`;
CREATE TABLE `partner_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `name` varchar(160) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `company` varchar(190) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_partner_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (empty)

-- ----------------------------
-- Table `press_posts`
-- ----------------------------
DROP TABLE IF EXISTS `press_posts`;
CREATE TABLE `press_posts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) NOT NULL,
  `title` varchar(255) NOT NULL,
  `excerpt` text,
  `body_html` mediumtext,
  `cover_url` varchar(500) DEFAULT NULL,
  `source_name` varchar(160) DEFAULT NULL,
  `source_url` varchar(500) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_press_slug` (`slug`),
  KEY `idx_press_pub` (`status`,`enabled`,`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (empty)

-- ----------------------------
-- Table `resource_posts`
-- ----------------------------
DROP TABLE IF EXISTS `resource_posts`;
CREATE TABLE `resource_posts` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(160) NOT NULL,
  `title` varchar(255) NOT NULL,
  `excerpt` text,
  `body_html` mediumtext,
  `cover_url` varchar(500) DEFAULT NULL,
  `tags_json` json DEFAULT NULL,
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `meta_title` varchar(255) DEFAULT NULL,
  `meta_description` varchar(500) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_resource_slug` (`slug`),
  KEY `idx_resource_pub` (`status`,`enabled`,`published_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `resource_posts` (`id`, `slug`, `title`, `excerpt`, `body_html`, `cover_url`, `tags_json`, `status`, `meta_title`, `meta_description`, `published_at`, `enabled`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'ups-sizing-guide', 'UPS sizing guide for industrial and IT loads', 'How to estimate kVA, autonomy, and redundancy before you buy a UPS.', '<p>Correct UPS sizing protects critical loads without overspending on oversized hardware. Start with measured load (kW), apply a power-factor conversion to kVA, then add headroom for growth and inrush.</p>\n<p><strong>Checklist:</strong> list critical vs non-critical loads; note single-phase vs three-phase; decide autonomy (minutes); choose N or N+1 redundancy; plan battery chemistry and service access.</p>\n<p>Zigma engineers can validate your BOM against site conditions, harmonic content, and generator compatibility before procurement.</p>', '/assets/images/seed-abb-ups.jpg', '[\"UPS\",\"Guide\",\"Sizing\"]', 'published', 'UPS Sizing Guide | Zigma Technologies', 'Practical UPS sizing checklist for industrial plants, server rooms, and commercial facilities in India.', '2026-08-12 19:24:12', 1, 0, '2026-08-13 00:54:12', '2026-08-13 00:54:12'),
(2, 'solar-om-checklist', 'Solar O&amp;M checklist for commercial rooftops', 'A practical operations checklist to keep C&amp;I solar plants performing year-round.', '<p>Commercial solar underperforms quietly when soiling, loose terminations, or inverter faults go unnoticed. A disciplined O&amp;M rhythm protects yield and warranty compliance.</p>\n<p><strong>Monthly:</strong> visual inspection, string current spot-checks, inverter alarm review, vegetation/soiling notes.</p>\n<p><strong>Quarterly:</strong> torque checks on critical joints, thermal imaging hotspots, IV curve sampling, earthing verification.</p>\n<p>Zigma Solar AMC teams deliver scheduled O&amp;M with clear reporting so facility managers see production vs expectation.</p>', '/assets/images/seed-solar-modules.jpg', '[\"Solar\",\"O&M\",\"Checklist\"]', 'published', 'Solar O&M Checklist | Zigma Technologies', 'Monthly and quarterly solar O&M checklist covering cleaning, IV curves, string health, and inverter alarms.', '2026-08-12 19:24:12', 1, 0, '2026-08-13 00:54:12', '2026-08-13 00:54:12'),
(3, 'bess-peak-shaving', 'BESS peak shaving: when storage pays for itself', 'How battery energy storage cuts demand charges and firms solar generation.', '<p>Peak shaving uses stored energy during short high-demand windows that drive tariff spikes. Pairing BESS with an energy management system (EMS) automates charge/discharge against your load profile.</p>\n<p>Good candidates: factories with sharp process peaks, campuses with EV charging growth, and solar sites exporting little while paying high demand charges.</p>\n<p>Zigma designs BESS packages with PCS, EMS, and commissioning so dispatch matches your commercial goals—not just nameplate kWh.</p>', '/assets/images/city-skyline-with-solar-panels-and-indus.jpg', '[\"BESS\",\"EMS\",\"Peak Shaving\"]', 'published', 'BESS Peak Shaving Guide | Zigma Technologies', 'Learn when battery energy storage systems reduce demand charges and improve solar self-consumption.', '2026-08-12 19:24:12', 1, 0, '2026-08-13 00:54:12', '2026-08-13 00:54:12');

-- ----------------------------
-- Table `site_testimonials`
-- ----------------------------
DROP TABLE IF EXISTS `site_testimonials`;
CREATE TABLE `site_testimonials` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `quote` text NOT NULL,
  `author_name` varchar(160) NOT NULL,
  `author_role` varchar(160) DEFAULT NULL,
  `company` varchar(160) DEFAULT NULL,
  `rating` tinyint unsigned DEFAULT NULL,
  `locale` varchar(8) NOT NULL DEFAULT 'en',
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_testimonial_pub` (`status`,`enabled`,`featured`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `site_testimonials` (`id`, `quote`, `author_name`, `author_role`, `company`, `rating`, `locale`, `status`, `featured`, `sort_order`, `enabled`, `created_at`, `updated_at`) VALUES
(1, 'Zigma commissioned our industrial UPS with clear documentation and zero drama during cutover.', 'Facilities Lead', 'Plant Engineering', 'Manufacturing client', 5, 'en', 'published', 1, 0, 1, '2026-08-13 12:51:59', '2026-08-13 12:51:59'),
(2, 'Their solar O&M reporting helped us catch string underperformance early and protect yield.', 'Energy Manager', 'Campus Operations', 'Education campus', 5, 'en', 'published', 1, 0, 1, '2026-08-13 12:51:59', '2026-08-13 12:51:59'),
(3, 'Responsive AMC desk — emergency support when a critical UPS alarm hit after hours.', 'IT Infrastructure', 'Data room owner', 'BFSI client', 5, 'en', 'published', 1, 0, 1, '2026-08-13 12:51:59', '2026-08-13 12:51:59');

-- ----------------------------
-- Table `theme_settings`
-- ----------------------------
DROP TABLE IF EXISTS `theme_settings`;
CREATE TABLE `theme_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(80) NOT NULL,
  `value_json` json NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `theme_settings` (`id`, `setting_key`, `value_json`, `updated_at`) VALUES
(1, 'site', '{\"email\":\"info@zigma-technologies.com\",\"phone\":\"+91 95901 37444\",\"logoUrl\":\"/assets/images/zigma-technologies-logo.png\",\"ogImage\":\"/assets/images/zigma-technologies-logo.png\",\"tagline\":\"POWER & ENERGY ENGINEERING\",\"termsUrl\":\"/terms\",\"whatsapp\":\"919590137444\",\"copyright\":\"© 2026 Zigma Technologies. All rights reserved.\",\"privacyUrl\":\"/privacy\",\"companyName\":\"Zigma Technologies\",\"facebookUrl\":\"\",\"footerBlurb\":\"Engineering power infrastructure for Indian industry since 2006 — Solar EPC, Industrial UPS, Battery Solutions, and 24×7 AMC.\",\"linkedinUrl\":\"\",\"supportEmail\":\"support@zigma-technologies.com\",\"addressPostal\":\"\",\"addressRegion\":\"Karnataka\",\"addressStreet\":\"\",\"headerCtaHref\":\"/contact#contact-form\",\"addressCountry\":\"IN\",\"emergencyPhone\":\"+91 95901 37666\",\"headerCtaLabel\":\"Request Consultation\",\"addressLocality\":\"Bengaluru\",\"plausibleDomain\":\"\",\"ga4MeasurementId\":\"\",\"enquiryNotifyEmail\":\"info@zigma-technologies.com\",\"enquiryNotifyEnabled\":\"true\",\"defaultMetaDescription\":\"Zigma Technologies delivers Solar EPC, UPS, BESS, EV charging, and industrial engineering solutions across India.\",\"visitorAutoReplyEnabled\":\"true\",\"analyticsConsentRequired\":\"true\"}', '2026-08-13 00:56:02');

-- ----------------------------
-- Table `ztools_push_tokens`
-- ----------------------------
DROP TABLE IF EXISTS `ztools_push_tokens`;
CREATE TABLE `ztools_push_tokens` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `expo_push_token` varchar(255) NOT NULL,
  `platform` varchar(20) NOT NULL DEFAULT 'android',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ztools_push_token` (`expo_push_token`),
  KEY `idx_ztools_push_user` (`user_id`),
  CONSTRAINT `fk_ztools_push_user` FOREIGN KEY (`user_id`) REFERENCES `ztools_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- (empty)

-- ----------------------------
-- Table `ztools_tools`
-- ----------------------------
DROP TABLE IF EXISTS `ztools_tools`;
CREATE TABLE `ztools_tools` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(80) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `icon` varchar(40) DEFAULT NULL,
  `route_path` varchar(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `ztools_tools` (`id`, `slug`, `name`, `description`, `icon`, `route_path`, `enabled`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'quotation', 'Quotation Builder', 'Create and export professional sales quotations for UPS, solar, and BESS packages.', 'quote', '/tools/solution-finder', 1, 10, '2026-08-15 22:13:42', '2026-08-18 21:19:55'),
(2, 'roi-calc', 'Solar ROI Calculator', 'Estimate payback, savings, and lifetime returns for rooftop and industrial solar.', 'solar', '/tools/solar-roi', 0, 20, '2026-08-15 22:13:42', '2026-08-18 21:19:55'),
(3, 'ups-sizing', 'UPS Sizing Tool', 'Size UPS capacity and battery backup for critical load profiles.', 'ups', '/tools/ups-calculator', 1, 30, '2026-08-15 22:13:42', '2026-08-18 21:19:55'),
(4, 'load-audit', 'Load Audit Worksheet', 'Capture facility loads and export a structured audit summary.', 'audit', '/tools/solution-finder', 1, 40, '2026-08-15 22:13:42', '2026-08-18 21:19:55'),
(5, 'battery-life', 'Battery Life Estimator', 'Project battery replacement cycles and maintenance windows.', 'battery', '/tools/ups-calculator', 1, 50, '2026-08-15 22:13:42', '2026-08-18 21:19:55'),
(11, 'solution-finder', 'Solution Finder', 'Match facility needs to UPS, solar, and energy solutions.', 'audit', '/tools/solution-finder', 1, 5, '2026-08-18 21:19:55', '2026-08-18 21:19:55');

-- ----------------------------
-- Table `ztools_users`
-- ----------------------------
DROP TABLE IF EXISTS `ztools_users`;
CREATE TABLE `ztools_users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(120) NOT NULL,
  `company` varchar(160) DEFAULT NULL,
  `phone` varchar(40) DEFAULT NULL,
  `status` enum('pending_approval','approved','rejected','disabled') NOT NULL DEFAULT 'pending_approval',
  `source` enum('registration','admin') NOT NULL DEFAULT 'registration',
  `requested_tool_ids` json DEFAULT NULL,
  `approved_tool_ids` json DEFAULT NULL,
  `admin_notes` text,
  `approved_by` int unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `ztools_users` (`id`, `email`, `password_hash`, `name`, `company`, `phone`, `status`, `source`, `requested_tool_ids`, `approved_tool_ids`, `admin_notes`, `approved_by`, `approved_at`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'iamsanthosh@gmail.com', '$2b$12$U60trKQrKVVbyAB0QxjYv.hqh6wDSjjiucX8j.dkZJ6f5TOKAGB0y', 'Santhosh HS', 'JustXSystems', '09972800544', 'approved', 'registration', '[1,3,2]', '[1,3,2]', NULL, 1, '2026-08-15 22:15:45', '2026-08-18 19:34:07', '2026-08-15 22:14:39', '2026-08-18 19:34:07');

SET FOREIGN_KEY_CHECKS=1;
