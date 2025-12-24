'use client';

import { useEffect, useState } from 'react';
import { useDatabase, useDatabaseObject, useMemoFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Megaphone, X } from 'lucide-react';
import { Button } from './ui/button';
import { ref } from 'firebase/database';


type Announcement = {
    text: string;
    timestamp: number;
};

export function AnnouncementBanner() {
    const database = useDatabase();
    const [isVisible, setIsVisible] = useState(false);

    const announcementRef = useMemoFirebase(() => database ? ref(database, 'announcement') : null, [database]);
    const { data: announcement, isLoading } = useDatabaseObject<Announcement>(announcementRef);

    useEffect(() => {
        if (isLoading || !announcement || !announcement.text || !announcement.timestamp) {
            setIsVisible(false);
            return;
        }
        
        // Show banner if there is an announcement, regardless of whether it has been seen
        setIsVisible(true);

    }, [announcement, isLoading]);

    const handleDismiss = () => {
        setIsVisible(false);
    };

    if (!isVisible || !announcement?.text) {
        return null;
    }

    return (
        <div className="p-4">
            <Alert className="relative bg-primary/10 border-primary/30 text-foreground">
                <Megaphone className="h-4 w-4 !left-auto right-4 text-primary" />
                <AlertTitle className="font-bold mr-6">إعلان هام</AlertTitle>
                <AlertDescription className="mr-6">
                   {announcement.text}
                </AlertDescription>
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 h-6 w-6"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            </Alert>
        </div>
    );
}
