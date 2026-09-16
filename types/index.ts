export type CategoryId =
  | 'papas'
  | 'boneless'
  | 'combos'
  | 'tortas'
  | 'peques'
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

export interface ProductExtra {
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
  extras?: ProductExtra[];
  removals?: OptionChoice[];
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
  extras?: ProductExtra[];
  removals?: string[];
  specialInstructions?: string;
}

export type OrderStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'preparing'
  | 'in_transit'
  | 'delivered'
  | 'delivered_unclaimed'
  | 'cancelled';

export type FulfillmentMode = 'delivery' | 'pickup';
export type DeliveryProvider = 'pickup' | 'self' | 'uber' | 'wait_self';
export type KitchenTicketLabel = 'CASA' | 'ESPERA' | 'UBER' | 'RECOGER';

export interface OrderCustomer {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  phoneAlt?: string;
  email: string;
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
  fulfillment: FulfillmentMode;
  pickupAt?: string | null;
  cardFunding?: string | null;
  shortCode?: string | null;
  pickupPin?: string | null;
  provider?: DeliveryProvider;
  cookHold?: boolean;
  leaveAtDoor?: boolean;
  dispatchStatus?: string | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
  phoneAlt?: string | null;
  kitchenLabel?: KitchenTicketLabel;
  etaMinutes?: number | null;
  gatedCommunity?: boolean;
}
