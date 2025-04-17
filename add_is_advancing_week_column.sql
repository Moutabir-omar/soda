-- Add is_advancing_week column to games table
ALTER TABLE games 
ADD COLUMN is_advancing_week BOOLEAN NOT NULL DEFAULT FALSE;

-- Comment explaining the purpose
COMMENT ON COLUMN games.is_advancing_week IS 'Flag to prevent race conditions when multiple processes try to advance the game week simultaneously'; 