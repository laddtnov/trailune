import type { PackingCategory, PackingTemplateId } from './types';
import { generateId } from './utils/id';
import { listTemplateItems, savePackingItem } from './storage/checklist';

export const PACKING_TEMPLATES: { id: PackingTemplateId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'beach', label: 'Beach Holiday' },
  { id: 'business', label: 'Business Trip' },
  { id: 'camping', label: 'Camping' },
  { id: 'winter', label: 'Winter' }
];

type SeedItem = { category: PackingCategory; label: string };

export const PACKING_TEMPLATE_SEEDS: Record<Exclude<PackingTemplateId, 'general'>, SeedItem[]> = {
  beach: [
    { category: 'Documents', label: 'Travel insurance' },
    { category: 'Electronics', label: 'Waterproof phone case' },
    { category: 'Clothing', label: 'Swimsuit' },
    { category: 'Clothing', label: 'Flip-flops' },
    { category: 'Clothing', label: 'Sun hat' },
    { category: 'Toiletries', label: 'Sunscreen' },
    { category: 'Toiletries', label: 'Aloe vera gel' },
    { category: 'Other', label: 'Beach towel' },
    { category: 'Other', label: 'Sunglasses' }
  ],
  business: [
    { category: 'Documents', label: 'Business cards' },
    { category: 'Electronics', label: 'Laptop' },
    { category: 'Electronics', label: 'Laptop charger' },
    { category: 'Electronics', label: 'Phone charger' },
    { category: 'Clothing', label: 'Blazer' },
    { category: 'Clothing', label: 'Dress shoes' },
    { category: 'Toiletries', label: 'Travel toiletry kit' },
    { category: 'Other', label: 'Notebook and pen' }
  ],
  camping: [
    { category: 'Documents', label: 'ID card' },
    { category: 'Electronics', label: 'Headlamp' },
    { category: 'Electronics', label: 'Power bank' },
    { category: 'Clothing', label: 'Hiking boots' },
    { category: 'Clothing', label: 'Rain jacket' },
    { category: 'Toiletries', label: 'Biodegradable soap' },
    { category: 'Other', label: 'Sleeping bag' },
    { category: 'Other', label: 'Tent' },
    { category: 'Other', label: 'Multi-tool' }
  ],
  winter: [
    { category: 'Documents', label: 'Passport' },
    { category: 'Electronics', label: 'Phone charger' },
    { category: 'Clothing', label: 'Thermal layers' },
    { category: 'Clothing', label: 'Winter coat' },
    { category: 'Clothing', label: 'Gloves' },
    { category: 'Clothing', label: 'Wool socks' },
    { category: 'Toiletries', label: 'Lip balm' },
    { category: 'Toiletries', label: 'Moisturizer' },
    { category: 'Other', label: 'Hand warmers' }
  ]
};

const SEEDED_KEY_PREFIX = 'trailune:packingTemplateSeeded:';

export function seedTemplateIfEmpty(templateId: PackingTemplateId): void {
  if (templateId === 'general') return;
  const seededKey = `${SEEDED_KEY_PREFIX}${templateId}`;
  if (localStorage.getItem(seededKey) === 'true') return;
  if (listTemplateItems(templateId).length === 0) {
    for (const seed of PACKING_TEMPLATE_SEEDS[templateId]) {
      savePackingItem({
        id: generateId(),
        tripId: null,
        templateId,
        category: seed.category,
        label: seed.label,
        checked: false
      });
    }
  }
  localStorage.setItem(seededKey, 'true');
}
