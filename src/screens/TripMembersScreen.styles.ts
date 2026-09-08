/**
 * Styles de l'écran d'administration des membres d'un voyage, extraits dans un
 * module distinct : l'écran combine une liste, une carte de lien d'invitation et
 * une feuille d'actions modale, et garder cette feuille de styles à sa suite le
 * ferait dépasser la taille maximale admise par les conventions du dépôt.
 *
 * Les familles suivent les zones de l'écran : mise en page générale (`safe`,
 * `content`) et en-tête avec son bouton d'invitation ; carte du lien de partage
 * (`link*`, `copyBtn`, `expiryTxt`) ; lignes de membres (`mc`, `avatar`, `mn`,
 * `ms`, `meTag`, `mcSelected`, `rowChevron`, `cancelTxt`) ; bouton d'ajout en
 * pied de liste (`addBtn*`) ; enfin voile de chargement et feuille d'actions
 * (`backdrop`, `sheet*`).
 *
 * Les couleurs sont ici celles du thème clair. Les composants qui en dépendent
 * les recouvrent au rendu par les valeurs de ThemeContext ; celles inscrites
 * dans ce fichier ne servent que de valeurs par défaut pour les propriétés que
 * l'écran ne surcharge pas.
 */

import { StyleSheet } from "react-native";
import { F } from "../theme/fonts";
import { COLORS as C } from "../theme/colors";

export const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.sandLight },
  content: { paddingHorizontal: 13, paddingBottom: 40, paddingTop: 6 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8,
    backgroundColor: C.sandLight,
  },
  headerSub:   { fontFamily: F.sans400, fontSize: 14, color: C.inkLight, textAlign: "center" },
  headerTitle: { fontFamily: F.sans700, fontSize: 20, textAlign: "center" },
  inviteBtn: {
    backgroundColor: C.terra, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    shadowColor: C.terra, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 3,
  },
  inviteBtnTxt: { fontFamily: F.sans600, fontSize: 11, color: C.white },

  linkCard: { borderRadius: 11, borderWidth: 1, padding: 10, marginBottom: 10 },
  linkTitle: { fontFamily: F.sans600, fontSize: 10, marginBottom: 5 },
  linkRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  linkUrl: {
    flex: 1, fontFamily: F.sans400, fontSize: 10,
    borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4,
  },
  copyBtn:    { backgroundColor: C.terra, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  copyBtnTxt: { fontFamily: F.sans600, fontSize: 10, color: C.white },
  expiryTxt:  { fontFamily: F.sans400, fontSize: 9.5 },

  sec: {
    fontFamily: F.sans600,
    fontSize: 10, color: C.inkLight,
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingTop: 2, paddingBottom: 5,
  },

  mc: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.white,
    borderRadius: 11, borderWidth: 1, borderColor: C.sandDark,
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 5,
  },
  avatar:    { borderRadius: 999, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarTxt: { fontFamily: F.sans600, color: C.white },
  mn: { fontFamily: F.sans600, fontSize: 13, color: C.ink },
  ms: { fontFamily: F.sans400, fontSize: 11, color: C.inkLight, marginTop: 1 },

  meTag:    { backgroundColor: C.terraLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  meTagTxt: { fontFamily: F.sans600, fontSize: 10, color: C.terra },

  mcSelected: {
    backgroundColor: "rgba(196,113,74,0.06)",
    borderColor: "rgba(196,113,74,0.35)",
    borderWidth: 1.5,
  },

  rowChevron: { fontSize: 18, color: C.sandDark, fontFamily: F.sans300, marginLeft: 2 },
  cancelTxt:  { fontFamily: F.sans600, fontSize: 11, color: C.danger },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: C.sandDark,
    borderRadius: 11, paddingVertical: 9, paddingHorizontal: 10,
    backgroundColor: C.sand, marginTop: 6,
  },
  addBtnIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.terraLight, alignItems: "center", justifyContent: "center",
  },
  addBtnTxt: { fontFamily: F.sans400, fontSize: 12, color: C.inkLight },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(253,250,245,0.65)",
    alignItems: "center", justifyContent: "center",
  },

  backdrop: { backgroundColor: "rgba(42,35,24,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.sandLight,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 30,
    shadowColor: C.ink, shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18, shadowRadius: 28, elevation: 20,
  },
  sheetHandle: {
    width: 32, height: 3, borderRadius: 20,
    backgroundColor: C.sandDark, alignSelf: "center", marginBottom: 12,
  },
  sheetId: {
    flexDirection: "row", alignItems: "center", gap: 9,
    paddingBottom: 10, borderBottomWidth: 1, borderColor: C.sandDark, marginBottom: 10,
  },
  sheetName:  { fontFamily: F.sans600, fontSize: 13, color: C.ink },
  sheetEmail: { fontFamily: F.sans400, fontSize: 10, color: C.inkMid, marginTop: 1 },
  sheetRole:  { fontFamily: F.sans400, fontSize: 10, color: C.inkLight, marginTop: 1 },

  sheetRow: {
    flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: C.sandMid, borderRadius: 11,
    paddingVertical: 9, paddingHorizontal: 11,
  },
  sheetRowDanger: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1, borderColor: "rgba(192,64,64,0.15)",
  },
  sheetIcon:     { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sheetRowLabel: { fontFamily: F.sans600, fontSize: 12, color: C.ink },
  sheetRowSub:   { fontFamily: F.sans400, fontSize: 9.5, color: C.inkLight, marginTop: 1 },
});
