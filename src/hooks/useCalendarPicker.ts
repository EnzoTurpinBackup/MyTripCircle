import { useState } from "react";
import { Keyboard } from "react-native";

interface UseCalendarPickerParams {
  startDate: Date;
  endDate: Date;
  onDatesChange: (start: Date, end: Date) => void;
}

/**
 * Contrat du calendrier de période. Exporté parce qu'il entre dans le type de
 * retour de l'écran de modification d'un voyage, qui aplatit cet état avec le
 * sien.
 */
export interface UseCalendarPickerReturn {
  showCalendar: boolean;
  calendarPickingFor: "start" | "end";
  calendarYear: number;
  calendarMonth: number;
  openCalendar: (type: "start" | "end") => void;
  closeCalendar: () => void;
  handleCalendarDayPress: (day: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
}

/**
 * Pilote le calendrier de sélection d'une période de voyage. Les dates restent
 * détenues par le formulaire appelant ; seuls le mois affiché et la borne en
 * cours de choix sont gérés ici.
 *
 * @param params.startDate Date de début courante, qui sert de repère
 * d'ouverture et de borne basse.
 * @param params.endDate Date de fin courante.
 * @param params.onDatesChange Notifie le formulaire de la nouvelle période
 * complète à chaque sélection.
 * @returns L'état d'ouverture du calendrier, la borne en cours de choix, le
 * mois et l'année affichés, et les commandes d'ouverture, de fermeture, de
 * sélection d'un jour et de navigation entre les mois.
 *
 * @remarks Le choix enchaîne les deux bornes : sélectionner un début bascule
 * directement sur la fin, ce qui correspond à la manière dont on renseigne une
 * période. Un ordre inversé est corrigé par permutation plutôt que refusé, une
 * date de fin antérieure au début traduisant une intention de déplacer la
 * période. Le clavier est refermé à l'ouverture, faute de quoi il masquerait le
 * calendrier sur les petits écrans.
 */
const useCalendarPicker = ({
  startDate,
  endDate,
  onDatesChange,
}: UseCalendarPickerParams): UseCalendarPickerReturn => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPickingFor, setCalendarPickingFor] = useState<"start" | "end">("start");
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const openCalendar = (type: "start" | "end") => {
    Keyboard.dismiss();
    if (showCalendar && calendarPickingFor === type) {
      setShowCalendar(false);
      return;
    }
    const ref = type === "start" ? startDate : endDate;
    setCalendarYear(ref.getFullYear());
    setCalendarMonth(ref.getMonth());
    setCalendarPickingFor(type);
    setShowCalendar(true);
  };

  const closeCalendar = () => setShowCalendar(false);

  const handleCalendarDayPress = (day: number) => {
    const selected = new Date(calendarYear, calendarMonth, day);
    if (calendarPickingFor === "start") {
      const newEnd = new Date(Math.max(selected.valueOf(), endDate.valueOf()));
      onDatesChange(selected, newEnd);
      setCalendarYear(newEnd.getFullYear());
      setCalendarMonth(newEnd.getMonth());
      setCalendarPickingFor("end");
    } else {
      if (selected < startDate) {
        onDatesChange(selected, startDate);
      } else {
        onDatesChange(startDate, selected);
      }
      setShowCalendar(false);
    }
  };

  const goToPrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
    else setCalendarMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
    else setCalendarMonth((m) => m + 1);
  };

  return {
    showCalendar,
    calendarPickingFor,
    calendarYear,
    calendarMonth,
    openCalendar,
    closeCalendar,
    handleCalendarDayPress,
    goToPrevMonth,
    goToNextMonth,
  };
};

export default useCalendarPicker;
