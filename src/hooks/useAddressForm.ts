import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { Address, RootStackParamList } from "../types";
import { useTrips } from "../contexts/TripsContext";
import {
  AddressSuggestion,
  getAddressSuggestions,
  getPlaceDetails,
} from "../services/PlacesService";
import { useCurrentLocation } from "./useCurrentLocation";

type AddressFormRouteProp = RouteProp<RootStackParamList, "AddressForm">;
type AddressFormNavigationProp = StackNavigationProp<RootStackParamList, "AddressForm">;

export const ADDRESS_TYPES: Address["type"][] = [
  "hotel",
  "restaurant",
  "activity",
  "transport",
  "other",
];

export const getTypeIcon = (type: Address["type"]): string => {
  switch (type) {
    case "hotel":      return "bed";
    case "restaurant": return "restaurant";
    case "activity":   return "ticket";
    case "transport":  return "car";
    default:           return "location";
  }
};

export const useAddressForm = () => {
  const route = useRoute<AddressFormRouteProp>();
  const navigation = useNavigation<AddressFormNavigationProp>();
  const { t } = useTranslation();
  const {
    addresses,
    createAddress,
    updateAddress,
    loading: contextLoading,
  } = useTrips();
  const currentLocation = useCurrentLocation();

  const addressId = route.params?.addressId;
  const tripId = route.params?.tripId;

  const existingAddress = useMemo(() => {
    if (!addressId) return null;
    return addresses.find((item) => item.id === addressId) || null;
  }, [addresses, addressId]);

  const [form, setForm] = useState({
    type: "hotel" as Address["type"],
    name: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    website: "",
    notes: "",
  });
  const [googleRating, setGoogleRating] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [fetchingPlaceDetails, setFetchingPlaceDetails] = useState(false);

  useEffect(() => {
    if (initialized || contextLoading) return;
    if (existingAddress) {
      setForm({
        type: existingAddress.type,
        name: existingAddress.name,
        address: existingAddress.address,
        city: existingAddress.city,
        country: existingAddress.country,
        phone: existingAddress.phone || "",
        website: existingAddress.website || "",
        notes: existingAddress.notes || "",
      });
      if (existingAddress.rating != null) setGoogleRating(existingAddress.rating);
    }
    setInitialized(true);
  }, [contextLoading, existingAddress, initialized]);

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
  }, [form.address, form.type]);

  const handleInputChange = (field: keyof typeof form, value: string) => {
    if (field === "phone") {
      const cleaned = value.replaceAll(/\D/g, "");
      const trimmed = cleaned.slice(0, 10);
      const formatted = trimmed.replaceAll(/(\d{2})(?=\d)/g, "$1 ");
      setForm((prev) => ({ ...prev, [field]: formatted }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.address.trim() || !form.city.trim() || !form.country.trim()) {
      Alert.alert(t("common.error"), t("addresses.form.requiredFields"));
      return false;
    }
    return true;
  };

  const handleSuggestionPress = async (suggestion: AddressSuggestion) => {
    setSuggestions([]);
    try {
      setFetchingPlaceDetails(true);
      const details = await getPlaceDetails(suggestion.placeId);
      setForm((prev) => ({
        ...prev,
        name:    details.name || suggestion.description.split(",")[0].trim(),
        address: details.formattedAddress || suggestion.description,
        city:    details.city    || prev.city,
        country: details.country || prev.country,
        phone:   details.phone   || prev.phone,
        website: details.website || prev.website,
      }));
      if (details.rating != null) setGoogleRating(details.rating);
    } catch (error) {
      console.error("Place details error:", error);
    } finally {
      setFetchingPlaceDetails(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const payload = {
      type:    form.type,
      name:    form.name.trim(),
      address: form.address.trim(),
      city:    form.city.trim(),
      country: form.country.trim(),
      phone:   form.phone.trim()    || undefined,
      website: form.website.trim()  || undefined,
      notes:   form.notes.trim()    || undefined,
      rating:  googleRating ?? undefined,
    };
    try {
      setSubmitting(true);
      if (addressId) {
        await updateAddress(addressId, payload);
      } else {
        await createAddress({ ...payload, tripId });
      }
      navigation.goBack();
    } catch (error) {
      console.error("Address submit error:", error);
      Alert.alert(t("common.error"), t("addresses.form.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const screenTitle = addressId
    ? t("addresses.form.editTitle")
    : t("addresses.form.title");

  return {
    form,
    googleRating,
    initialized,
    submitting,
    suggestions,
    loadingSuggestions,
    fetchingPlaceDetails,
    contextLoading,
    addressId,
    existingAddress,
    screenTitle,
    handleInputChange,
    handleSuggestionPress,
    handleSubmit,
    navigation,
  };
};
