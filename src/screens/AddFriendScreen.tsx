/**
 * Écran de recherche nominative d'un futur ami, à partir d'une adresse
 * électronique ou d'un numéro de téléphone.
 *
 * Besoin couvert : retrouver le compte d'une personne connue hors de
 * l'application, vérifier qu'il s'agit bien d'elle, et lui adresser une demande
 * d'amitié. À défaut de recherche en cours, l'écran propose les suggestions du
 * serveur.
 *
 * Position dans le parcours : atteint par le bouton d'ajout de FriendsScreen.
 * En sortie, FriendProfile pour examiner une fiche avant de se décider, et
 * FriendRequestConfirmation une fois la demande partie.
 *
 * Données : la recherche interroge directement ApiService, sans passer par un
 * contexte, le résultat n'ayant pas vocation à être conservé ; l'envoi de la
 * demande et la liste de suggestions viennent de FriendsContext, qui met à jour
 * les listes de FriendsScreen. L'historique des recherches est tenu par
 * useSearchHistory, qui le persiste dans le stockage local.
 *
 * États pris en charge : recherche en cours, compte introuvable ou saisie
 * correspondant à son propre compte (message explicite), résultat trouvé (carte
 * avec envoi et accès à la fiche), aucune suggestion disponible, envoi en cours
 * (les cartes désactivent leur bouton). Une saisie qui n'a la forme ni d'une
 * adresse ni d'un numéro n'entraîne aucun appel et laisse l'écran en l'état.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ApiService } from "../services/ApiService";
import { useFriends } from "../contexts/FriendsContext";
import { useTranslation } from "react-i18next";
import { F } from "../theme/fonts";
import { parseApiError } from "../utils/i18n";
import { useTheme } from "../contexts/ThemeContext";
import SearchResultCard from "../components/addFriend/SearchResultCard";
import SuggestionCard from "../components/addFriend/SuggestionCard";
import SearchBarWithHistory from "../components/addFriend/SearchBarWithHistory";
import useSearchHistory from "../hooks/useSearchHistory";
import BackButton from "../components/ui/BackButton";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

/**
 * Reconnaît la nature de la saisie pour choisir le critère de recherche. Le
 * champ est unique à dessein — l'utilisateur n'a pas à déclarer au préalable
 * s'il tape une adresse ou un numéro — et un retour `null` signifie que la
 * saisie est encore incomplète : aucune requête n'est alors lancée.
 */
const detectContactType = (input: string): "email" | "phone" | null => {
  const t = input.trim();
  if (/^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/.test(t)) return "email";
  // Les séparateurs sont retirés avant la comparaison : un numéro est copié
  // depuis un carnet d'adresses ou dicté avec des espaces, des points ou des
  // parenthèses, mises en forme qui ne changent rien au numéro lui-même.
  if (/^\+?\d{1,4}[-\s.]?\d{1,4}[-\s.]?\d{6,15}$/.test(t.replaceAll(/[\s\-()]/g, ""))) return "phone"; // NOSONAR
  return null;
};

/**
 * Compose l'écran de recherche et d'envoi d'une demande d'amitié.
 *
 * L'écran est poussé sans paramètre de route ; la saisie, le résultat de
 * recherche et les indicateurs d'attente sont locaux, les suggestions et
 * l'envoi venant de FriendsContext. Effets de bord notables — il demande les
 * suggestions au montage, interroge le serveur après une pause de saisie,
 * écrit chaque recherche aboutie dans le stockage local, et remplace l'écran
 * courant par la confirmation une fois la demande partie.
 */
const AddFriendScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { sendFriendRequest, suggestions, refreshSuggestions } = useFriends();
  const { colors } = useTheme();
  const { history, saveToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { refreshSuggestions(); }, []);

  const handleInputChange = (text: string) => {
    setInput(text);
    setSearchResult(null);
    setSearchError(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const trimmed = text.trim();
    if (!trimmed) return;
    const type = detectContactType(trimmed);
    if (!type) return;
    // Six cents millisecondes après la dernière frappe : assez pour qu'une
    // adresse tapée d'un trait ne produise qu'un seul appel.
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await ApiService.lookupUser(
          type === "email" ? { email: trimmed } : { phone: trimmed }
        );
        setSearchResult(result);
        // Seules les recherches abouties entrent dans l'historique : reproposer
        // une saisie qui n'a rien donné n'aiderait pas l'utilisateur.
        saveToHistory(trimmed);
      } catch (e: any) {
        // Le message d'erreur arrive encapsulé en JSON ou en texte brut selon
        // la couche qui l'a produit ; le repli lit le message tel quel.
        const msg = (() => { try { return JSON.parse(e.message)?.error; } catch { return e.message; } })();
        // Deux cas seulement sont explicités : compte inconnu et recherche de
        // son propre compte. Toute autre défaillance laisse searchError nul et
        // l'écran sans message.
        if (msg?.includes("not found") || msg?.includes("404")) setSearchError(t("addFriend.errorNotFound"));
        else if (msg?.includes("yourself")) setSearchError(t("addFriend.errorYourself"));
        setSearchResult(null);
      } finally {
        setSearching(false);
      }
    }, 600);
  };

  const handleSend = async (recipientEmail?: string, recipientPhone?: string, overrideName?: string) => {
    const trimmed = input.trim();
    const type = detectContactType(trimmed);
    try {
      setSending(true);
      // L'adresse transmise par l'appelant prime sur la saisie : une carte de
      // suggestion désigne un compte précis, indépendamment du champ.
      let requestPayload: { recipientEmail?: string; recipientPhone?: string };
      if (recipientEmail) {
        requestPayload = { recipientEmail };
      } else if (type === "email") {
        requestPayload = { recipientEmail: trimmed };
      } else {
        requestPayload = { recipientPhone: trimmed };
      }
      const res = await sendFriendRequest(requestPayload);
      const name = overrideName ?? searchResult?.name ?? trimmed;
      const email = recipientEmail ?? searchResult?.email ?? (type === "email" ? trimmed : undefined);
      // replace et non navigate : revenir en arrière depuis la confirmation
      // doit ramener à la liste d'amis, non à une recherche déjà consommée.
      navigation.replace("FriendRequestConfirmation", {
        recipientName: name,
        recipientEmail: email,
        autoAccepted: !!res?.autoAccepted,
      });
    } catch (err: unknown) {
      Alert.alert(t("common.error"), parseApiError(err) || t("addFriend.errorDefault"));
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setFocused(false); }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />

        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("addFriend.title")}</Text>
        </View>

        <SearchBarWithHistory
          input={input}
          onInputChange={handleInputChange}
          focused={focused}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          history={history}
          onHistorySelect={(item) => { setFocused(false); handleInputChange(item); }}
          onHistoryRemove={removeFromHistory}
          onHistoryClear={clearHistory}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {searching && (
            <View style={styles.centerRow}>
              <ActivityIndicator color={colors.terra} size="small" />
              <Text style={[styles.searchingText, { color: colors.textLight }]}>{t("addFriend.searching")}</Text>
            </View>
          )}

          {searchError && !searching && (
            <View style={styles.notFoundBox}>
              <Ionicons name="person-outline" size={30} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[styles.notFoundText, { color: colors.textLight }]}>{searchError}</Text>
            </View>
          )}

          {searchResult && !searching && (
            <SearchResultCard
              result={searchResult}
              sending={sending}
              onSend={() => handleSend()}
              onViewProfile={() =>
                navigation.navigate("FriendProfile", { friendId: searchResult.id, friendName: searchResult.name })
              }
            />
          )}

          {/* Les suggestions ne s'affichent qu'à champ vide : elles feraient
              sinon concurrence au résultat que l'utilisateur attend. */}
          {!input.trim() && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textLight }]}>
                {t("addFriend.sectionSuggestions")}
              </Text>
              {suggestions.length === 0 ? (
                <View style={styles.notFoundBox}>
                  <Ionicons name="people-outline" size={30} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
                  <Text style={[styles.notFoundText, { color: colors.textLight }]}>
                    {t("addFriend.noSuggestions")}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={suggestions}
                  renderItem={({ item }) => (
                    <SuggestionCard
                      item={item}
                      sending={sending}
                      onSend={handleSend}
                      onViewProfile={(id, name) =>
                        navigation.navigate("FriendProfile", { friendId: id, friendName: name })
                      }
                    />
                  )}
                  keyExtractor={(item) => item.id}
                  // Défilement délégué au ScrollView parent : deux zones
                  // défilantes imbriquées rendraient le geste imprévisible.
                  scrollEnabled={false}
                />
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 60, paddingTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 20, fontFamily: F.sans700 },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchingText: { fontSize: 14, fontFamily: F.sans400 },
  notFoundBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
    marginHorizontal: 20,
  },
  notFoundText: { fontSize: 14, fontFamily: F.sans400, textAlign: "center" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: F.sans600,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginHorizontal: 20,
    marginBottom: 10,
  },
});

export default AddFriendScreen;
