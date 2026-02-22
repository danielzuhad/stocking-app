import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Drizzle enum declarations for inventory domain.
 *
 * This module is the single source of truth for inventory enum values.
 */
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'IN',
  'OUT',
  'ADJUST',
]);

export const stockMovementReferenceEnum = pgEnum('stock_movement_reference', [
  'RECEIVING',
  'ADJUSTMENT',
  'OPNAME',
  'SALE',
  'RETURN',
]);

export const receivingStatusEnum = pgEnum('receiving_status', [
  'DRAFT',
  'POSTED',
  'VOID',
]);

export const stockOpnameStatusEnum = pgEnum('stock_opname_status', [
  'IN_PROGRESS',
  'FINALIZED',
  'VOID',
]);

/** Stock movement type options derived from Drizzle enum declaration. */
export const STOCK_MOVEMENT_TYPE_OPTIONS = stockMovementTypeEnum.enumValues;
/** Stock movement reference options derived from Drizzle enum declaration. */
export const STOCK_MOVEMENT_REFERENCE_OPTIONS =
  stockMovementReferenceEnum.enumValues;
/** Receiving status options derived from Drizzle enum declaration. */
export const RECEIVING_STATUS_OPTIONS = receivingStatusEnum.enumValues;
/** Stock opname status options derived from Drizzle enum declaration. */
export const STOCK_OPNAME_STATUS_OPTIONS = stockOpnameStatusEnum.enumValues;

export type StockMovementTypeType =
  (typeof STOCK_MOVEMENT_TYPE_OPTIONS)[number];
export type StockMovementReferenceType =
  (typeof STOCK_MOVEMENT_REFERENCE_OPTIONS)[number];
export type ReceivingStatusType = (typeof RECEIVING_STATUS_OPTIONS)[number];
export type StockOpnameStatusType =
  (typeof STOCK_OPNAME_STATUS_OPTIONS)[number];

/** Stable stock movement type constants. */
export const STOCK_MOVEMENT_IN: StockMovementTypeType = 'IN';
export const STOCK_MOVEMENT_OUT: StockMovementTypeType = 'OUT';
export const STOCK_MOVEMENT_ADJUST: StockMovementTypeType = 'ADJUST';

/** Stable stock movement reference constants. */
export const STOCK_MOVEMENT_REFERENCE_RECEIVING: StockMovementReferenceType =
  'RECEIVING';
export const STOCK_MOVEMENT_REFERENCE_ADJUSTMENT: StockMovementReferenceType =
  'ADJUSTMENT';
export const STOCK_MOVEMENT_REFERENCE_OPNAME: StockMovementReferenceType =
  'OPNAME';

/** Stable receiving status constants. */
export const RECEIVING_STATUS_DRAFT =
  'DRAFT' as const satisfies ReceivingStatusType;
export const RECEIVING_STATUS_POSTED =
  'POSTED' as const satisfies ReceivingStatusType;
export const RECEIVING_STATUS_VOID =
  'VOID' as const satisfies ReceivingStatusType;

/** Stable stock opname status constants. */
export const STOCK_OPNAME_STATUS_IN_PROGRESS: StockOpnameStatusType =
  'IN_PROGRESS';
export const STOCK_OPNAME_STATUS_FINALIZED: StockOpnameStatusType = 'FINALIZED';
export const STOCK_OPNAME_STATUS_VOID: StockOpnameStatusType = 'VOID';
