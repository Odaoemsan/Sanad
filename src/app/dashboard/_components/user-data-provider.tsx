'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, useDatabase, useDatabaseObject, useDatabaseList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo } from 'firebase/database';
import type { Transaction, UserProfile, Investment } from '@/lib/placeholder-data';

interface UserDataContextType {
    userProfile: UserProfile | null;
    transactionsData: Transaction[] | null;
    investmentsData: Investment[] | null;
    isLoading: boolean;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
    const { user, isUserLoading: isAuthLoading } = useUser();
    const database = useDatabase();

    const userProfileRef = useMemoFirebase(() => {
        if (!database || !user) return null;
        return ref(database, `users/${user.uid}`);
    }, [database, user]);

    const transactionsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return query(ref(database, 'transactions'), orderByChild('userProfileId'), equalTo(user.uid));
    }, [user, database]);
    
    const investmentsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/investments`);
    }, [user, database]);

    const { data: userProfile, isLoading: isProfileLoading } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: transactionsData, isLoading: areTransactionsLoading } = useDatabaseList<Transaction>(transactionsRef);
    const { data: investmentsData, isLoading: areInvestmentsLoading } = useDatabaseList<Investment>(investmentsRef);

    const isLoading = isAuthLoading || isProfileLoading || areTransactionsLoading || areInvestmentsLoading;

    const value = {
        userProfile,
        transactionsData,
        investmentsData,
        isLoading
    };

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
}

export const useUserData = (): UserDataContextType => {
    const context = useContext(UserDataContext);
    if (context === undefined) {
        throw new Error('useUserData must be used within a UserDataProvider');
    }
    return context;
};
