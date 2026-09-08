import type { MenuItem, Category, ComboUpgrade, OptionChoice, ProductExtra } from '@/types';

export const CATEGORIES: Category[] = [
  { id: 'combos', name: 'Hamburguesas', icon: 'Beef' },
  { id: 'tortas', name: 'Tortas', icon: 'Beef' },
  { id: 'papas', name: 'Papas Vaqueras', icon: 'Flame' },
  { id: 'boneless', name: 'Boneless', icon: 'Drumstick' },
  { id: 'peques', name: 'Para los peques', icon: 'Drumstick' },
  { id: 'bebidas', name: 'Bebidas', icon: 'CupSoda' },
];

const PAPAS_INGREDIENTS: OptionChoice[] = [
  { id: 'tocino', name: 'Tocino' },
  { id: 'salchicha', name: 'Salchicha para asar' },
  { id: 'fajitas-res', name: 'Fajitas de res' },
  { id: 'boneless', name: 'Boneless (elige la salsa)' },
];

const BONELESS_SAUCES: OptionChoice[] = [
  { id: 's-bufalo-chiltepin', name: 'Búfalo Chiltepín' },
  { id: 's-mango-habanero', name: 'Mango Habanero' },
  { id: 's-bufalo', name: 'Búfalo' },
  { id: 's-fresa-spicy', name: 'Fresa Spicy' },
  { id: 's-zarzamora-spicy', name: 'Zarzamora Spicy' },
  { id: 's-chipotle', name: 'Chipotle' },
  { id: 's-tamarindo', name: 'Tamarindo' },
  { id: 's-lemon-pepper', name: 'Lemon Pepper' },
  { id: 's-bbq', name: 'BBQ' },
];

const COMBO_UPGRADES: ComboUpgrade[] = [
  {
    id: 'combo-1',
    name: 'Combo Chico: Papas chicas + bebida chica (400 ml)',
    price_base: 40,
  },
  {
    id: 'combo-2',
    name: 'Combo Grande: Papas medianas con queso + bebida grande (600 ml)',
    price_base: 55,
  },
];

/** Fajita y Torta Vaquera: combo grande $189 en carta. */
const COMBO_UPGRADES_189: ComboUpgrade[] = [
  { ...COMBO_UPGRADES[0] },
  { ...COMBO_UPGRADES[1], price_base: 50 },
];

/** Boneless medianos: combo $184 / $199 en carta. */
const COMBO_UPGRADES_BONELESS_MED: ComboUpgrade[] = [
  { ...COMBO_UPGRADES[0], price_base: 41 },
  { ...COMBO_UPGRADES[1], price_base: 56 },
];

const PRODUCT_EXTRAS: ProductExtra[] = [
  { id: 'extra-pina', name: 'Piña', price_base: 19 },
  { id: 'extra-carne-hamburguesa', name: 'Carne de hamburguesa', price_base: 29 },
  { id: 'extra-fajitas', name: 'Fajitas de res', price_base: 29 },
  { id: 'extra-tocino', name: 'Tocino', price_base: 29 },
  { id: 'extra-salchicha', name: 'Salchicha para asar', price_base: 29 },
];

const PRODUCT_REMOVALS: OptionChoice[] = [
  { id: 'sin-cebolla', name: 'Cebolla' },
  { id: 'sin-jitomate', name: 'Jitomate' },
  { id: 'sin-lechuga', name: 'Lechuga' },
  { id: 'sin-mayonesa', name: 'Mayonesa' },
  { id: 'sin-catsup', name: 'Catsup' },
  { id: 'sin-mostaza', name: 'Mostaza' },
  { id: 'sin-pepinillos', name: 'Pepinillos' },
  { id: 'sin-queso', name: 'Queso' },
];

