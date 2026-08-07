-- Align seeded Sector reference data with the frontend onboarding wizard's actual sector list
-- (frontend/src/components/OnboardingPage.tsx MALAYSIAN_SECTORS), so the onboarding dropdown can
-- be driven directly from GET /reference/sectors instead of a separate hardcoded frontend array.

DELETE FROM sector WHERE code IN ('LOGISTICS', 'RETAIL_TRADE', 'TECHNOLOGY_SERVICES', 'AGRICULTURE', 'CONSTRUCTION_REAL_ESTATE', 'OTHER');

UPDATE sector SET name = 'Manufacturing & Heavy Industry' WHERE code = 'MANUFACTURING';
UPDATE sector SET name = 'Financial Services & Banking' WHERE code = 'FINANCIAL_SERVICES';

INSERT INTO sector (code, name) VALUES
    ('TECHNOLOGY_SOFTWARE', 'Technology & Software Services'),
    ('AGRICULTURE_PLANTATION', 'Agriculture & Plantation (Palm Oil)'),
    ('CONSTRUCTION_PROPERTY', 'Construction & Property Development'),
    ('ENERGY_OIL_GAS', 'Energy & Oil & Gas Utilities'),
    ('CONSUMER_RETAIL', 'Consumer Products & Retail Services'),
    ('HEALTHCARE_PHARMA', 'Healthcare & Pharmaceuticals');
