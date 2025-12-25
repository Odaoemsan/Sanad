'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Gift, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the shape of a notification item
type NotificationItem = {
    id: number;
    username: string;
    action: string;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'reward';
};

// Create a list of mock notifications. We will cycle through these.
const mockNotifications: Omit<NotificationItem, 'id'>[] = [
    { username: 'Ali**', action: 'إيداع', amount: 150, type: 'deposit' },
    { username: 'Fatima**', action: 'سحب', amount: 85, type: 'withdrawal' },
    { username: 'Mohammed**', action: 'ربح مكافأة', amount: 10, type: 'reward' },
    { username: 'Hassan**', action: 'إيداع', amount: 300, type: 'deposit' },
    { username: 'Zainab**', action: 'سحب', amount: 120, type: 'withdrawal' },
    { username: 'Omar**', action: 'إيداع', amount: 50, type: 'deposit' },
    { username: 'Nour**', action: 'سحب', amount: 200, type: 'withdrawal' },
    { username: 'Khaled**', action: 'ربح مهمة', amount: 5, type: 'reward' },
    { username: 'Sara**', action: 'إيداع', amount: 75, type: 'deposit' },
    { username: 'Youssef**', action: 'سحب', amount: 90, type: 'withdrawal' },
    { username: 'Aisha**', action: 'إيداع', amount: 500, type: 'deposit' },
    { username: 'Ibrahim**', action: 'ربح إحالة', amount: 15, type: 'reward' },
];

const NotificationIcon = ({ type }: { type: NotificationItem['type'] }) => {
    switch (type) {
        case 'deposit':
            return <ArrowDownLeft className="h-5 w-5 text-green-500" />;
        case 'withdrawal':
            return <ArrowUpRight className="h-5 w-5 text-red-500" />;
        case 'reward':
            return <Gift className="h-5 w-5 text-amber-500" />;
        default:
            return <TrendingUp className="h-5 w-5 text-gray-500" />;
    }
}

export function SocialProofTicker() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // We use useMemo to create the initial list of notifications with unique IDs
    // This helps React track the items correctly during re-renders
    const initialItems = useMemo(() => {
        return Array.from({ length: 20 }, (_, i) => {
            const item = mockNotifications[i % mockNotifications.length];
            return {
                ...item,
                id: i, // Give a unique id for the key prop
            };
        });
    }, []);

    useEffect(() => {
        setNotifications(initialItems);
    }, [initialItems]);

    // If there are no notifications, don't render the component
    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="text-primary" />
                أحدث الأنشطة
            </h2>
            <Card className="w-full h-48 overflow-hidden relative card-glass">
                <CardContent className="p-0">
                    {/* The `animate-scroll` class is what makes the content move */}
                    <div className="animate-scroll">
                        {/* We render the list twice to create a seamless loop */}
                        {[...notifications, ...notifications].map((item, index) => (
                            <div key={`${item.id}-${index}`} className="flex items-center gap-4 p-3 border-b border-border/10">
                                <div className="p-2 bg-muted/50 rounded-full">
                                    <NotificationIcon type={item.type} />
                                </div>
                                <div className="flex-1 text-sm">
                                    <p>
                                        <span className="font-bold">{item.username}</span>
                                        {' قام بعملية '}
                                        <span className={cn(
                                            'font-semibold',
                                            item.type === 'deposit' && 'text-green-600',
                                            item.type === 'withdrawal' && 'text-red-600',
                                            item.type === 'reward' && 'text-amber-600'
                                        )}>
                                            {item.action}
                                        </span>
                                    </p>
                                </div>
                                <div className={cn(
                                    'font-bold text-sm',
                                     item.type === 'deposit' ? 'text-green-500' : 'text-foreground'
                                )}>
                                    ${item.amount.toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
                {/* Gradient overlay for a fade-out effect at the top and bottom */}
                <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-card to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            </Card>
        </div>
    );
}
