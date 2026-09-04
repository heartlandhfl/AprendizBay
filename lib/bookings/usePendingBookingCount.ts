"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { isLecturerRole } from "@/lib/auth/roles";
import { subscribeToTutorPendingBookingCount } from "@/lib/bookings/service";

export function usePendingBookingCount(): number {
  const { user, userDoc } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !isLecturerRole(userDoc?.role)) {
      setCount(0);
      return;
    }

    const unsubscribe = subscribeToTutorPendingBookingCount(user.uid, setCount, () =>
      setCount(0),
    );

    return unsubscribe;
  }, [user, userDoc?.role]);

  return count;
}
