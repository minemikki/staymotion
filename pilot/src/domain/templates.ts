import type { BusinessType, RoutineTemplate } from './types';

/**
 * Starter routines for a hospitality pilot. Operational starters only —
 * these are NOT a legal/IK-mat/HMS certification and the UI must not claim so.
 */
export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  { key: 'open_routine', title: 'Åpningsrutine', description: 'Lys, kasse, kaffe, bord og hygienesjekk før første gjest.', cadence: 'daily_open', department: 'Kjøkken', estimatedMinutes: 10, category: 'routine', defaultOn: true },
  { key: 'temp_check', title: 'Sjekk kjøletemperatur', description: 'Les av kjøl og frys. Avvik registreres automatisk som sak.', cadence: 'daily_open', department: 'Kjøkken', estimatedMinutes: 2, category: 'temperature', defaultOn: true },
  { key: 'allergen_check', title: 'Kontroller allergenlisten', description: 'Stemmer allergenlisten med dagens meny?', cadence: 'daily_open', department: 'Kjøkken', estimatedMinutes: 1, category: 'routine', defaultOn: true },
  { key: 'hygiene_round', title: 'Renholdsrunde', description: 'Overflater, gulv, toaletter og søppel.', cadence: 'daily', department: 'Sal', estimatedMinutes: 8, category: 'hygiene', defaultOn: true },
  { key: 'delivery_check', title: 'Kontroller leveranse', description: 'Sammenlign pakkseddel med det som kom. Avvik blir en leveransesak.', cadence: 'on_demand', department: 'Kjøkken', estimatedMinutes: 4, category: 'supply', defaultOn: true },
  { key: 'equipment_report', title: 'Meld utstyr / vedlikehold', description: 'Fortell StayMotion når noe lekker, står stille eller er ødelagt.', cadence: 'on_demand', department: 'Kjøkken', estimatedMinutes: 1, category: 'maintenance', defaultOn: true },
  { key: 'close_routine', title: 'Stengerutine', description: 'Kjøl lukket, avtrekk av, søppel ut, kasse tatt og dører låst.', cadence: 'daily_close', department: 'Kjøkken', estimatedMinutes: 10, category: 'routine', defaultOn: true },
  { key: 'bar_stock', title: 'Tell barlager', description: 'Rask opptelling av det som går fortest.', cadence: 'weekly', department: 'Bar', estimatedMinutes: 6, category: 'supply', defaultOn: false },
];

export const DEFAULT_DEPARTMENTS: Record<BusinessType, string[]> = {
  restaurant: ['Kjøkken', 'Sal', 'Bar'],
  cafe: ['Disk', 'Kjøkken', 'Sal'],
  bar: ['Bar', 'Sal', 'Lager'],
  hotel: ['Resepsjon', 'Housekeeping', 'Kjøkken', 'Restaurant'],
};

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', hotel: 'Hotell',
};
