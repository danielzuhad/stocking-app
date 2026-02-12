CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_action_trgm_idx" ON "activity_logs" USING gin ("action" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_target_type_trgm_idx" ON "activity_logs" USING gin ((COALESCE("target_type", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_target_id_trgm_idx" ON "activity_logs" USING gin ((COALESCE("target_id", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_trgm_idx" ON "users" USING gin ("username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_trgm_idx" ON "companies" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_slug_trgm_idx" ON "companies" USING gin ("slug" gin_trgm_ops);
