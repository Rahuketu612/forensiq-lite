-- ForensiQ Lite Database Initialization
-- This script runs on first container startup

-- Create custom types if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'AUDITOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE case_status AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER', 'REFUND', 'FEE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flag_type AS ENUM (
        'STRUCTURING',
        'ROUND_AMOUNT',
        'UNUSUAL_FREQUENCY',
        'LARGE_TRANSACTION',
        'RAPID_MOVEMENT',
        'EMPTY_DESCRIPTIONS',
        'LOCATION_ANOMALY',
        'TIME_ANOMALY',
        'VENDOR_ANOMALY',
        'AMOUNT_PATTERN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE forensiq TO forensiq;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log initialization completion
DO $$ BEGIN
    RAISE NOTICE 'ForensiQ Lite database initialized successfully';
END $$;