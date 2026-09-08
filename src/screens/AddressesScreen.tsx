/**
 * Écran du carnet d'adresses, quatrième onglet de l'application.
 *
 * Besoin couvert : rassembler les lieux repérés pour un séjour — hôtel,
 * restaurants, activités, transports — et pouvoir les situer les uns par
 * rapport aux autres. La liste répond à « qu'ai-je noté ? », l'aperçu
 * cartographique à « où est-ce ? ».
 *
 * Position dans le parcours : onglet Addresses de MainTabs, atteint par la
 * barre d'onglets ou par balayage depuis Ideas ou Profile. En sortie,
 * AddressForm et FullMap. Toucher une fiche n'ouvre pas le détail mais une
 * feuille d'actions proposant modification et suppression.
 *
 * Données : tout provient de useAddresses, qui lit la collection de
 * TripsContext et la rafraîchit à chaque prise de focus, convertit les adresses
 * textuelles en coordonnées via le géocodeur Nominatim, et calcule le cadrage
 * de l'aperçu : la position de l'appareil si useCurrentLocation la connaît,
 * sinon l'emprise des lieux déjà géocodés, sinon une vue large. L'état du
 * réseau vient de useOfflineDisabled.
 *
 * États pris en charge : chargement (squelette), carnet vide et carnet filtré
 * sans résultat (deux messages distincts), géocodage en cours (indicateur porté
 * par l'aperçu), cartographie native absente (l'aperçu affiche un substitut, la
 * liste reste entière), hors-ligne (créations neutralisées). Un échec de
 * rafraîchissement est absorbé par TripsContext, qui conserve la collection.
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SwipeToNavigate } from "../hooks/useSwipeToNavigate";
import { useAddresses } from "../hooks/useAddresses";
import AddressCard from "../components/addresses/AddressCard";
import AddressFilterBar from "../components/addresses/AddressFilterBar";
import AddressMapWidget from "../components/addresses/AddressMapWidget";
import ItemActionSheet from "../components/ItemActionSheet";
import { styles } from "../components/addresses/addressStyles";
import SkeletonBox from "../components/SkeletonBox";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { useAuth } from "../contexts/AuthContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose la vue du carnet d'adresses.
 *
 * Monté par le navigateur d'onglets, l'écran ne reçoit aucune prop de route :
 * son état entier vient de useAddresses. Effets de bord notables — le hook
 * redemande la collection à chaque prise de focus et géocode par le réseau les
 * adresses dont la position est inconnue ; la suppression passe par une alerte
 * système de confirmation.
 */
