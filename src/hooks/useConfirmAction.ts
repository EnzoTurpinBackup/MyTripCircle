import { Alert } from "react-native";

interface ConfirmActionOptions {
  title: string;
  message: string;
  cancelText?: string;
  confirmText: string;
  confirmStyle?: "destructive" | "default";
  onConfirm: () => Promise<void> | void;
}

/**
 * Interpose une demande de confirmation avant une action irréversible
 * (suppression d'un voyage, retrait d'un membre, départ d'un groupe).
 * Centralise l'ordre et le style des boutons afin que toutes les
 * confirmations de l'application se présentent de façon identique.
 *
 * @returns `confirm`, à appeler avec le libellé de la boîte de dialogue et
 * l'action à exécuter en cas d'accord.
 *
 * @remarks S'appuie sur `Alert.alert` de React Native, dont le rendu est natif
 * à chaque plateforme. L'appel est synchrone et ne renvoie rien : le résultat
 * du choix passe exclusivement par `onConfirm`, dont le rejet éventuel doit
 * donc être traité par l'appelant.
 */
export function useConfirmAction() {
  const confirm = ({
    title,
    message,
    cancelText = "Annuler",
    confirmText,
    confirmStyle = "destructive",
    onConfirm,
  }: ConfirmActionOptions) => {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel" },
      { text: confirmText, style: confirmStyle, onPress: onConfirm },
    ]);
  };

  return { confirm };
}
