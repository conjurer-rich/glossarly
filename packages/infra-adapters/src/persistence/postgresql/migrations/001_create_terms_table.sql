CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS term_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  term VARCHAR(500) NOT NULL,
  definition TEXT NOT NULL,
  example TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'JARGON',
  confidence INTEGER NOT NULL DEFAULT 75 CHECK (confidence >= 0 AND confidence <= 100),
  source VARCHAR(50) NOT NULL DEFAULT 'AI_GENERATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_term_definitions_term ON term_definitions (LOWER(term));
CREATE INDEX idx_term_definitions_category ON term_definitions (category);
CREATE INDEX idx_term_definitions_search ON term_definitions USING gin (to_tsvector('english', term || ' ' || definition));
