-- Add admin notes to enquiries (safe to re-run if column already exists fails — ignore duplicate)
ALTER TABLE enquiries
  ADD COLUMN admin_notes TEXT NULL AFTER status;
