export type CategoryId =
  | 'papas'
  | 'boneless'
  | 'combos'
  | 'tortas'
  | 'peques'
  | 'extras'
  | 'bebidas';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
}

export interface OptionChoice {
  id: string;
  name: string;
}

export interface OptionGroup {
  id: string;
  label: string;
  min: number;
  max: number;
  choices: OptionChoice[];
}

export interface ComboUpgrade {
  id: string;
  name: string;
  price_base: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  price_base: number;
  image: string;
  optionGroups?: OptionGroup[];
  comboUpgrades?: ComboUpgrade[];
  serves?: string;
}

export interface CartItemSelection {
  optionGroupId: string;
  optionGroupId_label: string;
  choices: string[];
}

export interface CartItem {
  uid: string;
  menuItemId: string;
  name: string;
  image: string;
  price_base: number;
  quantity: number;
  selections: CartItemSelection[];
  comboUpgrade?: ComboUpgrade;
  specialInstructions?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled';

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  references: string;
}

export type PaymentMethod = 'apple_pay' | 'google_pay' | 'card';

export interface Order {
  id: string;
  stripePaymentIntentId?: string;
  items: CartItem[];
  customer: OrderCustomer;
  paymentMethod: PaymentMethod;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  restaurantPayout?: number;
  platformFee?: number;
  status: OrderStatus;
  createdAt: string;
  estimatedMinutes: number;
}
