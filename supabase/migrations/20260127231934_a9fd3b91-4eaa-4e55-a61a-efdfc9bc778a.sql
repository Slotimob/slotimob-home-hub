-- Add lead_id column to properties table
ALTER TABLE properties ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Add lead_id column to units table
ALTER TABLE units ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_properties_lead_id ON properties(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_units_lead_id ON units(lead_id) WHERE lead_id IS NOT NULL;