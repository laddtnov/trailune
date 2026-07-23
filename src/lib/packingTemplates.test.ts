import { describe, it, expect, beforeEach } from 'vitest';
import { seedTemplateIfEmpty, PACKING_TEMPLATE_SEEDS } from './packingTemplates';
import { listTemplateItems, deletePackingItem } from './storage/checklist';

beforeEach(() => {
  localStorage.clear();
});

describe('seedTemplateIfEmpty', () => {
  it('seeds the correct starter items for a named template on first call', () => {
    seedTemplateIfEmpty('beach');
    const items = listTemplateItems('beach');
    expect(items).toHaveLength(PACKING_TEMPLATE_SEEDS.beach.length);
    expect(items.map((i) => i.label)).toContain('Swimsuit');
    expect(items.every((i) => i.tripId === null && i.templateId === 'beach' && !i.checked)).toBe(true);
  });

  it('does not reseed after the items are deleted', () => {
    seedTemplateIfEmpty('winter');
    const items = listTemplateItems('winter');
    for (const item of items) {
      deletePackingItem(item.id);
    }
    seedTemplateIfEmpty('winter');
    expect(listTemplateItems('winter')).toEqual([]);
  });

  it('is a no-op for general', () => {
    seedTemplateIfEmpty('general');
    expect(listTemplateItems('general')).toEqual([]);
  });
});
