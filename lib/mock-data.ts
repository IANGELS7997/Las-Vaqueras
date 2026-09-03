import type { MenuItem, Category } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'papas', name: 'Papas Vaqueras', icon: 'Flame' },
  { id: 'boneless', name: 'Boneless', icon: 'Drumstick' },
  { id: 'combos', name: 'Burgers y Tortas', icon: 'Beef' },
  { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda' },
];

const PAPAS_INGREDIENTS = [
  { id: 'bufalo-chiltepin', name: 'Boneless Búfalo Chiltepín' },
  { id: 'mango-habanero', name: 'Mango Habanero' },
  { id: 'salchicha', name: 'Salchicha para asar' },
  { id: 'fresa-spicy', name: 'Fresa Spicy' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'tocino', name: 'Tocino' },
  { id: 'lemon-pepper', name: 'Lemon Pepper' },
  { id: 'zarzamora-spicy', name: 'Zarzamora Spicy' },
  { id: 'fajitas-res', name: 'Fajitas de res' },
  { id: 'naturales', name: 'Naturales' },
  { id: 'bufalo', name: 'Búfalo' },
  { id: 'chipotle', name: 'Chipotle' },
];

const BONELESS_SAUCES = [
  { id: 's-bufalo-chiltepin', name: 'Búfalo Chiltepín' },
  { id: 's-mango-habanero', name: 'Mango Habanero' },
  { id: 's-fresa-spicy', name: 'Fresa Spicy' },
  { id: 's-bbq', name: 'BBQ' },
  { id: 's-lemon-pepper', name: 'Lemon Pepper' },
  { id: 's-zarzamora-spicy', name: 'Zarzamora Spicy' },
  { id: 's-naturales', name: 'Naturales' },
  { id: 's-bufalo', name: 'Búfalo' },
  { id: 's-chipotle', name: 'Chipotle' },
];

const COMBO_UPGRADES = [
  { id: 'combo-1', name: 'Combo 1: Papas + Refresco (400 ml)', price_base: 49 },
  { id: 'combo-2', name: 'Combo 2: Papas con queso + Refresco (600 ml)', price_base: 69 },
];

