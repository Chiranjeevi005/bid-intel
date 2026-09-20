import { createClient } from '@/lib/supabase/server';
import SubscriptionView from '@/components/billing/SubscriptionView';

export const metadata = {
  title: 'Plans & Pricing | RFPground',
  description: 'Select a subscription plan for RFPground automated tender analysis.',
};

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <SubscriptionView initialUser={user} />;
}