const BURGER_TORTA_OPTIONS = {
  extras: PRODUCT_EXTRAS,
  removals: PRODUCT_REMOVALS,
  comboUpgrades: COMBO_UPGRADES,
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'hamburguesa-tradicional',
    name: 'Hamburguesa Tradicional con Queso',
    description: 'Clásica hamburguesa con queso derretido.',
    category: 'combos',
    price_base: 99,
    image: '/menu/hamburguesa-tradicional.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-aguacatosa',
    name: 'Hamburguesa Aguacatosa',
    description: 'Hamburguesa con aguacate fresco y toppings especiales.',
    category: 'combos',
    price_base: 114,
    image: '/menu/hamburguesa-aguacatosa.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-tocino',
    name: 'Hamburguesa Tocino',
    description: 'Hamburguesa con tocino crujiente y queso.',
    category: 'combos',
    price_base: 129,
    image: '/menu/hamburguesa-tocino.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-campestre',
    name: 'Hamburguesa Campestre',
    description: 'Hamburguesa estilo campestre con ingredientes rústicos.',
    category: 'combos',
    price_base: 129,
    image: '/menu/hamburguesa-campestre.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-hawaiana',
    name: 'Hamburguesa Hawaiana',
    description: 'Hamburguesa con piña y tocino al estilo hawaiano.',
    category: 'combos',
    price_base: 129,
    image: '/menu/hamburguesa-hawaiana.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-pollo',
    name: 'Hamburguesa de Pollo Especial',
    description: 'Filete de pollo a la plancha con toppings.',
    category: 'combos',
    price_base: 129,
    image: '/menu/hamburguesa-pollo.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'hamburguesa-fajita',
    name: 'Hamburguesa Fajita Especial',
    description: 'Hamburguesa con fajita de res y vegetales.',
    category: 'combos',
    price_base: 139,
    image: '/menu/hamburguesa-fajita.jpg',
    extras: PRODUCT_EXTRAS,
    removals: PRODUCT_REMOVALS,
    comboUpgrades: COMBO_UPGRADES_189,
  },

  {
    id: 'torta-lomo',
    name: 'Torta de Lomo Especial',
    description: 'Torta de lomo especial con toppings de la casa.',
    category: 'tortas',
    price_base: 119,
    image: '/menu/torta-lomo.jpg',
    ...BURGER_TORTA_OPTIONS,
  },
  {
    id: 'torta-vaquera',
    name: 'Torta Vaquera',
    description: 'Torta estilo vaquera con ingredientes especiales.',
    category: 'tortas',
    price_base: 139,
    image: '/menu/torta-vaquera.jpg',
    extras: PRODUCT_EXTRAS,
    removals: PRODUCT_REMOVALS,
    comboUpgrades: COMBO_UPGRADES_189,
  },

  {
    id: 'papas-medianas',
    name: 'Papas Medianas Individuales',
    description: 'Papas individuales. Elige 1 o 2 ingredientes.',
    category: 'papas',
    price_base: 129,
    image: '/menu/papas-medianas.jpg',
    serves: '1 persona',
    optionGroups: [
      {
        id: 'papas-med-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 2,
        choices: PAPAS_INGREDIENTS,
      },
      {
        id: 'papas-med-boneless-salsa',
        label: 'Salsa de boneless (si elegiste Boneless)',
        min: 0,
        max: 1,
        choices: BONELESS_SAUCES,
      },
    ],
  },
  {
    id: 'papas-grandes',
    name: 'Papas Grandes',
    description: 'Porción para 2 personas. Elige 1 a 3 ingredientes.',
    category: 'papas',
    price_base: 229,
    image: '/menu/papas-grandes.jpg',
    serves: '2 personas',
    optionGroups: [
      {
        id: 'papas-grd-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 3,
        choices: PAPAS_INGREDIENTS,
      },
      {
        id: 'papas-grd-boneless-salsa',
        label: 'Salsa de boneless (si elegiste Boneless)',
        min: 0,
        max: 1,
        choices: BONELESS_SAUCES,
      },
    ],
  },
  {
    id: 'papas-jumbo',
    name: 'Papas Jumbo',
    description: 'Porción para 3 personas. Elige 1 a 4 ingredientes.',
    category: 'papas',
    price_base: 289,
    image: '/menu/papas-jumbo.jpg',
    serves: '3 personas',
    optionGroups: [
      {
        id: 'papas-jmb-ingredients',
        label: 'Elige tus ingredientes',
        min: 1,
        max: 4,
        choices: PAPAS_INGREDIENTS,
      },
      {
        id: 'papas-jmb-boneless-salsa',
        label: 'Salsa de boneless (si elegiste Boneless)',
        min: 0,
        max: 1,
        choices: BONELESS_SAUCES,
      },
    ],
  },

  {
    id: 'boneless-chicos',
    name: 'Boneless Chicos',
    description: 'Más de 350g de boneless crujientes. Elige tu salsa.',
    category: 'boneless',
    price_base: 119,
    image: '/menu/boneless-chicos.jpg',
    serves: '1 persona',
    optionGroups: [
      {
        id: 'boneless-ch-sauces',
        label: 'Elige tu salsa',
        min: 1,
        max: 1,
        choices: BONELESS_SAUCES,
      },
    ],
    comboUpgrades: COMBO_UPGRADES,
  },
  {
    id: 'boneless-medianos',
    name: 'Boneless Medianos',
    description: 'Más de 450g de boneless crujientes. Elige 1-2 salsas.',
    category: 'boneless',
    price_base: 143,
    image: '/menu/boneless-medianos.jpg',
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
    comboUpgrades: COMBO_UPGRADES_BONELESS_MED,
  },
  {
    id: 'boneless-grandes',
    name: 'Boneless Grandes',
    description: 'Más de 700g de boneless crujientes. Elige 1-3 salsas.',
    category: 'boneless',
    price_base: 239,
    image: '/menu/boneless-grandes.jpg',
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
  },
  {
    id: 'boneless-jumbo',
    name: 'Boneless Jumbo',
    description: 'Más de 1kg de boneless crujientes. Elige 1-4 salsas.',
    category: 'boneless',
    price_base: 319,
    image: '/menu/boneless-jumbo.jpg',
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
  },

  {
    id: 'hamburguesita',
    name: 'Hamburguesita',
    description: 'Carne, queso, mayo, catsup, papas francesas, juguito y galleta.',
    category: 'peques',
    price_base: 109,
    image: 'https://images.pexels.com/photos/11812583/pexels-photo-11812583.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    serves: '1 niño',
  },
  {
    id: 'combo-pechuguitas',
    name: 'Pechuguitas de Pollo',
    description: '170g de pechuguitas empanizadas, papas francesas, juguito y galleta.',
    category: 'peques',
    price_base: 109,
    image: '/menu/combo-pechuguitas.jpg',
    serves: '1 niño',
  },

  {
    id: 'refresco-grande',
    name: 'Refresco 600ml',
    description: 'Refresco de 600ml. Selecciona tu sabor al confirmar.',
    category: 'bebidas',
    price_base: 39,
    image: '/menu/refrescos.jpg',
  },
  {
    id: 'agua-fresca-500',
    name: 'Agua Fresca 500ml',
    description: 'Agua fresca de 500ml. Selecciona el sabor al confirmar.',
    category: 'bebidas',
    price_base: 34,
    image: '',
  },
  {
    id: 'refresco-chico',
    name: 'Refresco 400ml',
    description: 'Refresco de 400ml. Selecciona tu sabor al confirmar.',
    category: 'bebidas',
    price_base: 34,
    image: '',
  },
  {
    id: 'refresco-250',
    name: 'Refresco 250ml',
    description: 'Refresco de 250ml. Selecciona tu sabor al confirmar.',
    category: 'bebidas',
    price_base: 24,
    image: '',
  },
];

export function getMenuItemsByCategory(categoryId: string): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === categoryId);
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id);
}
