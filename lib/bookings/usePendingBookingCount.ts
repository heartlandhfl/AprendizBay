"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { subscribeToTutorPendingBookingCount } from "@/lib/bookings/service";

export function usePendingBookingCount(): number {
  const { user, userDoc } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || userDoc?.role !== "tutor") {
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
