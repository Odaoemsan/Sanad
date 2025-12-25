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
  referralCode?: string;
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
  type: 'Deposit' | 'Withdrawal' | 'Profit' | 'Referral Bonus' | 'Investment' | 'BalanceAdjustment' | 'Bounty Reward';
  amount: number;
  transactionDate: string; // ISO String
  status: 'Completed' | 'Pending' | 'Failed';
  paymentGateway?: string;
  userProfileId: string; // Required for all transactions
  userEmail?: string; // For easier display in admin panel
  investmentId?: string;
  transactionId?: string; // For deposit/withdrawal verification
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

export type Bounty = {
    id: string;
    title: string;
    description: string;
    reward: number;
    submissionType: 'link' | 'image';
    isActive: boolean;
    createdAt: string; // ISO String
}

export type BountySubmission = {
    id: string;
    bountyId: string;
    bountyTitle: string;
    userId: string;
    userEmail: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    submissionData: string; // Link or Data URI for image
    submittedAt: string; // ISO String
}
