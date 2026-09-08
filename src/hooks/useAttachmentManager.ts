import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

/**
 * Pièce jointe d'une réservation, désignée par son emplacement local tant
 * qu'elle n'est pas téléversée. Le type distingue les deux rendus possibles :
 * vignette pour une image, icône de document pour un PDF.
 */
export type Attachment = { uri: string; name: string; type: "image" | "pdf" };

const excludeIndex = (index: number) => (_: Attachment, i: number): boolean => i !== index;

interface UseAttachmentManagerReturn {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  renamingIndex: number | null;
  setRenamingIndex: React.Dispatch<React.SetStateAction<number | null>>;
  renameValue: string;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
  handlePickImage: () => Promise<void>;
  handlePickDocument: () => Promise<void>;
  handleOpenRename: (index: number) => void;
  handleConfirmRename: () => void;
  handleRemoveAttachment: (index: number) => void;
}

/**
 * Gère les justificatifs joints à une réservation : ajout depuis la
 * photothèque ou les fichiers, renommage et retrait. Un billet ou une
 * confirmation d'hôtel doit rester consultable dans l'application, y compris
 * hors connexion.
 *
 * @param t Fonction de traduction fournie par l'écran, les messages système
 * devant suivre la langue choisie.
 * @returns La liste des pièces jointes et son accesseur, l'état de la saisie de
 * renommage, et les gestionnaires d'ajout, de renommage et de suppression.
 *
 * @remarks L'ajout d'un fichier unique ouvre aussitôt le renommage : un nom
 * d'appareil photo ne dit rien du document, alors qu'un ajout multiple rendrait
 * la sollicitation pénible. Le renommage ne porte que sur le radical,
 * l'extension d'origine étant conservée pour que le fichier reste ouvrable. Les
 * images sont recompressées à la sélection, les photos brutes des appareils
 * récents étant trop lourdes pour un envoi en itinérance.
 */
const useAttachmentManager = (t: (key: string) => string): UseAttachmentManagerReturn => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const appendAttachments = (newItems: Attachment[]) => {
    setAttachments((prev) => {
      if (newItems.length === 1) { setRenameValue(""); setRenamingIndex(prev.length); }
      return [...prev, ...newItems];
    });
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("common.error"), t("bookings.permissionDenied"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", allowsMultipleSelection: true, quality: 0.7, exif: false, base64: false,
      });
      if (!result.canceled && result.assets) {
        const newItems = result.assets.filter((a) => a.uri).map((a) => ({
          uri: a.uri, name: a.fileName || `image_${Date.now()}.jpg`, type: "image" as const,
        }));
        appendAttachments(newItems);
      }
    } catch (e) {
      if (__DEV__) console.warn("[useAttachmentManager] Erreur sélection image:", e);
      Alert.alert(t("common.error"), t("bookings.imagePickerError"));
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"], multiple: true, copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        const newItems = result.assets.map((a) => ({
          uri: a.uri, name: a.name, type: a.mimeType?.includes("pdf") ? ("pdf" as const) : ("image" as const),
        }));
        appendAttachments(newItems);
      }
    } catch (e) {
      if (__DEV__) console.warn("[useAttachmentManager] Erreur sélection document:", e);
      Alert.alert(t("common.error"), t("bookings.documentPickerError"));
    }
  };

  const handleOpenRename = (index: number) => {
    setRenameValue("");
    setRenamingIndex(index);
  };

  const handleConfirmRename = () => {
    if (renamingIndex === null) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const ext = attachments[renamingIndex].name.match(/\.[^.]+$/)?.[0] || "";
    setAttachments((prev) => prev.map((a, i) => (i === renamingIndex ? { ...a, name: trimmed + ext } : a)));
    setRenamingIndex(null);
  };

  const handleRemoveAttachment = (index: number) => {
    const removeItem = () => setAttachments((prev) => prev.filter(excludeIndex(index)));
    Alert.alert(t("common.confirm"), t("bookings.removeAttachmentConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: removeItem },
    ]);
  };

  return {
    attachments, setAttachments,
    renamingIndex, setRenamingIndex,
    renameValue, setRenameValue,
    handlePickImage, handlePickDocument,
    handleOpenRename, handleConfirmRename, handleRemoveAttachment,
  };
};

export default useAttachmentManager;
