-- Daily Check-in Templates Table for Homework Hero App
-- Run this in your Supabase SQL Editor

-- Create the daily_checkin_templates table
CREATE TABLE IF NOT EXISTS daily_checkin_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    schedule_type TEXT NOT NULL,            -- daily, weekdays, weekends, custom
    custom_days INTEGER[] DEFAULT '{}',     -- 0=Sunday, 1-6=Monday to Saturday
    start_date TEXT NOT NULL,               -- Start date for task generation
    end_date TEXT,                          -- End date for task generation (optional)
    is_active BOOLEAN DEFAULT TRUE,
    user_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_checkin_user ON daily_checkin_templates(user_name);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_checkin_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all on daily_checkin_templates" ON daily_checkin_templates
    FOR ALL USING (true) WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_checkin_updated_at BEFORE UPDATE ON daily_checkin_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
