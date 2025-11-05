// src/lib/logActivity.ts
import { inventoryActivitiesTable } from "@/schema";
import { ExtractTablesWithRelations, InferInsertModel } from "drizzle-orm";
import { NeonHttpQueryResultHKT } from "drizzle-orm/neon-http";
import { PgTransaction } from "drizzle-orm/pg-core";

type LogActivityInput = Omit<
  InferInsertModel<typeof inventoryActivitiesTable>,
  "id" | "created_at"
>;

export async function logActivity(
  tx: PgTransaction<
    NeonHttpQueryResultHKT,
    typeof import("d:/Projects/next-js/stocking-app/src/schema"),
    ExtractTablesWithRelations<typeof import("d:/Projects/next-js/stocking-app/src/schema")>
  >,
  data: LogActivityInput
) {
  return tx.insert(inventoryActivitiesTable).values({
    ...data,
    created_at: new Date(),
  });
}
