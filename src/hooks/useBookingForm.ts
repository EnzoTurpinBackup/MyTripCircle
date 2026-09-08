import { useState, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { Booking } from "../types";
import { type AddressSuggestion } from "../services/PlacesService";
import { type ScannedBookingData } from "../components/TicketScannerModal";
import useAttachmentManager from "./useAttachmentManager";
import useAddressAutocomplete from "./useAddressAutocomplete";
import useTransportAutocomplete from "./useTransportAutocomplete";

export type { Attachment } from "./useAttachmentManager";

interface Props {
  visible: boolean;
  initialBooking?: Partial<Booking>;
  tripStartDate?: Date;
  tripEndDate?: Date;
  preselectedTripId?: string;
  onSave: (booking: Omit<Booking, "id" | "createdAt" | "updatedAt">) => void;
  onClose: () => void;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (date: Date | string | undefined, fallback: Date): Date => {
  if (!date) return fallback;
  if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

/**
 * Indique si une réservation relève d'un déplacement, seul cas où les champs
 * d'origine et de destination sont pertinents.
 *
 * @param type Nature de la réservation.
 * @returns Vrai pour un vol ou un train ; l'appelant s'en sert pour afficher ou
 * masquer les champs de trajet.
 */
export const isTransport = (type: Booking["type"]): boolean => type === "flight" || type === "train";

/**
 * Détermine si la réservation s'étend sur une période et réclame donc une date
 * de fin : une nuitée d'hôtel comme un aller-retour, à la différence d'un
 * trajet simple ou d'une activité ponctuelle.
 *
 * @param type Nature de la réservation.
 * @param direction Sens du trajet, seulement significatif pour un transport.
 * @returns Vrai lorsque le formulaire doit exiger une seconde date.
 */
export const needsEndDate = (type: Booking["type"], direction?: string): boolean =>
  type === "hotel" || (isTransport(type) && direction === "roundtrip");

function applyTypeChange(next: any, prev: any, newType: Booking["type"]): void {
  if (isTransport(newType)) {
    if (!next.tripDirection) next.tripDirection = "outbound";
  } else {
    next.tripDirection = undefined;
  }
  if (!needsEndDate(newType, next.tripDirection)) {
    next.endDate = undefined;
  } else if (!prev.endDate) {
    next.endDate = new Date(prev.date.getTime() + ONE_DAY_MS);
  }
}

function applyDirectionChange(next: any, prev: any, value: string): void {
  if (!needsEndDate(prev.type, value)) {
    next.endDate = undefined;
  } else if (!prev.endDate) {
    next.endDate = new Date(prev.date.getTime() + ONE_DAY_MS);
  }
}

/**
 * Pilote le formulaire de réservation, dont la forme varie fortement selon le
 * type choisi : un vol demande un trajet et un sens, un hôtel une période, une
 * activité une simple date. Rassemble aussi les pièces jointes, la complétion
 * d'adresse et la lecture d'un billet.
 *
 * @param props.visible Ouverture du formulaire, qui commande sa
 * réinitialisation.
 * @param props.initialBooking Réservation à modifier ; son absence signifie une
 * création.
 * @param props.tripStartDate Date de début du voyage, prise comme date par
 * défaut, une réservation étant presque toujours saisie pour la période du
 * séjour.
 * @param props.tripEndDate Date de fin du voyage, non exploitée à ce jour.
 * @param props.preselectedTripId Voyage auquel rattacher la réservation.
 * @param props.onSave Reçoit la réservation composée ; c'est l'appelant qui
 * l'enregistre.
 * @param props.onClose Ferme le formulaire après enregistrement.
 * @returns Les champs et les erreurs par champ, l'état des quatre sélecteurs de
 * date et d'heure ainsi que du lecteur de billet, les gestionnaires de saisie
 * et d'enregistrement, et l'ensemble des valeurs déléguées aux hooks de pièces
 * jointes et de complétion.
 *
 * @remarks Changer de type réajuste les champs devenus incohérents plutôt que
 * de les laisser traîner : le sens du trajet disparaît hors transport, et la
 * date de fin n'est instituée que lorsqu'elle a un sens. Pour un vol, le titre
 * est composé automatiquement à partir du trajet et du sens, un intitulé saisi
 * à la main étant rarement lisible dans la liste. Les pièces jointes circulent
 * sous la forme d'une chaîne associant nom et emplacement, ce qui permet de
 * conserver le nom donné par l'utilisateur sans structure de stockage dédiée.
 * Les sélecteurs natifs sont refermés à la validation sur Android, la
 * plateforme n'offrant pas de dialogue persistant, alors qu'iOS signale
 * explicitement l'abandon. Une date de fin antérieure au début est refusée dès
 * la saisie, et les champs facultatifs vides sont omis de la charge plutôt
 * qu'envoyés vides.
 */
export function useBookingForm({
  visible,
  initialBooking,
  tripStartDate,
  tripEndDate: _tripEndDate,
  preselectedTripId,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation();

  const attachments  = useAttachmentManager(t);
  const addressAC    = useAddressAutocomplete();
  const transportAC  = useTransportAutocomplete();

  const buildInitialFormData = () => {
    const now = new Date();
    const tripStart = tripStartDate ? parseDate(tripStartDate, now) : now;
    const initialDate = initialBooking?.date ? parseDate(initialBooking.date, tripStart) : tripStart;
    const initialEnd = (initialBooking as any)?.endDate
      ? parseDate((initialBooking as any).endDate, new Date(initialDate.getTime() + ONE_DAY_MS))
      : new Date(initialDate.getTime() + ONE_DAY_MS);
    const initialType = initialBooking?.type ?? "flight";
    return {
      type:               initialType,
      tripDirection:      isTransport(initialType) ? (initialBooking?.tripDirection ?? "outbound") : undefined,
      title:              initialBooking?.title || "",
      description:        initialBooking?.description || "",
      date:               initialDate,
      endDate:            initialEnd,
      time:               initialBooking?.time || "",
      address:            initialBooking?.address || "",
      confirmationNumber: initialBooking?.confirmationNumber || "",
      returnTime:         initialBooking?.returnTime || "",
      origin:             initialBooking?.origin || "",
      destination:        initialBooking?.destination || "",
      status:             initialBooking?.status ?? "pending",
    };
  };

  const [formData, setFormData] = useState(buildInitialFormData);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; endDate?: string; origin?: string; destination?: string }>({});
  const [showDatePicker,         setShowDatePicker]         = useState(false);
  const [showEndDatePicker,      setShowEndDatePicker]      = useState(false);
  const [showTimePicker,         setShowTimePicker]         = useState(false);
  const [showReturnTimePicker,   setShowReturnTimePicker]   = useState(false);
  const [showScanner,            setShowScanner]            = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFormData(buildInitialFormData());
    attachments.setAttachments(
      initialBooking?.attachments?.map((entry) => {
        const [name, uri] = entry.includes("::") ? entry.split("::") : [entry.split("/").pop() || entry, entry];
        return { uri, name, type: name.toLowerCase().endsWith(".pdf") ? ("pdf" as const) : ("image" as const) };
      }) ?? [],
    );
    setFieldErrors({});
  }, [visible, initialBooking]);

  const buildFlightTitle = (direction: string | undefined, origin: string, destination: string): string => {
    if (!origin.trim() || !destination.trim()) return "";
    const short = (place: string) => place.split(",")[0].trim();
    let dirLabel: string;
    if (direction === "return") {
      dirLabel = t("bookings.directionLabels.return");
    } else if (direction === "roundtrip") {
      dirLabel = t("bookings.directionLabels.roundtrip");
    } else {
      dirLabel = t("bookings.directionLabels.outbound");
    }
    return `${t("bookings.flightPrefix")} ${dirLabel}: ${short(origin)} → ${short(destination)}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next: any = { ...prev, [field]: value };
      if (field === "type") applyTypeChange(next, prev, value as Booking["type"]);
      if (field === "tripDirection") applyDirectionChange(next, prev, value);
      if (next.type === "flight" && ["origin", "destination", "tripDirection", "type"].includes(field)) {
        next.title = buildFlightTitle(next.tripDirection, next.origin ?? "", next.destination ?? "");
      }
      return next;
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date, dateType: "start" | "end" = "start") => {
    const hide = () => dateType === "start" ? setShowDatePicker(false) : setShowEndDatePicker(false);
    if (Platform.OS === "android") hide();
    if (selectedDate) {
      const date = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
      if (Number.isNaN(date.getTime())) return;
      if (dateType === "start") {
        setFormData((prev) => ({
          ...prev, date,
          ...(prev.endDate && date > prev.endDate ? { endDate: new Date(date.getTime() + ONE_DAY_MS) } : {}),
        }));
      } else {
        setFormData((prev) => {
          if (date < prev.date) { Alert.alert(t("common.error"), t("bookings.endDateBeforeStart")); return prev; }
          return { ...prev, endDate: date };
        });
      }
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      hide();
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedTime) {
      const hh = selectedTime.getHours().toString().padStart(2, "0");
      const mm = selectedTime.getMinutes().toString().padStart(2, "0");
      setFormData((prev) => ({ ...prev, time: `${hh}:${mm}` }));
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowTimePicker(false);
    }
  };

  const handleReturnTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") setShowReturnTimePicker(false);
    if (selectedTime) {
      const hh = selectedTime.getHours().toString().padStart(2, "0");
      const mm = selectedTime.getMinutes().toString().padStart(2, "0");
      setFormData((prev) => ({ ...prev, returnTime: `${hh}:${mm}` }));
    } else if (Platform.OS === "ios" && event.type === "dismissed") {
      setShowReturnTimePicker(false);
    }
  };

  const getTimePickerValue = (): Date => {
    const base = new Date(formData.date);
    if (formData.time) {
      const [h, m] = formData.time.split(":");
      base.setHours(Number.parseInt(h, 10), Number.parseInt(m, 10), 0, 0);
      return base;
    }
    base.setHours(12, 0, 0, 0);
    return base;
  };

  const getReturnTimePickerValue = (): Date => {
    const base = formData.endDate ? new Date(formData.endDate) : new Date(formData.date);
    if (formData.returnTime) {
      const [h, m] = formData.returnTime.split(":");
      base.setHours(Number.parseInt(h, 10), Number.parseInt(m, 10), 0, 0);
      return base;
    }
    base.setHours(12, 0, 0, 0);
    return base;
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!formData.title.trim()) errors.title = t("bookings.titleRequired");
    if (isTransport(formData.type)) {
      if (!formData.origin.trim()) errors.origin = t("bookings.originRequired");
      if (!formData.destination.trim()) errors.destination = t("bookings.destinationRequired");
    }
    if (needsEndDate(formData.type, formData.tripDirection) && formData.endDate && formData.endDate < formData.date)
      errors.endDate = t("bookings.endDateBeforeStart");
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return false; }
    setFieldErrors({});
    return true;
  };

  const handleScanFill = (data: ScannedBookingData) => {
    setFormData((prev) => ({
      ...prev,
      ...(data.type ? { type: data.type } : {}),
      ...(data.title ? { title: data.title } : {}),
      ...(data.time ? { time: data.time } : {}),
      ...(data.address ? { address: data.address } : {}),
      ...(data.confirmationNumber ? { confirmationNumber: data.confirmationNumber } : {}),
      ...(data.date instanceof Date && !Number.isNaN(data.date.getTime()) ? { date: data.date } : {}),
      ...(data.endDate instanceof Date && !Number.isNaN(data.endDate.getTime()) ? { endDate: data.endDate } : {}),
    }));
  };

  const handleAddressChange = (text: string) =>
    addressAC.handleAddressChange(text, (v) => handleInputChange("address", v));

  const handleSelectAddress = (suggestion: AddressSuggestion) =>
    addressAC.handleSelectAddress(suggestion, (desc) => handleInputChange("address", desc));

  const handleOriginChange = (text: string) =>
    transportAC.handleOriginChange(text, (v) => handleInputChange("origin", v), formData.type as "flight" | "train");

  const handleDestinationChange = (text: string) =>
    transportAC.handleDestinationChange(text, (v) => handleInputChange("destination", v), formData.type as "flight" | "train");

  const handleSelectOrigin = (suggestion: AddressSuggestion) =>
    transportAC.handleSelectOrigin(suggestion, (desc) => handleInputChange("origin", desc));

  const handleSelectDestination = (suggestion: AddressSuggestion) =>
    transportAC.handleSelectDestination(suggestion, (desc) => handleInputChange("destination", desc));

  const handleSave = () => {
    if (!validateForm()) return;
    onSave({
      tripId:             preselectedTripId || "",
      type:               formData.type,
      title:              formData.title.trim(),
      description:        formData.description.trim() || undefined,
      date:               formData.date,
      tripDirection:      isTransport(formData.type) ? formData.tripDirection : undefined,
      endDate:            needsEndDate(formData.type, formData.tripDirection) && formData.endDate ? formData.endDate : undefined,
      time:               formData.time || undefined,
      returnTime:         isTransport(formData.type) && formData.tripDirection === "roundtrip" ? formData.returnTime || undefined : undefined,
      origin:             isTransport(formData.type) ? formData.origin.trim() || undefined : undefined,
      destination:        isTransport(formData.type) ? formData.destination.trim() || undefined : undefined,
      address:            formData.address.trim() || undefined,
      confirmationNumber: formData.confirmationNumber.trim() || undefined,
      status:             formData.status,
      attachments:        attachments.attachments.length > 0 ? attachments.attachments.map((a) => `${a.name}::${a.uri}`) : undefined,
    });
    onClose();
  };

  return {
    formData,
    fieldErrors, setFieldErrors,
    showDatePicker, setShowDatePicker,
    showEndDatePicker, setShowEndDatePicker,
    showTimePicker, setShowTimePicker,
    showReturnTimePicker, setShowReturnTimePicker,
    showScanner, setShowScanner,
    handleInputChange, handleDateChange,
    handleTimeChange, handleReturnTimeChange,
    getTimePickerValue, getReturnTimePickerValue,
    handleScanFill, handleSave,
    // Attachments
    attachments:           attachments.attachments,
    renamingIndex:         attachments.renamingIndex,
    setRenamingIndex:      attachments.setRenamingIndex,
    renameValue:           attachments.renameValue,
    setRenameValue:        attachments.setRenameValue,
    handlePickImage:       attachments.handlePickImage,
    handlePickDocument:    attachments.handlePickDocument,
    handleOpenRename:      attachments.handleOpenRename,
    handleConfirmRename:   attachments.handleConfirmRename,
    handleRemoveAttachment: attachments.handleRemoveAttachment,
    // Address
    addressSuggestions:    addressAC.addressSuggestions,
    showAddressSuggestions: addressAC.showAddressSuggestions,
    handleAddressChange,
    handleSelectAddress,
    // Transport origin/destination
    originSuggestions:          transportAC.originSuggestions,
    showOriginSuggestions:      transportAC.showOriginSuggestions,
    destinationSuggestions:     transportAC.destinationSuggestions,
    showDestinationSuggestions: transportAC.showDestinationSuggestions,
    handleOriginChange,
    handleDestinationChange,
    handleSelectOrigin,
    handleSelectDestination,
  };
}
