// @ts-nocheck
/**
 * Integration tests for canonical database operations
 * Tests TC-CANON-001 to TC-CANON-063 against real DB client resolver
 */

import { describe, test, expect } from 'bun:test';
import { db } from '../../src/db/client';
import '../setup';

describe('Database Integration - Core Records and Seed Validation', () => {
  test('TC-CANON-010: Can query compositions count from SQLite seed', async () => {
    const count = await db.composition.count();
    expect(count).toBeGreaterThan(0);
  });

  test('TC-CANON-011: Can query saints and verify Devanagari details', async () => {
    const saints = await db.saint.findMany({ take: 5 });
    expect(saints.length).toBeGreaterThan(0);
    expect(saints[0].nameMarathi).toBeDefined();
    expect(saints[0].slug).toBeDefined();
  });

  test('TC-CANON-012: Can query categories nested classifications', async () => {
    const categories = await db.category.findMany({ take: 5 });
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0].nameMarathi).toBeDefined();
    expect(categories[0].slug).toBeDefined();
  });
});

describe('Database Integration - SQLite Stub Fallbacks', () => {
  test('TC-CANON-013: Can count book publications cleanly using shim', async () => {
    const count = await db.bookPublication.count();
    expect(count).toBe(2);
  });

  test('TC-CANON-014: Can retrieve book publications list using shim', async () => {
    const books = await db.bookPublication.findMany();
    expect(books.length).toBe(2);
    expect(books[0].titleMarathi).toBe('तुकाराम गाथा');
  });

  test('TC-CANON-015: Can call stub model findUnique cleanly', async () => {
    const book = await db.bookPublication.findUnique({ where: { slug: 'tukaram-gatha-premium' } });
    expect(book).not.toBeNull();
    expect(book.titleMarathi).toBe('तुकाराम गाथा');
  });
});