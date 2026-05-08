// ─── aiCategorizer.js — test suite ───────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import {
  tokenize, trainOnTransaction, rebuildModel,
  predictCategory, suggestCategories, modelStats, clearModel, loadModel,
} from '../lib/aiCategorizer.js';

beforeEach(() => clearModel());

// ── tokenize ──────────────────────────────────────────────────────────────────
describe('tokenize', () => {
  it('lowercases and splits', () => {
    expect(tokenize('Kaufland Zagreb')).toContain('kaufland');
    expect(tokenize('Kaufland Zagreb')).toContain('zagreb');
  });
  it('removes stop words', () => {
    expect(tokenize('za i u na')).toEqual([]);
  });
  it('removes short tokens (< 3 chars)', () => {
    expect(tokenize('ab cd ef')).toEqual([]);
  });
  it('removes standalone numbers', () => {
    expect(tokenize('HEP 123.45 račun')).not.toContain('123.45');
    expect(tokenize('HEP 123.45 račun')).toContain('račun');
  });
  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

// ── trainOnTransaction ────────────────────────────────────────────────────────
describe('trainOnTransaction', () => {
  it('increments totalDocs for category', () => {
    const tx = { type: 'Isplata', description: 'Kaufland', category: 'Hrana' };
    let model = loadModel();
    model = trainOnTransaction(tx, model);
    expect(model.totalDocs['Hrana']).toBe(1);
  });

  it('ignores income transactions', () => {
    const tx = { type: 'Primitak', description: 'Plaća', category: 'Plaća' };
    let model = loadModel();
    model = trainOnTransaction(tx, model);
    expect(Object.keys(model.totalDocs).length).toBe(0);
  });

  it('accumulates multiple transactions', () => {
    const txs = [
      { type: 'Isplata', description: 'Kaufland', category: 'Hrana' },
      { type: 'Isplata', description: 'Spar namirnice', category: 'Hrana' },
      { type: 'Isplata', description: 'Shell benzin', category: 'Auto' },
    ];
    let model = loadModel();
    txs.forEach(tx => { model = trainOnTransaction(tx, model); });
    expect(model.totalDocs['Hrana']).toBe(2);
    expect(model.totalDocs['Auto']).toBe(1);
  });
});

// ── predictCategory ───────────────────────────────────────────────────────────
describe('predictCategory', () => {
  it('returns null category with no model', () => {
    const result = predictCategory('Kaufland');
    expect(result.category).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('predicts correct category after training', () => {
    // Train on 10 Kaufland → Hrana examples
    let model = loadModel();
    for (let i = 0; i < 10; i++) {
      model = trainOnTransaction({ type: 'Isplata', description: `Kaufland ${i}`, category: 'Hrana' }, model);
    }
    const result = predictCategory('Kaufland', model);
    expect(result.category).toBe('Hrana');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('distinguishes between categories', () => {
    let model = loadModel();
    const data = [
      ...Array(8).fill(null).map(() => ({ type: 'Isplata', description: 'Kaufland namirnice', category: 'Hrana' })),
      ...Array(8).fill(null).map(() => ({ type: 'Isplata', description: 'Shell benzinska', category: 'Auto' })),
    ];
    data.forEach(tx => { model = trainOnTransaction(tx, model); });

    const hranaResult = predictCategory('Kaufland', model);
    const autoResult  = predictCategory('Shell benzin', model);

    expect(hranaResult.category).toBe('Hrana');
    expect(autoResult.category).toBe('Auto');
  });

  it('confidence is between 0 and 1', () => {
    let model = loadModel();
    model = trainOnTransaction({ type: 'Isplata', description: 'Test', category: 'Hrana' }, model);
    const result = predictCategory('Test', model);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('returns allScores array', () => {
    let model = loadModel();
    const cats = ['Hrana', 'Auto', 'Zabava'];
    cats.forEach((cat, i) => {
      model = trainOnTransaction({ type: 'Isplata', description: `Test ${i}`, category: cat }, model);
    });
    const result = predictCategory('Test', model);
    expect(Array.isArray(result.allScores)).toBe(true);
  });
});

// ── rebuildModel ──────────────────────────────────────────────────────────────
describe('rebuildModel', () => {
  it('builds model from transaction array', () => {
    const txs = [
      { type: 'Isplata', description: 'Konzum', category: 'Hrana' },
      { type: 'Isplata', description: 'HEP', category: 'Režije' },
      { type: 'Primitak', description: 'Plaća', category: 'Plaća' }, // should be ignored
    ];
    const model = rebuildModel(txs);
    expect(model.totalDocs['Hrana']).toBe(1);
    expect(model.totalDocs['Režije']).toBe(1);
    expect(model.totalDocs['Plaća']).toBeUndefined();
  });
});

// ── modelStats ────────────────────────────────────────────────────────────────
describe('modelStats', () => {
  it('returns correct totalDocs count', () => {
    const txs = Array(5).fill(null).map((_, i) => ({
      type: 'Isplata', description: `tx ${i}`, category: 'Hrana',
    }));
    const model = rebuildModel(txs);
    const stats = modelStats(model);
    expect(stats.totalDocs).toBe(5);
    expect(stats.categories).toBe(1);
    expect(stats.tokens).toBeGreaterThan(0);
  });
});
