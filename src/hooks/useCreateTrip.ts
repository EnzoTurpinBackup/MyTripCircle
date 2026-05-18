import { useState, useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../types";
import { useTrips } from "../contexts/TripsContext";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { parseApiError } from "../utils/i18n";
import { fetchDestinationPhotoUrl } from "../utils/destinationPhoto";

type CreateTripNavigationProp = StackNavigationProp<RootStackParamList, "CreateTrip">;

export type TripVisibility = "private" | "friends" | "public";

export interface TripFormData {
  title: string;
  description: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  isPublic: boolean;
  visibility: TripVisibility;
}

const buildInitialFormData = (): TripFormData => {
  const now = new Date();
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    destination: "",
    startDate: now,
    endDate,
    isPublic: false,
    visibility: "private",
  };
};

export const useCreateTrip = () => {
  const navigation = useNavigation<CreateTripNavigationProp>();
  const { createTrip, trips } = useTrips();
  const { user } = useAuth();
  const { canCreateTrip } = useSubscription();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<TripFormData>(buildInitialFormData);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string>("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-fetch photo de couverture à partir de la destination ───────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (formData.destination.trim().length < 3) {
      setCoverImage("");
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const url = await fetchDestinationPhotoUrl(formData.destination);
      if (url) setCoverImage(url);
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [formData.destination]);

  const handleInputChange = (field: keyof TripFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (
    event: any,
    selectedDate?: Date,
    type: "start" | "end" = "start"
  ) => {
    if (Platform.OS === "android") {
      if (type === "start") {
        setShowStartDatePicker(false);
      } else {
        setShowEndDatePicker(false);
      }
    }

    if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
      return;
    }

    if (type === "start") {
      setFormData((prev) => {
        const newEnd = new Date(Math.max(selectedDate.valueOf(), prev.endDate.valueOf()));
        setDateError(null);
        return { ...prev, startDate: selectedDate, endDate: newEnd };
      });
    } else {
      setFormData((prev) => {
        if (selectedDate < prev.startDate) {
          setDateError(t("createTrip.invalidDates"));
        } else {
          setDateError(null);
        }
        return { ...prev, endDate: selectedDate };
      });
    }
  };

  const handleVisibilityChange = (option: TripVisibility) => {
    setFormData((prev) => ({
      ...prev,
      visibility: option,
      isPublic: option === "public",
    }));
    setShowVisibilityPicker(false);
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert(t("createTrip.error"), t("createTrip.titleRequired"));
      return false;
    }
    if (!formData.destination.trim()) {
      Alert.alert(t("createTrip.error"), t("createTrip.destinationRequired"));
      return false;
    }
    if (formData.endDate < formData.startDate) {
      Alert.alert(t("createTrip.error"), t("createTrip.invalidDates"));
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm() || !user) return;

    const ownedCount = trips.filter((trip) => trip.ownerId === user.id).length;
    if (!canCreateTrip(ownedCount)) {
      Alert.alert(
        t("subscription.tripLimitTitle"),
        t("subscription.tripLimitBody"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("subscription.upgradeButton"), onPress: () => navigation.navigate("Subscription") },
        ],
      );
      return;
    }

    try {
      setLoading(true);
      const newTrip = await createTrip({
        title: formData.title.trim(),
        description: formData.description.trim(),
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        collaborators: [],
        isPublic: formData.isPublic,
        visibility: formData.visibility,
        status: "draft",
        coverImage: coverImage || undefined,
        stats: {
          totalBookings: 0,
          totalAddresses: 0,
          totalCollaborators: 0,
        },
        location: {
          type: "Point",
          coordinates: [0, 0],
        },
      } as any);

      Alert.alert(t("createTrip.success"), t("createTrip.successMessage"), [
        {
          text: t("common.ok"),
          onPress: () =>
            navigation.replace("TripDetails", {
              tripId: newTrip.id,
              showValidateButton: true,
            }),
        },
      ]);
    } catch (error) {
      console.error("[useCreateTrip] handleCreate - Error:", error);
      Alert.alert(t("common.error"), parseApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(t("createTrip.cancelTitle"), t("createTrip.cancelMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return {
    formData,
    showStartDatePicker,
    showEndDatePicker,
    showVisibilityPicker,
    loading,
    dateError,
    handleInputChange,
    handleDateChange,
    handleVisibilityChange,
    handleCreate,
    handleCancel,
    setShowStartDatePicker,
    setShowEndDatePicker,
    setShowVisibilityPicker,
  };
};
