/**
 * Formulaire de création d'un voyage : le point d'entrée du cycle de vie d'un
 * séjour dans l'application.
 *
 * Besoin couvert : poser en quelques champs l'ossature d'un projet — nom,
 * destination, période, description et portée de partage — sans avoir à décider
 * tout de suite du contenu. Le voyage est créé au statut « brouillon », les
 * réservations, adresses et membres s'ajoutant ensuite depuis la fiche.
 *
 * Position dans le parcours : atteint depuis TripsScreen, par le bouton de
 * création ou par l'invitation affichée quand la collection est vide. En
 * sortie, TripDetails remplace cet écran dans la pile — revenir sur un
 * formulaire déjà soumis n'aurait pas de sens — avec le drapeau qui met en
 * avant la validation du brouillon. L'abandon passe par une confirmation.
 *
 * Données : la totalité de l'état est tenue par useCreateTrip, qui écrit via
 * `createTrip` de TripsContext plutôt que par un appel direct à l'API, afin que
 * la liste des autres onglets soit à jour sans rechargement. Ce hook consulte
 * aussi SubscriptionContext pour le quota de voyages détenus et cherche une
 * photographie de couverture d'après la destination saisie.
 *
 * États pris en charge : envoi en cours (bouton grisé et libellé d'attente),
 * incohérence de dates (message sous les champs, la saisie restant possible),
 * hors-ligne (useOfflineDisabled neutralise le bouton), quota d'abonnement
 * atteint (proposition de souscrire plutôt qu'un refus sec). Pas d'état de
 * chargement initial : l'écran ne lit rien au montage.
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Pressable,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BackButton from "../components/ui/BackButton";
import { useTranslation } from "react-i18next";
import { formatDate } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";

import { useCreateTrip } from "../hooks/useCreateTrip";
import {
  TripDatePickerModal,
  AndroidDatePicker,
} from "../components/createTrip/TripDatePicker";
import TripVisibilityPicker from "../components/createTrip/TripVisibilityPicker";
import styles from "../components/createTrip/createTripStyles";
import { useOfflineDisabled } from "../hooks/useOfflineDisabled";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Compose le formulaire de création et délègue toute la logique à useCreateTrip.
 *
 * L'écran est déclaré sans paramètre de route et ne reçoit donc aucune prop :
 * son état vient du hook, des contextes de thème et de réseau. Effets de bord
 * notables — la saisie de la destination déclenche, après une pause, une
 * recherche réseau de photographie de couverture ; la validation appelle le
 * serveur via TripsContext puis remplace l'écran par TripDetails.
 */
const CreateTripScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { disabled: offlineDisabled, style: offlineStyle } = useOfflineDisabled();

  const {
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
  } = useCreateTrip();

  const titleInputRef = useRef<TextInput>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // Table construite à chaque rendu et non hissée hors du composant : les
  // libellés dépendent de la langue courante, qu'une constante de module figerait
  // à la valeur active au chargement du fichier.
  const VISIBILITY_LABELS: Record<string, string> = {
    private: t("createTrip.visibilityPrivate"),
    friends: t("createTrip.visibilityFriends"),
    public: t("createTrip.visibilityPublic"),
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} />
      {/* iOS remonte la vue au-dessus du clavier, Android redimensionne : les
          deux plateformes n'exposent pas le même comportement natif et le
          « padding » iOS produit sur Android un décalage résiduel. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
       {/* Toucher hors d'un champ referme le clavier : le formulaire ne
           défilant pas, un clavier ouvert masquerait le bouton de création. */}
       <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <BackButton onPress={handleCancel} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("createTrip.screenTitle")}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Formulaire ── */}
        {/* Défilement désactivé : les cinq champs tiennent dans un écran, et le
            laisser actif ferait rebondir la vue à chaque ouverture du clavier,
            déjà compensée par KeyboardAvoidingView. */}
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
        >
          {/* 1. Nom du voyage */}
          {/* Les trois champs texte sont enveloppés d'un Pressable qui redonne le
              focus à leur saisie : la cible tactile devient la carte entière et
              non la seule ligne de texte, étroite tant qu'elle est vide. */}
          <Pressable
            onPress={() => titleInputRef.current?.focus()}
            style={[
              styles.fieldBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
              {t("createTrip.tripNameLabel")}
            </Text>
            <TextInput
              ref={titleInputRef}
              style={[styles.fieldInput, { color: colors.text }]}
              value={formData.title}
              onChangeText={(v) => handleInputChange("title", v)}
              placeholder={t("createTrip.tripNamePlaceholder")}
              placeholderTextColor={colors.textLight}
              maxLength={100}
            />
          </Pressable>

          {/* 2. Destination principale */}
          <Pressable
            onPress={() => destinationInputRef.current?.focus()}
            style={[
              styles.fieldBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
              {t("createTrip.mainDestination")}
            </Text>
            <View style={styles.destRow}>
              <Text style={styles.destPin}>📍</Text>
              <TextInput
                ref={destinationInputRef}
                style={[styles.destInput, { color: colors.text }]}
                value={formData.destination}
                onChangeText={(v) => handleInputChange("destination", v)}
                placeholder={t("createTrip.destinationPlaceholder")}
                placeholderTextColor={colors.textLight}
                maxLength={100}
              />
            </View>
          </Pressable>

          {/* 3. Dates — côte à côte */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[
                styles.fieldBox,
                styles.dateBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowStartDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
                {t("createTrip.departureDateLabel")}
              </Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDate(formData.startDate)}
              </Text>
            </TouchableOpacity>

            <View style={styles.dateGap} />

            <TouchableOpacity
              style={[
                styles.fieldBox,
                styles.dateBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowEndDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
                {t("createTrip.returnDateLabel")}
              </Text>
              <Text style={[styles.dateValue, { color: colors.text }]}>
                {formatDate(formData.endDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur de date */}
          {/* Une date de retour antérieure au départ est signalée sans bloquer :
              l'utilisateur est probablement en train de corriger l'autre borne,
              et le refus définitif n'intervient qu'à la validation. */}
          {dateError && (
            <Text style={styles.dateErrorText}>{dateError}</Text>
          )}

          {/* Modales iOS pour les dates */}
          {/* iOS présente une roulette persistante que l'on confirme, Android un
              dialogue système qui se referme seul : d'où deux implémentations,
              celle d'Android étant montée hors du défilement et seulement le
              temps du choix. */}
          {Platform.OS === "ios" && (
            <>
              <TripDatePickerModal
                type="start"
                value={formData.startDate}
                visible={showStartDatePicker}
                colors={colors}
                onChange={(event, date) => handleDateChange(event, date, "start")}
                onClose={() => setShowStartDatePicker(false)}
                onConfirm={() => setShowStartDatePicker(false)}
              />
              <TripDatePickerModal
                type="end"
                value={formData.endDate}
                visible={showEndDatePicker}
                colors={colors}
                onChange={(event, date) => handleDateChange(event, date, "end")}
                onClose={() => setShowEndDatePicker(false)}
                onConfirm={() => setShowEndDatePicker(false)}
              />
            </>
          )}

          {/* 4. Description (optionnelle) */}
          <Pressable
            onPress={() => descriptionInputRef.current?.focus()}
            style={[
              styles.fieldBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
              {t("createTrip.descriptionLabel")}
            </Text>
            <TextInput
              ref={descriptionInputRef}
              style={[styles.fieldInput, styles.descInput, { color: colors.text }]}
              value={formData.description}
              onChangeText={(v) => handleInputChange("description", v)}
              placeholder={t("createTrip.descriptionPlaceholder")}
              placeholderTextColor={colors.textLight}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </Pressable>

          {/* 5. Visibilité */}
          <View
            style={[
              styles.fieldBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>
              {t("createTrip.visibilityLabel")}
            </Text>
            <TouchableOpacity
              style={styles.visibilityRow}
              onPress={() => setShowVisibilityPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.visibilityText, { color: colors.text }]}>
                {VISIBILITY_LABELS[formData.visibility]}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>
          </View>

          {/* Modale de visibilité */}
          <TripVisibilityPicker
            visible={showVisibilityPicker}
            currentVisibility={formData.visibility}
            colors={colors}
            onSelect={handleVisibilityChange}
            onClose={() => setShowVisibilityPicker(false)}
          />

          {/* ── Bouton principal ── */}
          {/* Même rendu grisé pour deux causes : envoi déjà en cours (double
              soumission) et absence de réseau, la création n'étant pas différable. */}
          <TouchableOpacity
            style={[styles.primaryButton, (loading || offlineDisabled) && styles.primaryButtonDisabled, offlineStyle]}
            onPress={handleCreate}
            disabled={loading || offlineDisabled}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? t("createTrip.creating") : t("createTrip.createButton")}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Pickers Android inline */}
        {Platform.OS === "android" && showStartDatePicker && (
          <AndroidDatePicker
            value={formData.startDate}
            onChange={(event, date) => handleDateChange(event, date, "start")}
          />
        )}
        {Platform.OS === "android" && showEndDatePicker && (
          <AndroidDatePicker
            value={formData.endDate}
            onChange={(event, date) => handleDateChange(event, date, "end")}
          />
        )}
       </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateTripScreen;
