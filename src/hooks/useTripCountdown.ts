import { useState, useEffect, useRef } from "react";
import { Trip } from "../types";

/** Temps restant avant le départ, déjà décomposé pour l'affichage. */
export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Situe un voyage dans le temps : compte à rebours avant le départ, puis
 * avancement une fois celui-ci commencé. Sert l'en-tête de l'écran de détail,
 * qui matérialise l'attente puis le déroulement du séjour.
 *
 * @param trip Voyage observé, ou `null` tant qu'il n'est pas chargé.
 * @returns `countdown`, décompte rafraîchi chaque seconde ou `null` une fois le
 * départ passé, `progressPercent` borné entre 0 et 100, la durée totale
 * `durationDays` et le nombre de jours écoulés `daysPassed`.
 *
 * @remarks Le passage de `countdown` à `null` est le signal que le voyage a
 * commencé : l'appelant bascule alors sur l'affichage de l'avancement.
 * L'intervalle s'arrête de lui-même à cet instant, il n'y a plus rien à
 * décompter. Seule la date de départ est surveillée, les autres champs du
 * voyage ne modifiant pas le décompte.
 */
export function useTripCountdown(trip: Trip | null) {
  const [countdown, setCountdown] = useState<CountdownValue | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progressPercent = (() => {
    if (!trip) return 0;
    const now = Date.now();
    const start = new Date(trip.startDate).getTime();
    const end = new Date(trip.endDate).getTime();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  })();

  const durationDays = trip
    ? Math.round(
        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const daysPassed = trip
    ? Math.max(
        0,
        Math.min(
          durationDays,
          Math.round(
            (Date.now() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24),
          ),
        ),
      )
    : 0;

  useEffect(() => {
    if (!trip) return;
    const updateCountdown = () => {
      const now = Date.now();
      const start = new Date(trip.startDate).getTime();
      const diff = start - now;
      if (diff <= 0) {
        setCountdown(null);
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [trip?.startDate]);

  return { countdown, progressPercent, durationDays, daysPassed };
}
