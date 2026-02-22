import {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_OPTIONS,
  RECEIVING_STATUS_POSTED,
  RECEIVING_STATUS_VOID,
  STOCK_MOVEMENT_ADJUST,
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
  STOCK_MOVEMENT_REFERENCE_ADJUSTMENT,
  STOCK_MOVEMENT_REFERENCE_OPNAME,
  STOCK_MOVEMENT_REFERENCE_OPTIONS,
  STOCK_MOVEMENT_REFERENCE_RECEIVING,
  STOCK_MOVEMENT_TYPE_OPTIONS,
  STOCK_OPNAME_STATUS_FINALIZED,
  STOCK_OPNAME_STATUS_IN_PROGRESS,
  STOCK_OPNAME_STATUS_OPTIONS,
  STOCK_OPNAME_STATUS_VOID,
  type ReceivingStatusType,
  type StockMovementReferenceType,
  type StockMovementTypeType,
  type StockOpnameStatusType,
} from '@/db/schema/inventory-enums';

/** Shared inventory enum values sourced from Drizzle enum declarations. */
export const INVENTORY_ENUM_VALUES = {
  stock_movement_type: STOCK_MOVEMENT_TYPE_OPTIONS,
  stock_movement_reference: STOCK_MOVEMENT_REFERENCE_OPTIONS,
  receiving_status: RECEIVING_STATUS_OPTIONS,
  stock_opname_status: STOCK_OPNAME_STATUS_OPTIONS,
} as const;

export type {
  ReceivingStatusType,
  StockMovementReferenceType,
  StockMovementTypeType,
  StockOpnameStatusType,
};

/** User-friendly labels for receiving status enum values. */
export const RECEIVING_STATUS_LABELS: Record<ReceivingStatusType, string> = {
  DRAFT: 'Draf',
  POSTED: 'Diposting',
  VOID: 'Dibatalkan',
};

/** User-friendly labels for stock opname status enum values. */
export const STOCK_OPNAME_STATUS_LABELS: Record<StockOpnameStatusType, string> =
  {
    IN_PROGRESS: 'Sedang Berjalan',
    FINALIZED: 'Selesai',
    VOID: 'Dibatalkan',
  };

/** User-friendly labels for stock movement type enum values. */
export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementTypeType, string> =
  {
    IN: 'Masuk',
    OUT: 'Keluar',
    ADJUST: 'Penyesuaian',
  };

export {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_OPTIONS,
  RECEIVING_STATUS_POSTED,
  RECEIVING_STATUS_VOID,
  STOCK_MOVEMENT_ADJUST,
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
  STOCK_MOVEMENT_REFERENCE_ADJUSTMENT,
  STOCK_MOVEMENT_REFERENCE_OPNAME,
  STOCK_MOVEMENT_REFERENCE_OPTIONS,
  STOCK_MOVEMENT_REFERENCE_RECEIVING,
  STOCK_MOVEMENT_TYPE_OPTIONS,
  STOCK_OPNAME_STATUS_FINALIZED,
  STOCK_OPNAME_STATUS_IN_PROGRESS,
  STOCK_OPNAME_STATUS_OPTIONS,
  STOCK_OPNAME_STATUS_VOID,
};
