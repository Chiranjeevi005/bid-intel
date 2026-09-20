import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isRefundConsoleAuthorized } from '@/lib/billing/auth';
import RefundConsoleView from '../../../components/billing/RefundConsoleView';

export const metadata = {
  title: 'Refund Console | RFPground Ops',
  description: 'Authorized internal operations console for controlled live-payment verification and refund lifecycle management.',
};

export default async function RefundConsolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/subscription/refunds');
  }

  if (!isRefundConsoleAuthorized(user)) {
    redirect('/subscription');
  }

  return <RefundConsoleView initialUser={user} />;
}