export const MENU_ITEMS: MenuItem[] = [
  // PAPAS VAQUERAS
  {
    id: 'papas-medianas',
    name: 'Papas Vaqueras Medianas',
    description: 'Deliciosas papas con tus ingredientes favoritos. Elige 1-2 ingredientes.',
    category: 'papas',
    price_base: 159,
    image: 'https://images.pexels.com/photos/20535803/pexels-photo-20535803.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '1 persona',
    optionGroups: [
      {
        id: 'papas-med-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 2,
        choices: PAPAS_INGREDIENTS,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'papas-grandes',
    name: 'Papas Vaqueras Grandes',
    description: 'Porción generosa para compartir. Elige 1-3 ingredientes.',
    category: 'papas',
    price_base: 259,
    image: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '2 personas',
    optionGroups: [
      {
        id: 'papas-grd-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 3,
        choices: PAPAS_INGREDIENTS,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'papas-jumbo',
    name: 'Papas Vaqueras Jumbo',
    description: 'Nuestra porción más grande para toda la familia. Elige 1-4 ingredientes.',
    category: 'papas',
    price_base: 329,
    image: 'https://images.pexels.com/photos/7961933/pexels-photo-7961933.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '3 personas',
    optionGroups: [
      {
        id: 'papas-jmb-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 4,
        choices: PAPAS_INGREDIENTS,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },

  // BONELESS
  {
    id: 'boneless-chicos',
    name: 'Boneless Chicos',
    description: 'Pequeña porción de boneless crujientes. Sin selección de salsa.',
    category: 'boneless',
    price_base: 149,
    image: 'https://images.pexels.com/photos/11710530/pexels-photo-11710530.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '1 persona',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'boneless-medianos',
    name: 'Boneless Medianos (+450g)',
    description: '450g de boneless crujientes. Elige 1-2 salsas.',
    category: 'boneless',
    price_base: 169,
    image: 'https://images.pexels.com/photos/31300944/pexels-photo-31300944.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '1-2 personas',
    optionGroups: [
      {
        id: 'boneless-med-sauces',
        label: 'Elige tus salsas',
        min: 1,
        max: 2,
        choices: BONELESS_SAUCES,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'boneless-grandes',
    name: 'Boneless Grandes (+700g)',
    description: '700g de boneless crujientes. Elige 1-3 salsas.',
    category: 'boneless',
    price_base: 279,
    image: 'https://images.pexels.com/photos/8862763/pexels-photo-8862763.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '2-3 personas',
    optionGroups: [
      {
        id: 'boneless-grd-sauces',
        label: 'Elige tus salsas',
        min: 1,
        max: 3,
        choices: BONELESS_SAUCES,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'boneless-jumbo',
    name: 'Boneless Jumbo (+1kg)',
    description: '1kg de boneless crujientes. Elige 1-4 salsas.',
    category: 'boneless',
    price_base: 379,
    image: 'https://images.pexels.com/photos/20535805/pexels-photo-20535805.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '3-4 personas',
    optionGroups: [
      {
        id: 'boneless-jmb-sauces',
        label: 'Elige tus salsas',
        min: 1,
        max: 4,
        choices: BONELESS_SAUCES,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },

  // HAMBURGUESAS, TORTAS Y COMBOS
  {
    id: 'combo-pechuguitas',
    name: 'Combo Pechuguitas (Para 1)',
    description: '170g de pechuguitas empanizadas, 1 juguito y 1 galleta.',
    category: 'combos',
    price_base: 129,
    image: 'https://images.pexels.com/photos/19247558/pexels-photo-19247558.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '1 persona',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-tradicional',
    name: 'Hamburguesa Tradicional con Queso',
    description: 'Clásica hamburguesa con queso derretido.',
    category: 'combos',
    price_base: 119,
    image: 'https://images.pexels.com/photos/11812583/pexels-photo-11812583.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-aguacatosa',
    name: 'Hamburguesa Aguacatosa',
    description: 'Hamburguesa con aguacate fresco y toppings especiales.',
    category: 'combos',
    price_base: 139,
    image: 'https://images.pexels.com/photos/38895877/pexels-photo-38895877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-tocino',
    name: 'Hamburguesa Tocino',
    description: 'Hamburguesa con tocino crujiente y queso.',
    category: 'combos',
    price_base: 159,
    image: 'https://images.pexels.com/photos/11812583/pexels-photo-11812583.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-campestre',
    name: 'Hamburguesa Campestre',
    description: 'Hamburguesa estilo campestre con ingredientes rústicos.',
    category: 'combos',
    price_base: 159,
    image: 'https://images.pexels.com/photos/38895877/pexels-photo-38895877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-hawaiana',
    name: 'Hamburguesa Hawaiana',
    description: 'Hamburguesa con piña y tocino al estilo hawaiano.',
    category: 'combos',
    price_base: 159,
    image: 'https://images.pexels.com/photos/11812583/pexels-photo-11812583.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-pollo',
    name: 'Hamburguesa de Pollo Especial',
    description: 'Filete de pollo especial a la plancha con toppings.',
    category: 'combos',
    price_base: 159,
    image: 'https://images.pexels.com/photos/19247558/pexels-photo-19247558.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'hamburguesa-fajita',
    name: 'Hamburguesa Fajita Especial',
    description: 'Hamburguesa con fajita de res especial y vegetales.',
    category: 'combos',
    price_base: 169,
    image: 'https://images.pexels.com/photos/38895877/pexels-photo-38895877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'torta-vaquera',
    name: 'Torta Vaquera',
    description: 'Torta estilo vaquera con ingredientes especiales.',
    category: 'combos',
    price_base: 169,
    image: 'https://images.pexels.com/photos/35020127/pexels-photo-35020127.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'torta-lomo',
    name: 'Torta de Lomo Especial',
    description: 'Torta de lomo especial con toppings de la casa.',
    category: 'combos',
    price_base: 144,
    image: 'https://images.pexels.com/photos/5981144/pexels-photo-5981144.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    comboUpgrades: COMBO_UPGRADES,
  },

  // BEBIDAS
  {
    id: 'refresco-grande',
    name: 'Refresco Grande (600 ml)',
    description: 'Refresco de 600ml. Selecciona tu sabor al confirmar.',
    category: 'bebidas',
    price_base: 39,
    image: 'https://images.pexels.com/photos/8879622/pexels-photo-8879622.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  {
    id: 'refresco-chico',
    name: 'Refresco Chico (355 ml)',
    description: 'Refresco de 355ml. Selecciona tu sabor al confirmar.',
    category: 'bebidas',
    price_base: 34,
    image: 'https://images.pexels.com/photos/4113653/pexels-photo-4113653.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
];

export function getMenuItemsByCategory(categoryId: string): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === categoryId);
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id);
}
