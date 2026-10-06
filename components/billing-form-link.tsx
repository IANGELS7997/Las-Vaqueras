import { BILLING_FORM_URL } from '@/lib/billing-form';

export function BillingFormLink({ className }: { className?: string }) {
  return (
    <a href={BILLING_FORM_URL} target="_blank" rel="noopener noreferrer" className={className}>
      Facturación
    </a>
  );
}