const AddressesScreen: React.FC = () => {
  const {
    t,
    colors,
    isDark,
    addresses,
    loading,
    selectedFilter,
    setSelectedFilter,
    mapCoords,
    isGeocoding,
    widgetRegion,
    filteredAddresses,
    eyebrow,
    actionAddress,
    setActionAddress,
    handleAddressPress,
    handleEditAddress,
    handleDeleteAddress,
    handleAddAddress,
    handleOpenFullMap,
  } = useAddresses();

  const handleDeletePress = () => {
    if (!actionAddress) return;
    // L'identifiant est capturé et la feuille refermée avant d'ouvrir l'alerte :
    // sur iOS, deux surfaces modales superposées empêchent l'alerte de
    // s'afficher, et la fermeture vide actionAddress avant la confirmation.
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
          onPress: () => handleDeleteAddress(id),
        },
      ]
    );
  };
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Même règle que sur la fiche de détail : une adresse rattachée à un voyage
  // partagé est visible par tous ses membres mais ne se modifie que par celui
  // qui l'a ajoutée. Sans ces deux drapeaux, ItemActionSheet retombe sur ses
  // valeurs par défaut (true) et proposerait modification et suppression sur
  // l'adresse d'un autre membre.
  const isActionAddressOwner = actionAddress?.userId === user?.id;
  // La barre d'onglets flotte au-dessus de la liste : sans cette réserve, la
  // dernière adresse resterait masquée. Le plancher de 12 points préserve une
  // marge sur les appareils sans encoche, où l'inset bas vaut zéro.
  const tabBarClearance = 78 + Math.max(insets.bottom, 12);
  const listPaddingBottom = tabBarClearance + 24;

  // Le squelette reproduit la silhouette de l'écran chargé pour que l'arrivée
  // des vraies données ne déplace pas la mise en page. Le défilement y est
  // coupé : il n'y a rien à atteindre plus bas.
  if (loading) {
    return (
      // L'index 3 correspond au rang de l'onglet Addresses dans MainTabs et
      // détermine vers quels onglets voisins le balayage horizontal renvoie.
      <SwipeToNavigate currentIndex={3} totalTabs={5}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
          <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
          <ScrollView scrollEnabled={false} contentContainerStyle={{ paddingBottom: listPaddingBottom }}>
            {/* Header */}
            <View style={[styles.header]}>
              <View style={styles.headerLeft}>
                <SkeletonBox width={80} height={11} borderRadius={5} style={{ marginBottom: 6 }} />
                <SkeletonBox width={180} height={26} borderRadius={8} />
              </View>
              <SkeletonBox width={44} height={44} borderRadius={22} />
            </View>

            {/* Filter chips */}
            <View style={{ flexDirection: "row", paddingHorizontal: 24, gap: 8, marginBottom: 12 }}>
              {[{ id: "f1", w: 60 }, { id: "f2", w: 80 }, { id: "f3", w: 70 }, { id: "f4", w: 65 }].map(({ id, w }) => (
                <SkeletonBox key={id} width={w} height={32} borderRadius={999} />
              ))}
            </View>

            {/* Map widget */}
            <SkeletonBox
              width="100%"
              height={130}
              borderRadius={16}
              style={{ marginHorizontal: 16, alignSelf: "center", width: undefined, marginBottom: 12 }}
            />

            {/* Address cards */}
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: colors.bgMid, paddingHorizontal: 18, paddingVertical: 20 }}
                >
                  <SkeletonBox width={58} height={58} borderRadius={14} style={{ marginRight: 16 }} />
                  <View style={{ flex: 1, gap: 10, marginRight: 10 }}>
                    <SkeletonBox width="60%" height={16} borderRadius={6} />
                    <SkeletonBox width="80%" height={13} borderRadius={5} />
                  </View>
                  <SkeletonBox width={56} height={30} borderRadius={999} />
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </SwipeToNavigate>
    );
  }

  return (
    <SwipeToNavigate currentIndex={3} totalTabs={5}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
        <View style={[styles.container, { backgroundColor: colors.bg }]}>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {eyebrow ? (
                <Text style={[styles.headerEyebrow, { color: colors.textLight }]} numberOfLines={1}>
                  {eyebrow}
                </Text>
              ) : null}
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t("addresses.header")}
              </Text>
            </View>
            {/* Créer suppose un appel serveur : hors ligne la commande est
                grisée plutôt que masquée, l'en-tête gardant sa mise en page. */}
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.terra }, offlineStyle]}
              onPress={handleAddAddress}
              disabled={offlineDisabled}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("addresses.addAddress")}
              accessibilityState={{ disabled: offlineDisabled }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <AddressFilterBar
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
            colors={colors}
            t={t}
          />

          {/* L'aperçu reçoit la collection complète et non filteredAddresses :
              il sert de repère géographique global et mène à FullMap, qui
              reprend son propre filtrage à zéro. */}
          <AddressMapWidget
            addresses={addresses}
            mapCoords={mapCoords}
            isGeocoding={isGeocoding}
            widgetRegion={widgetRegion}
            onOpenFullMap={handleOpenFullMap}
          />

          {filteredAddresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.terraLight }]}>
                <Ionicons name="map-outline" size={52} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t("addresses.emptyTitle")}
              </Text>
              {/* Un filtre sans résultat nomme la catégorie concernée, pour que
                  l'utilisateur comprenne que ses autres adresses subsistent. */}
              <Text style={[styles.emptySubtitle, { color: colors.textMid }]}>
                {selectedFilter === "all"
                  ? t("addresses.emptyAll")
                  : t("addresses.emptyFiltered", {
                      type: t(`addresses.filters.${selectedFilter}`),
                    })}
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.terra }, offlineStyle]}
                onPress={handleAddAddress}
                disabled={offlineDisabled}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                  {...DECORATIVE_ELEMENT_PROPS}
                />
                <Text style={styles.createButtonText}>
                  {t("addresses.addAddress")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredAddresses}
              renderItem={({ item }) => (
                <AddressCard
                  item={item}
                  colors={colors}
                  isDark={isDark}
                  t={t}
                  onPress={handleAddressPress}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Rendue hors du conteneur principal pour se superposer aussi bien à
            la liste qu'à l'état vide. */}
        <ItemActionSheet
          visible={!!actionAddress}
          title={actionAddress?.name ?? ""}
          subtitle={actionAddress ? `${actionAddress.city}, ${actionAddress.country}` : undefined}
          onClose={() => setActionAddress(null)}
          onEdit={handleEditAddress}
          onDelete={handleDeletePress}
          canEdit={isActionAddressOwner}
          canDelete={isActionAddressOwner}
        />
      </SafeAreaView>
    </SwipeToNavigate>
  );
};

export default AddressesScreen;
