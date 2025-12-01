// src/lib/logActivity.ts
import * as schema from "@/schema";
import { ExtractTablesWithRelations, InferInsertModel } from "drizzle-orm";
import { NeonHttpQueryResultHKT } from "drizzle-orm/neon-http";
import { PgTransaction } from "drizzle-orm/pg-core";

type LogActivityInput = Omit<
  InferInsertModel<typeof schema.inventoryActivitiesTable>,
  "id" | "created_at"
>;

export async function logActivity(
  tx: PgTransaction<
    NeonHttpQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
  >,
  data: LogActivityInput
) {
  return tx.insert(schema.inventoryActivitiesTable).values({
    ...data,
    created_at: new Date(),
  });
}
