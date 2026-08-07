CREATE TABLE emission_factor (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    scope VARCHAR(10) NOT NULL,
    activity_unit VARCHAR(30) NOT NULL,
    factor_value NUMERIC(14, 6) NOT NULL,
    source VARCHAR(200) NOT NULL,
    source_year INTEGER NOT NULL
);

INSERT INTO emission_factor (id, name, scope, activity_unit, factor_value, source, source_year) VALUES
  ('DIESEL_STATIONARY', 'Diesel (Stationary Combustion)', 'SCOPE_1', 'liters', 2.68, 'MGTC LCOS 2024', 2024),
  ('PETROL_MOBILE', 'Petrol (Mobile Combustion / Fleet)', 'SCOPE_1', 'liters', 2.31, 'MGTC LCOS 2024', 2024),
  ('LPG_STATIONARY', 'LPG (Stationary Combustion)', 'SCOPE_1', 'kg', 2.98, 'IPCC 2006 Default', 2006),
  ('NATURAL_GAS', 'Natural Gas (Stationary Combustion)', 'SCOPE_1', 'kWh', 0.18, 'IPCC 2006 Default', 2006),
  ('GRID_ELECTRICITY_MY', 'Grid Electricity (Peninsular Malaysia)', 'SCOPE_2', 'kWh', 0.585, 'MGTC LCOS 2024', 2024),
  ('AIR_TRAVEL_DOMESTIC', 'Business Air Travel (Domestic)', 'SCOPE_3', 'km', 0.15, 'DEFRA 2024', 2024),
  ('AIR_TRAVEL_INTL', 'Business Air Travel (International)', 'SCOPE_3', 'km', 0.19, 'DEFRA 2024', 2024),
  ('FREIGHT_ROAD', 'Freight Transport (Road)', 'SCOPE_3', 'km', 0.10, 'DEFRA 2024', 2024);

CREATE TABLE emission_activity_entry (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES company (id) ON DELETE RESTRICT,
    fiscal_year INTEGER NOT NULL,
    emission_factor_id VARCHAR(40) NOT NULL REFERENCES emission_factor (id),
    quantity NUMERIC(18, 4) NOT NULL,
    calculated_tco2e NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_emission_activity_entry_company_year ON emission_activity_entry (company_id, fiscal_year);
