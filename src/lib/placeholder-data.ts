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
  transactionDate: number | object;
  status: 'Completed' | 'Pending' | 'Failed';
  userProfileId: string; // The UID of the user.
  username?: string; // For display in admin panel
  investmentId?: string;
  withdrawAddress?: string; // For withdrawal
  notes?: string; // For admin adjustments
  transactionId?: string; // For deposit TxID
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
    submissionType: 'link'; // Simplified to only link
    isActive: boolean;
    createdAt: number | object; // Unix timestamp or ServerValue
    durationHours: number; // Duration in hours for the bounty to be active
}

export type BountySubmission = {
    id: string;
    bountyId: string;
    bountyTitle: string;
    userId: string; // The UID of the user.
    username: string; // For display in admin panel
    status: 'Pending' | 'Approved' | 'Rejected';
    submissionData: string; // Link or text
    submittedAt: number | object;
}
