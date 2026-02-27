import { render, screen } from '@testing-library/react';

import { OpnamesPanel } from './opnames-panel';

const OPNAME_ROWS = [
  {
    id: 'opname-1',
    status: 'IN_PROGRESS' as const,
    note: 'Stock count bulanan',
    started_at: '2026-02-22T10:00:00.000Z',
    finalized_at: null,
    item_count: 12,
    diff_item_count: 3,
  },
];

describe('OpnamesPanel', () => {
  it('renders opname rows in history data table', () => {
    render(<OpnamesPanel can_write stock_opnames={OPNAME_ROWS} />);

    expect(screen.getByText('Sedang Berjalan')).toBeInTheDocument();
    expect(screen.getByText('Stock count bulanan')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows writer empty description when data is empty', () => {
    render(<OpnamesPanel can_write stock_opnames={[]} />);

    expect(
      screen.getByText('Klik tombol "Mulai Stok Opname" di atas untuk memulai opname.'),
    ).toBeInTheDocument();
  });

  it('shows read-only empty description when data is empty', () => {
    render(<OpnamesPanel can_write={false} stock_opnames={[]} />);

    expect(screen.getByText('Belum ada stok opname.')).toBeInTheDocument();
  });
});
