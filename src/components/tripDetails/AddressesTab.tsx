import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Address } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import ItemActionSheet from "../ItemActionSheet";
import { tabSharedStyles as s } from "./tabSharedStyles";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

const addressStripeColor = (type: string): string => {
  switch (type) {
    case "hotel":       return "#6B8C5A";
    case "restaurant":  return "#C4714A";
    case "activity":    return "#8B70C0";
    default:            return "#5A8FAA";
  }
};

const addressIconBg = (type: string, isDark: boolean): string => {
  if (isDark) {
    switch (type) {
      case "hotel":       return "#1E2E1A";
      case "restaurant":  return "#2E1E15";
      case "activity":    return "#251E35";
      default:            return "#1A2E35";
    }
  }
  switch (type) {
    case "hotel":       return "#E2EDD9";
    case "restaurant":  return "#F5E5DC";
    case "activity":    return "#EDE8F5";
    default:            return "#DCF0F5";
  }
};

const addressIconName = (type: string): any => {
  switch (type) {
    case "hotel":       return "bed";
    case "restaurant":  return "restaurant";
    case "activity":    return "star";
    default:            return "location";
  }
};

interface Props {
  addresses: Address[];
  onEditAddress: (address: Address) => void;
  onAddAddress?: () => void;
  canAdd?: boolean;
  onDeleteAddress?: (addressId: string) => Promise<void>;
}

const AddressesTab: React.FC<Props> = ({ addresses, onEditAddress, onAddAddress, canAdd, onDeleteAddress }) => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const [actionAddress, setActionAddress] = useState<Address | null>(null);

  const handleDeletePress = () => {
    if (!actionAddress || !onDeleteAddress) return;
    const id = actionAddress.id;
    setActionAddress(null);
    Alert.alert(
      t("addresses.details.deleteTitle"),
      t("addresses.details.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => onDeleteAddress(id),
        },
      ]
    );
  };

  const handleEditPress = () => {
    if (!actionAddress) return;
    const address = actionAddress;
    setActionAddress(null);
    onEditAddress(address);
  };

  if (addresses.length === 0) {
    return (
      <View style={s.tabContent}>
        <View style={s.emptyState}>
          <Text style={[s.emptyText, { color: colors.textMid }]}>{t("tripDetails.noAddresses")}</Text>
          {canAdd && onAddAddress && (
            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onAddAddress} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[s.addBtnText, { color: colors.textMid }]}>{t("tripDetails.addAddress")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.tabContent}>
      {canAdd && onAddAddress && (
        <TouchableOpacity style={[s.addBtnTop, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onAddAddress} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={18} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[s.addBtnText, { color: colors.textMid }]}>{t("tripDetails.addAddress")}</Text>
        </TouchableOpacity>
      )}
      {addresses.map((address: Address) => {
        const stripe = addressStripeColor(address.type);
        const iconBg = addressIconBg(address.type, isDark);
        return (
          <TouchableOpacity
            key={address.id}
            style={[s.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setActionAddress(address)}
            activeOpacity={0.75}
          >
            <View style={[s.listStripe, { backgroundColor: stripe }]} />
            <View style={[s.listIconWrap, { backgroundColor: iconBg }]}>
              <Ionicons name={addressIconName(address.type)} size={22} color={stripe} {...DECORATIVE_ELEMENT_PROPS} />
            </View>
            <View style={s.listInfo}>
              <Text style={[s.listTitle, { color: colors.text }]} numberOfLines={1}>{address.name}</Text>
              <Text style={[s.listSub, { color: colors.textLight }]} numberOfLines={1}>{address.address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
          </TouchableOpacity>
        );
      })}

      <ItemActionSheet
        visible={!!actionAddress}
        title={actionAddress?.name ?? ""}
        subtitle={actionAddress?.city ? `${actionAddress.city}, ${actionAddress.country}` : undefined}
        onClose={() => setActionAddress(null)}
        onEdit={handleEditPress}
        onDelete={handleDeletePress}
        canEdit={canAdd}
        canDelete={canAdd && !!onDeleteAddress}
      />
    </View>
  );
};


export default AddressesTab;
