import { StyleSheet, View } from "react-native";
import { screen } from "@testing-library/react-native";

/**
 * Marge haute réservée à la barre de statut par le premier conteneur qui en
 * déclare une.
 *
 * Plusieurs écrans la choisissent au chargement du module
 * (`Platform.OS === "ios" ? 60 : 20`). Aucun texte ni rôle ne la porte : seule
 * la structure rendue permet de l'observer. Le même utilitaire sert dans la
 * suite iOS et dans la suite Android, ce qui vérifie qu'il désigne bien la
 * marge qui bascule d'une plateforme à l'autre.
 */
export const statusBarInset = (): number | undefined =>
  screen
    .UNSAFE_getAllByType(View)
    .map((view) => StyleSheet.flatten(view.props.style)?.paddingTop)
    .find((value) => value !== undefined) as number | undefined;
