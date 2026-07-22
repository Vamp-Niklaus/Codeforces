-- Enable UUID Extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Problem Interaction Table
-- Stores user-specific states for individual problems (Read, Starred)
CREATE TABLE IF NOT EXISTS user_problem_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    problem_id VARCHAR(64) NOT NULL, -- e.g., "1800-A" (Contest ID + Index)
    contest_id INT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id)
);

-- Indexing for high performance filtering
CREATE INDEX IF NOT EXISTS idx_user_problem_states_user_id ON user_problem_states(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_states_problem_id ON user_problem_states(problem_id);

-- Row Level Security (RLS)
ALTER TABLE user_problem_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own problem states
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_problem_states' AND policyname = 'Users can manage their own problem states'
    ) THEN
        CREATE POLICY "Users can manage their own problem states"
        ON user_problem_states
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- User History Table
-- Stores recently viewed contests and problems
CREATE TABLE IF NOT EXISTS user_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL, -- 'CONTEST' or 'PROBLEM'
    item_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    contest_id INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_history_item UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);

ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_history' AND policyname = 'Users can manage their own history'
    ) THEN
        CREATE POLICY "Users can manage their own history"
        ON user_history
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
