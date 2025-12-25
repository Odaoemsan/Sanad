'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useDatabase, useDatabaseList, useMemoFirebase } from '@/firebase';
import { ref } from 'firebase/database';
import type { Transaction, UserProfile, Investment, InvestmentPlan, Bounty, BountySubmission } from '@/lib/placeholder-data';

interface AdminDataContextType {
    allUsers: UserProfile[] | null;
    allTransactions: Transaction[] | null;
    allInvestments: Investment[] | null;
    allPlans: InvestmentPlan[] | null;
    allBounties: Bounty[] | null;
    allSubmissions: BountySubmission[] | null;
    usersMap: Map<string, string>;
    isLoading: boolean;
    error: Error | null;
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export function AdminDataProvider({ children }: { children: ReactNode }) {
    const database = useDatabase();

    // Fetch all data needed for the admin dashboard in one place
    const allUsersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);
    const allTransactionsRef = useMemoFirebase(() => database ? ref(database, 'transactions') : null, [database]);
    const allPlansRef = useMemoFirebase(() => database ? ref(database, 'investment_plans') : null, [database]);
    const allBountiesRef = useMemoFirebase(() => database ? ref(database, 'bounties') : null, [database]);
    const allSubmissionsRef = useMemoFirebase(() => database ? ref(database, 'bounty_submissions') : null, [database]);

    const { data: allUsers, isLoading: isLoadingUsers, error: usersError } = useDatabaseList<UserProfile>(allUsersRef);
    const { data: allTransactions, isLoading: isLoadingTxs, error: txsError } = useDatabaseList<Transaction>(allTransactionsRef);
    const { data: allPlans, isLoading: isLoadingPlans, error: plansError } = useDatabaseList<InvestmentPlan>(allPlansRef);
    const { data: allBounties, isLoading: isLoadingBounties, error: bountiesError } = useDatabaseList<Bounty>(allBountiesRef);
    const { data: allSubmissions, isLoading: isLoadingSubmissions, error: submissionsError } = useDatabaseList<BountySubmission>(allSubmissionsRef);

    // Combine loading states and errors
    const isLoading = isLoadingUsers || isLoadingTxs || isLoadingPlans || isLoadingBounties || isLoadingSubmissions;
    const error = usersError || txsError || plansError || bountiesError || submissionsError;

    // Create a memoized map of user IDs to usernames for quick lookups
    const usersMap = useMemo(() => {
        if (!allUsers) return new Map<string, string>();
        return new Map(allUsers.map(user => [user.id, user.username]));
    }, [allUsers]);

    const value = {
        allUsers,
        allTransactions,
        allInvestments: null, // Note: Investments are nested under users, handle separately if needed
        allPlans,
        allBounties,
        allSubmissions,
        usersMap,
        isLoading,
        error,
    };

    return (
        <AdminDataContext.Provider value={value}>
            {children}
        </AdminDataContext.Provider>
    );
}

export const useAdminData = (): AdminDataContextType => {
    const context = useContext(AdminDataContext);
    if (context === undefined) {
        throw new Error('useAdminData must be used within an AdminDataProvider');
    }
    return context;
};
