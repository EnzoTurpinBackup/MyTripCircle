import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import BookingForm from "../components/BookingForm";
import { useTheme } from "../contexts/ThemeContext";
import { useTripDetails } from "../hooks/useTripDetails";
import TripHero from "../components/tripDetails/TripHero";
import TripStatsRow from "../components/tripDetails/TripStatsRow";
import TripProgressBar from "../components/tripDetails/TripProgressBar";
import TripDraftBanner from "../components/tripDetails/TripDraftBanner";
import TripTabBar from "../components/tripDetails/TripTabBar";
import BookingsTab from "../components/tripDetails/BookingsTab";
import AddressesTab from "../components/tripDetails/AddressesTab";
import MembersTab from "../components/tripDetails/MembersTab";
import {
  ExistingBookingPicker,
  ExistingAddressPicker,
} from "../components/tripDetails/ExistingItemPicker";
import { F } from "../theme/fonts";
import { RADIUS, SHADOW } from "../theme";
import SkeletonBox from "../components/SkeletonBox";

type TripDetailsScreenRouteProp = RouteProp<RootStackParamList, "TripDetails">;

type TripDetailsNavigationProp = StackNavigationProp<RootStackParamList, "TripDetails">;

const TripDetailsScreen: React.FC = () => {
  const route = useRoute<TripDetailsScreenRouteProp>();
  const navigation = useNavigation<TripDetailsNavigationProp>();
  const { tripId, showValidateButton = false, showToast: toastParam } = route.params;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();

  const {
    trip,
    bookings,
    addresses,
    loading,
    activeTab,
    setActiveTab,
    showBookingForm,
    setShowBookingForm,
    collaboratorUsers,
    showToast,
    setShowToast,
    toastOpacity,
    isOwner,
    userCollaborator,
    totalMembers,
    progressPercent,
    durationDays,
    daysPassed,
    handleSaveBooking,
    handleCopyBooking,
    handleCopyAddress,
    handleEditAddress,
    handleUpdateBooking,
    handleDeleteBooking,
    handleDeleteAddress,
    handleValidateTrip,
    otherBookings,
    otherAddresses,
  } = useTripDetails(tripId, toastParam);

  const [showBookingPicker, setShowBookingPicker] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  const canEdit = isOwner || userCollaborator?.permissions?.canEdit;

  const handleAddBookingPress = () => {
    if (!otherBookings.length) {
      setShowBookingForm(true);
      return;
    }
    Alert.alert(t("tripDetails.addBooking"), undefined, [
      { text: t("tripDetails.createNew"), onPress: () => setShowBookingForm(true) },
      { text: t("tripDetails.chooseExisting"), onPress: () => setShowBookingPicker(true) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const handleAddAddressPress = () => {
    Alert.alert(t("tripDetails.addAddress"), undefined, [
      { text: t("tripDetails.createNew"), onPress: () => navigation.navigate("AddressForm", { tripId }) },
      { text: t("tripDetails.chooseExisting"), onPress: () => setShowAddressPicker(true) },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="light-content" translucent />
        <ScrollView scrollEnabled={false} contentContainerStyle={s.scrollContent}>
          {/* Hero */}
          <SkeletonBox width="100%" height={220} borderRadius={0} />

          {/* Back button area */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
            {/* Trip title */}
            <SkeletonBox width="65%" height={26} borderRadius={8} />
            <SkeletonBox width="45%" height={14} borderRadius={6} />

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonBox key={i} height={80} borderRadius={14} style={{ flex: 1 }} />
              ))}
            </View>

            {/* Progress bar */}
            <SkeletonBox width="100%" height={8} borderRadius={4} />

            {/* Tab bar */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonBox key={i} height={36} borderRadius={10} style={{ flex: 1 }} />
              ))}
            </View>

            {/* List items */}
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 4 }}>
                <SkeletonBox width={44} height={44} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonBox width="60%" height={14} borderRadius={6} />
                  <SkeletonBox width="40%" height={12} borderRadius={5} />
                </View>
                <SkeletonBox width={60} height={22} borderRadius={10} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[s.errorContainer, { backgroundColor: colors.bg }]}>
        <Text style={[s.errorText, { color: colors.danger }]}>{t("tripDetails.notFound")}</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        style={[s.scroll, { backgroundColor: colors.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <TripHero
          trip={trip}
          tripId={tripId}
          isOwner={isOwner}
          canEdit={userCollaborator?.permissions?.canEdit}
          bookingsCount={bookings.length}
          addressesCount={addresses.length}
        />

        <TripStatsRow
          bookingsCount={bookings.length}
          addressesCount={addresses.length}
          totalMembers={totalMembers}
        />

        <TripProgressBar
          progressPercent={progressPercent}
          daysPassed={daysPassed}
          durationDays={durationDays}
        />

        {(showValidateButton || trip.status === "draft") && (
          <TripDraftBanner onValidate={handleValidateTrip} />
        )}

        <TripTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "bookings" && (
          <BookingsTab
            bookings={bookings}
            isOwner={isOwner}
            canEdit={userCollaborator?.permissions?.canEdit}
            onAddBooking={handleAddBookingPress}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        )}

        {activeTab === "addresses" && (
          <AddressesTab
            addresses={addresses}
            onEditAddress={handleEditAddress}
            onAddAddress={handleAddAddressPress}
            canAdd={canEdit}
            onDeleteAddress={handleDeleteAddress}
          />
        )}

        {activeTab === "members" && (
          <MembersTab
            trip={trip}
            user={user}
            isOwner={isOwner}
            userCollaborator={userCollaborator}
            collaboratorUsers={collaboratorUsers}
            onInvite={() => navigation.navigate("InviteFriends", { tripId })}
          />
        )}

        <View style={s.bottomPad} />
      </ScrollView>

      {trip && (
        <BookingForm
          visible={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          onSave={handleSaveBooking}
          tripStartDate={trip.startDate}
          tripEndDate={trip.endDate}
          preselectedTripId={tripId}
        />
      )}

      <ExistingBookingPicker
        visible={showBookingPicker}
        bookings={otherBookings}
        onSelect={(booking) => { setShowBookingPicker(false); handleCopyBooking(booking); }}
        onClose={() => setShowBookingPicker(false)}
      />

      <ExistingAddressPicker
        visible={showAddressPicker}
        addresses={otherAddresses}
        onSelect={(address) => { setShowAddressPicker(false); handleCopyAddress(address); }}
        onClose={() => setShowAddressPicker(false)}
      />

      {showToast && (
        <Animated.View style={[s.toast, { opacity: toastOpacity }]}>
          <View style={s.toastIcon}>
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </View>
          <View style={s.toastInfo}>
            <Text style={s.toastTitle}>{t("tripDetails.toastUpdatedTitle")}</Text>
            <Text style={s.toastSub}>{t("tripDetails.toastUpdatedSub")}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowToast(false)}>
            <Text style={s.toastClose}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  bottomPad: {
    height: 64,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontFamily: F.sans400,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontFamily: F.sans400,
  },
  toast: {
    position: "absolute",
    bottom: 28,
    left: 16,
    right: 16,
    backgroundColor: "#2A2318",
    borderRadius: RADIUS.card,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    ...SHADOW.strong,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#6B8C5A",
    justifyContent: "center",
    alignItems: "center",
  },
  toastInfo: { flex: 1 },
  toastTitle: {
    fontSize: 13,
    fontFamily: F.sans600,
    color: "#FFFFFF",
  },
  toastSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontFamily: F.sans400,
    marginTop: 2,
  },
  toastClose: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontFamily: F.sans400,
  },
});

export default TripDetailsScreen;
