export type InvestmentPlan = {
  id: string;
  name: string;
  description: string;
  dailyReturn: number;
  duration: number; // in days
  minDeposit: number;
  maxDeposit: number;
  isPopular?: boolean;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  registrationDate: string; // ISO string
  balance: number;
  lastProfitClaim?: number | object; // Unix timestamp or ServerValue
  referrerId?: string;
  investments?: { [key: string]: Investment };
}

export type Investment = {
    id: string;
    investmentPlanId: string;
    amount: number;
    startDate: string; // ISO string
    endDate: string; // ISO string
    status: 'active' | 'completed' | 'cancelled';
}

export type Transaction = {
  id: string;
  type: 'Deposit' | 'Withdrawal' | 'Profit' | 'Referral Bonus' | 'Investment' | 'BalanceAdjustment';
  amount: number;
  transactionDate: string; // ISO String
  status: 'Completed' | 'Pending' | 'Failed';
  paymentGateway?: string;
  userProfileId: string; // Required for all transactions
  investmentId?: string;
  depositProof?: string; // Data URI of the uploaded image
  withdrawAddress?: string; // For withdrawal
  notes?: string; // For admin adjustments
};

export type Referral = {
    id: string;
    referrerId: string;
    referredId: string;
    referredUsername: string;
    referralDate: string; // ISO String
    bonusAmount: number;
}
