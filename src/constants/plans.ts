export const PLANS = {
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    price: 0,
    currency: 'INR'
  },
  PRO: {
    id: 'PRO',
    name: 'Pro Professional',
    price: 999,
    currency: 'INR'
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 2499,
    currency: 'INR'
  }
};

export type PlanId = keyof typeof PLANS;
