'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { Globe, WifiOff } from 'lucide-react';

// List of country codes to block. Add more as needed.
// Syria and Turkey are added based on the user's request.
const BLOCKED_COUNTRY_CODES = ['SY', 'TR', 'IR', 'CU', 'KP'];

type LocationInfo = {
  status: 'success' | 'fail';
  countryCode: string;
  message?: string;
};

// This component fetches the user's location and blocks access if they are in a restricted country.
export function LocationBlocking({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We only want to run this check on the client-side.
    const checkLocation = async () => {
      try {
        const response = await fetch('http://ip-api.com/json/?fields=status,message,countryCode');
        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }
        const data: LocationInfo = await response.json();

        if (data.status === 'success' && BLOCKED_COUNTRY_CODES.includes(data.countryCode)) {
          setIsBlocked(true);
        }
      } catch (error) {
        console.warn('Location check failed. This might happen due to ad-blockers or network issues. Access will be allowed.', error);
        // If the location check fails, we default to allowing access to not block legitimate users.
      } finally {
        setIsLoading(false);
      }
    };

    checkLocation();
  }, []);

  if (isLoading) {
    // Show a loading screen while we verify the location.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <Globe className="w-16 h-16 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-bold">جاري التحقق من موقعك...</h1>
        <p className="text-muted-foreground mt-2">يرجى الانتظار بينما نتأكد من أن الخدمة متاحة في منطقتك.</p>
      </div>
    );
  }

  if (isBlocked) {
    // Show the blocking screen if the user is in a restricted country.
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
        <WifiOff className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">الخدمة غير متوفرة</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          نأسف، ولكن يبدو أن خدماتنا غير متاحة حاليًا في بلدك بسبب قيود إقليمية. نحن نعمل على توسيع نطاق خدماتنا في المستقبل.
        </p>
      </div>
    );
  }

  // If not loading and not blocked, render the actual application.
  return <>{children}</>;
}
