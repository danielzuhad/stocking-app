import {
  buildUrlPaginationQuery,
  parseUrlPagination,
} from '@/hooks/use-data-table-url-pagination';
import { TABLE_PAGE_SIZE_OPTIONS } from '@/lib/table/constants';

const TEST_URL_STATE_KEY = 'dt_any_service';

function key(name: 'page' | 'pageSize'): string {
  return `${TEST_URL_STATE_KEY}_${name}`;
}

const baseOptions = {
  urlStateKey: TEST_URL_STATE_KEY,
  defaultPageIndex: 0,
  defaultPageSize: 10,
  pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
};

describe('data table url pagination helpers', () => {
  it('parses defaults when query params are absent', () => {
    const parsed = parseUrlPagination(new URLSearchParams(''), baseOptions);

    expect(parsed).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it('parses valid pagination params from query', () => {
    const parsed = parseUrlPagination(
      new URLSearchParams(`${key('page')}=3&${key('pageSize')}=20`),
      baseOptions,
    );

    expect(parsed).toEqual({
      pageIndex: 2,
      pageSize: 20,
    });
  });

  it('falls back to defaults for invalid page/pageSize', () => {
    const parsed = parseUrlPagination(
      new URLSearchParams(`${key('page')}=-1&${key('pageSize')}=999`),
      baseOptions,
    );

    expect(parsed).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it('omits default values from query builder', () => {
    const query = buildUrlPaginationQuery({
      currentQuery: 'foo=bar',
      pagination: { pageIndex: 0, pageSize: 10 },
      options: baseOptions,
    });

    expect(query).toBe('foo=bar');
  });

  it('writes non-default values and preserves unrelated params', () => {
    const query = buildUrlPaginationQuery({
      currentQuery: 'foo=bar',
      pagination: { pageIndex: 2, pageSize: 20 },
      options: baseOptions,
    });
    const params = new URLSearchParams(query);

    expect(params.get('foo')).toBe('bar');
    expect(params.get(key('page'))).toBe('3');
    expect(params.get(key('pageSize'))).toBe('20');
  });
});
