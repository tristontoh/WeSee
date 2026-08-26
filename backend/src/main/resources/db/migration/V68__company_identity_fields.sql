ALTER TABLE company ADD COLUMN registration_number VARCHAR(100);
ALTER TABLE company ADD COLUMN ticker_code VARCHAR(20);
ALTER TABLE company ADD COLUMN date_of_incorporation DATE;
ALTER TABLE company ADD COLUMN country_of_incorporation VARCHAR(100);

ALTER TABLE company ADD COLUMN listing_board VARCHAR(30);
ALTER TABLE company ADD COLUMN company_type VARCHAR(30);

ALTER TABLE company ADD COLUMN registered_office_address VARCHAR(500);
ALTER TABLE company ADD COLUMN business_address VARCHAR(500);
ALTER TABLE company ADD COLUMN contact_person_name VARCHAR(200);
ALTER TABLE company ADD COLUMN contact_person_designation VARCHAR(150);
ALTER TABLE company ADD COLUMN contact_person_email VARCHAR(255);
ALTER TABLE company ADD COLUMN contact_person_phone VARCHAR(50);
ALTER TABLE company ADD COLUMN tax_identification_number VARCHAR(100);
