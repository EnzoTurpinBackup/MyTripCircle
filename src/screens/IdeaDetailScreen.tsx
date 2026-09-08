/**
 * Fiche détaillée d'une idée de voyage du catalogue.
 *
 * Besoin couvert : juger si une destination proposée convient — durée
 * conseillée, exigence physique, programme jour par jour — puis la reprendre
 * comme point de départ d'un vrai séjour, sans ressaisir son contenu.
 *
 * Position dans le parcours : atteint depuis la grille de l'onglet Ideas ;
 * l'identifiant de l'idée est le seul paramètre de route. En sortie,
 * TripDetails une fois le voyage créé, ou retour à la grille.
 *
 * Données : useIdeaDetail retrouve l'idée dans le catalogue local à partir de
 * l'identifiant de route ; nom et pays viennent des fichiers de traduction, le
 * programme et les réservations suggérées du catalogue lui-même. La création
 * s'appuie sur createTrip, createBooking et createAddress de TripsContext,
 * chaque suggestion interrogeant PlacesService pour obtenir une adresse réelle ;
 * AuthContext fournit le propriétaire du voyage.
 *
 * États pris en charge : idée introuvable (message et bouton de retour seuls),
 * création en cours, échec de création (alerte, fenêtre maintenue). L'échec
 * d'une suggestion isolée n'interrompt pas la création : le voyage est produit
 * avec ce qui a pu être obtenu, à charge de le compléter ensuite.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BackButton from "../components/ui/BackButton";
import { useIdeaDetail } from "../hooks/useIdeaDetail";
import IdeaHero from "../components/ideaDetail/IdeaHero";
import IdeaChips from "../components/ideaDetail/IdeaChips";
import IdeaItinerary from "../components/ideaDetail/IdeaItinerary";
import AddToTripModal from "../components/ideaDetail/AddToTripModal";
import { F } from "../theme/fonts";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose la fiche d'une idée de voyage.
 *
 * L'écran ne reçoit rien du parent : `route.params.ideaId` est lu par
 * useIdeaDetail, qui en tire l'idée à présenter. Effets de bord notables —
 * création en chaîne d'un voyage, de ses réservations et de ses adresses, avec
 * appel au service de lieux pour chacune, puis navigation vers ce voyage.
 */
const IdeaDetailScreen: React.FC = () => {
  const {
    navigation,
    idea,
    lang,
    colors,
    isDark,
    t,
    destinationName,
    destinationCountry,
    customDays,
    changeCustomDays,
    startDate,
    setStartDate,
    endDate,
    showDatePicker,
    setShowDatePicker,
    modalVisible,
    tripTitle,
    setTripTitle,
    creating,
    backdropOpacity,
    sheetTranslateY,
    openModal,
    closeModal,
    handleCreate,
    formatDate,
  } = useIdeaDetail();

  // Le catalogue est constant : une idée absente signale un identifiant de
  // route périmé. Le bouton de retour est maintenu pour ne pas piéger l'écran.
  if (!idea) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.bg }]}>
        <BackButton onPress={() => navigation.goBack()} style={s.backBtn} />
        <View style={s.errorContainer}>
          <Text style={[s.errorText, { color: colors.textLight }]}>
            {t("ideas.detail.notFound")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Barre d'état translucide et en clair : la photographie de couverture
          s'étend derrière elle, et des icônes sombres y seraient illisibles. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        <IdeaHero
          ideaId={idea.id}
          name={destinationName}
          country={destinationCountry}
          onBack={() => navigation.goBack()}
        />

        <IdeaChips
          customDays={customDays}
          difficulty={idea.difficulty}
          colors={colors}
          // Bornes de garde seulement : useIdeaDetail resserre ensuite le
          // maximum sur la longueur réelle du programme proposé, au-delà de
          // laquelle il n'y aurait plus de journée à afficher.
          onDecrement={() => changeCustomDays((d) => Math.max(1, d - 1))}
          onIncrement={() => changeCustomDays((d) => Math.min(30, d + 1))}
        />

        <IdeaItinerary
          idea={idea}
          lang={lang as "fr" | "en"}
          customDays={customDays}
          colors={colors}
        />
      </ScrollView>

      {/* Appel à l'action ancré hors du défilement, atteignable où qu'on soit
          dans le programme ; le rembourrage bas du contenu lui réserve sa place. */}
      <View style={[s.ctaContainer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.ctaBtn} onPress={openModal} activeOpacity={0.88}>
          <LinearGradient
            colors={["#C4714A", "#A85A38"]}
            style={s.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" {...DECORATIVE_ELEMENT_PROPS} />
            <Text style={s.ctaBtnText}>{t("ideas.detail.addToTrips")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AddToTripModal
        visible={modalVisible}
        destinationName={destinationName}
        customDays={customDays}
        tripTitle={tripTitle}
        startDate={startDate}
        endDate={endDate}
        showDatePicker={showDatePicker}
        creating={creating}
        backdropOpacity={backdropOpacity}
        sheetTranslateY={sheetTranslateY}
        colors={colors}
        isDark={isDark}
        onClose={closeModal}
        onChangeTripTitle={setTripTitle}
        onOpenDatePicker={() => setShowDatePicker(true)}
        onCloseDatePicker={() => setShowDatePicker(false)}
        // Le sélecteur de date natif rappelle son gestionnaire sans valeur
        // lorsque l'utilisateur annule : la date en place est alors conservée.
        onChangeDate={(date) => { if (date) setStartDate(date); }}
        onCreate={handleCreate}
        formatDate={formatDate}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    // Marge basse plus généreuse sur iOS : l'indicateur d'accueil y occupe le
    // bord de l'écran et recouvrirait le bouton.
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: { borderRadius: 28, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 28,
  },
  ctaBtnText: { fontFamily: F.sans700, fontSize: 16, color: "#FFFFFF" },
  safeArea: { flex: 1 },
  backBtn: {
    marginTop: 10,
  },
  errorContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontFamily: F.sans400, fontSize: 15 },
});

export default IdeaDetailScreen;
