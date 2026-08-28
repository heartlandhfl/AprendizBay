"use client";

import { useEffect, useState } from "react";
import BookingStatusBadge from "@/components/bookings/BookingStatusBadge";
import JoinLessonButton from "@/components/bookings/JoinLessonButton";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Booking } from "@/lib/bookings/types";
import { BOOKING_TYPE_LABELS } from "@/lib/bookings/types";
import {
  fetchUserDisplayName,
  formatBookingDate,
  formatBookingPrice,
  subscribeToTutorConfirmedBookings,
} from "@/lib/bookings/service";

interface EnrichedBooking extends Booking {
  studentName: string;
}

export default function TutorConfirmedBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToTutorConfirmedBookings(
      user.uid,
      async (nextBookings) => {
        const enriched = await Promise.all(
          nextBookings.map(async (booking) => ({
            ...booking,
            studentName: await fetchUserDisplayName(booking.studentId),
          })),
        );

        setBookings(enriched);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return unsubscribe;
  }, [user]);

  if (loading) {
    return null;
  }

  if (bookings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Aulas confirmadas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre na sala de videoconferência quando for hora da aula.
        </p>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {booking.studentName}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {BOOKING_TYPE_LABELS[booking.type]}
                  {booking.hubId ? ` · Turma ${booking.hubId}` : ""}
                </p>
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>

            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Data agendada</dt>
                <dd className="font-medium text-foreground">
                  {formatBookingDate(booking.scheduledAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-medium text-foreground">
                  {formatBookingPrice(booking.price)}/h
                </dd>
              </div>
            </dl>

            {booking.meetingUrl && (
              <div className="mt-4">
                <JoinLessonButton meetingUrl={booking.meetingUrl} />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
