-- 1 = in service (offered for booking), 0 = out of service (hidden, bookings refused)
ALTER TABLE workstations ADD COLUMN in_service INTEGER NOT NULL DEFAULT 1 CHECK (in_service IN (0, 1));
