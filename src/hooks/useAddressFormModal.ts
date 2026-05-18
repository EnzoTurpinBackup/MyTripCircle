import { useEffect, useRef, useState } from "react";
import { Alert, Animated } from "react-native";
import { useTranslation } from "react-i18next";
import { Address } from "../types";
import {
  AddressSuggestion,
  getAddressSuggestions,
  getPlaceDetails,
} from "../services/PlacesService";
import { useCurrentLocation } from "./useCurrentLocation";

interface UseAddressFormModalOptions {
  visible: boolean;
  initialAddress?: Address;
  onSave: (address: Omit<Address, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
}

const INITIAL_FORM = {
  type: "hotel" as Address["type"],
  name: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  website: "",
  notes: "",
};

export const useAddressFormModal = ({
  visible,
  initialAddress,
  onSave,
  onClose,
}: UseAddressFormModalOptions) => {
  const { t } = useTranslation();
  const currentLocation = useCurrentLocation();

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [fetchingPlaceDetails, setFetchingPlaceDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(1000);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (initialAddress) {
      setForm({
        type:    initialAddress.type,
        name:    initialAddress.name,
        address: initialAddress.address,
        city:    initialAddress.city,
        country: initialAddress.country,
        phone:   initialAddress.phone   || "",
        website: initialAddress.website || "",
        notes:   initialAddress.notes   || "",
      });
      setGoogleRating(initialAddress.rating ?? null);
      setPhotoUrl(initialAddress.photoUrl);
    } else {
      setForm({ ...INITIAL_FORM });
      setGoogleRating(null);
      setPhotoUrl(undefined);
    }
    setSuggestions([]);
  }, [visible, initialAddress]);

  useEffect(() => {
    if (!form.address || form.address.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let isActive = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const results = await getAddressSuggestions(
          form.address.trim(),
          controller.signal,
          currentLocation ?? undefined,
          form.type
        );
        if (isActive) setSuggestions(results);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Address suggestions error:", error);
        }
      } finally {
        if (isActive) setLoadingSuggestions(false);
      }
    }, 400);
    return () => { isActive = false; controller.abort(); clearTimeout(timeoutId); };
  }, [form.address, currentLocation]);

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSuggestionPress = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    try {
      setFetchingPlaceDetails(true);
      const details = await getPlaceDetails(suggestion.placeId);
      setForm((prev) => ({
        ...prev,
        name:    details.name    || suggestion.description.split(",")[0].trim(),
        address: details.formattedAddress || suggestion.description,
        city:    details.city    || prev.city,
        country: details.country || prev.country,
        phone:   details.phone   || prev.phone,
        website: details.website || prev.website,
      }));
      if (details.rating != null) setGoogleRating(details.rating);
      if (details.photoUrl) setPhotoUrl(details.photoUrl);
    } catch (error) {
      console.error("Place details error:", error);
    } finally {
      setFetchingPlaceDetails(false);
    }
  };

  const handleSave = async () => {
    if (!form.address.trim() || !form.city.trim() || !form.country.trim()) {
      Alert.alert(t("common.error"), t("addresses.form.requiredFields"));
      return;
    }
    const payload = {
      type:    form.type,
      name:    form.name.trim(),
      address: form.address.trim(),
      city:    form.city.trim(),
      country: form.country.trim(),
      phone:   form.phone.trim()   || undefined,
      website: form.website.trim() || undefined,
      notes:   form.notes.trim()   || undefined,
      rating:  googleRating ?? undefined,
      photoUrl: photoUrl || undefined,
    };
    try {
      setSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (error) {
      console.error("Address save error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    googleRating,
    suggestions,
    loadingSuggestions,
    fetchingPlaceDetails,
    submitting,
    slideAnim,
    handleInputChange,
    handleSuggestionPress,
    handleSave,
  };
};
