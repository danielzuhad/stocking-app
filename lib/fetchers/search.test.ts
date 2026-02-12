import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import { createIlikeSearch } from './search';

const dialect = new PgDialect();

const search = createIlikeSearch({
  fields: {
    action: sql`action`,
    actor_username: sql`actor_username`,
    company_name: sql`company_name`,
  },
  defaultFields: ['action', 'actor_username'],
});

describe('createIlikeSearch', () => {
  it('uses default fields when selected fields are empty', () => {
    const resolved = search.resolveFields([]);
    expect(resolved).toEqual(['action', 'actor_username']);
  });

  it('keeps explicitly selected fields', () => {
    const resolved = search.resolveFields(['company_name']);
    expect(resolved).toEqual(['company_name']);
  });

  it('returns undefined where clause for empty/blank query', () => {
    expect(search.buildWhere(undefined)).toBeUndefined();
    expect(search.buildWhere('   ')).toBeUndefined();
  });

  it('builds single-field ILIKE where clause', () => {
    const where = search.buildWhere('audit', ['action']);
    expect(where).toBeDefined();

    const query = dialect.sqlToQuery(where!);
    expect(query.params).toEqual(['%audit%']);
    expect(query.sql).not.toContain(' OR ');
  });

  it('builds multi-field ILIKE where clause with OR', () => {
    const where = search.buildWhere('audit');
    expect(where).toBeDefined();

    const query = dialect.sqlToQuery(where!);
    expect(query.params).toEqual(['%audit%', '%audit%']);
    expect(query.sql).toContain(' OR ');
  });

  it('trims input query before building ILIKE params', () => {
    const where = search.buildWhere('  audit  ', ['company_name']);
    expect(where).toBeDefined();

    const query = dialect.sqlToQuery(where!);
    expect(query.params).toEqual(['%audit%']);
  });
});
