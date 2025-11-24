CREATE INDEX IF NOT EXISTS slot_resource_starts_idx ON "Slot"("resourceId","startsAt");
CREATE INDEX IF NOT EXISTS hold_expires_idx ON "Hold"("expiresAt");
CREATE INDEX IF NOT EXISTS reservation_resource_idx ON "Reservation"("resourceId");
