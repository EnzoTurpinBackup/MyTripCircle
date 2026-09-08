import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DECORATIVE_ELEMENT_PROPS } from "../../utils/accessibility";

interface AttachmentThumbProps {
  attachment: { type: string; uri: string };
  colors: any;
}

const AttachmentThumb: React.FC<AttachmentThumbProps> = ({ attachment, colors }) => {
  const isLocalImage =
    attachment.type === "image" &&
    (attachment.uri.startsWith("file://") ||
      attachment.uri.startsWith("content://") ||
      attachment.uri.startsWith("ph://"));

  if (isLocalImage) {
    // Décorative : le nom de la pièce jointe est lu juste à côté de la vignette.
    return <Image source={{ uri: attachment.uri }} style={styles.thumbnail} resizeMode="cover" {...DECORATIVE_ELEMENT_PROPS} />;
  }

  return (
    <View style={[styles.icon, { backgroundColor: colors.bgLight }]}>
      <Ionicons name={attachment.type === "pdf" ? "document" : "image"} size={22} color={colors.terra} {...DECORATIVE_ELEMENT_PROPS} />
    </View>
  );
};

const styles = StyleSheet.create({
  thumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  icon: { width: 50, height: 50, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 12 },
});

export default AttachmentThumb;
