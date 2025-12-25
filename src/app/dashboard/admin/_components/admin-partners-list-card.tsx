'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminData } from './admin-data-provider';
import { Users, Medal, Star } from 'lucide-react';

export function AdminPartnersListCard() {
  const { allUsers, allRanks, isLoading } = useAdminData();

  const rankedUsers = useMemo(() => {
    if (!allUsers || !allRanks) return [];
    
    const ranksMap = new Map(allRanks.map(r => [r.id, r.name]));

    return allUsers
      .filter(user => user.rank && ranksMap.has(user.rank))
      .map(user => ({
        ...user,
        rankName: ranksMap.get(user.rank as 'success-partner' | 'representative') || 'N/A'
      }))
      .sort((a, b) => {
          // Sort by rank first (representative > success-partner) then by username
          if (a.rank === 'representative' && b.rank !== 'representative') return -1;
          if (b.rank === 'representative' && a.rank !== 'representative') return 1;
          return a.username.localeCompare(b.username);
      });
  }, [allUsers, allRanks]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
           <Users className="h-5 w-5 text-primary" />
           <CardTitle>قائمة الشركاء المميزين ({rankedUsers.length})</CardTitle>
        </div>
        <CardDescription>عرض جميع المستخدمين الذين وصلوا إلى رتبة في برنامج الشركاء.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>جاري تحميل القائمة...</p>
        ) : rankedUsers.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead>الرتبة</TableHead>
                  <TableHead>إجمالي إيداع الفريق</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          user.rank === 'representative' && 'bg-blue-500/20 text-blue-700 border-blue-500/20',
                          user.rank === 'success-partner' && 'bg-yellow-500/20 text-yellow-700 border-yellow-500/20',
                        )}
                      >
                         {user.rank === 'representative' ? <Medal className="w-3 h-3 ml-1"/> : <Star className="w-3 h-3 ml-1"/>}
                         {user.rankName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                        ${(user.teamTotalDeposit || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center p-4">
            لا يوجد مستخدمون حققوا رتبة بعد.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
