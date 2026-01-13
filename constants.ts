
import { ClientStatus, ConnectionType, BillingPlan, Client, Payment, RouterNode, RouterStatus } from './types';

// Real-world ISP defaults would usually be empty on first run
// These will be populated via the "Packages" manager in the UI
export const BILLING_PLANS: BillingPlan[] = [];

export const MOCK_CLIENTS: Client[] = [];
export const MOCK_PAYMENTS: Payment[] = [];
export const MOCK_ROUTERS: RouterNode[] = [];

// Growth data initialized to zero for a clean start
export const REVENUE_DATA = [
  { month: 'Jan', revenue: 0, users: 0 },
  { month: 'Feb', revenue: 0, users: 0 },
  { month: 'Mar', revenue: 0, users: 0 },
  { month: 'Apr', revenue: 0, users: 0 },
  { month: 'May', revenue: 0, users: 0 },
  { month: 'Jun', revenue: 0, users: 0 },
];
