import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { F } from "../theme/fonts";
import * as ImagePicker from "expo-image-picker";
import BackButton from "../components/ui/BackButton";
import { getInitials, getAvatarColor } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user, updateUser, updateAvatar } = useAuth();
  const { colors } = useTheme();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSave = async () => {
    try {
      await updateUser({ name, email });
      Alert.alert(
        t("editProfile.updateSuccessTitle"),
        t("editProfile.updateSuccessMessage"),
      );
      navigation.goBack();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(t("common.error"), t("editProfile.updateErrorMessage"));
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.error"), t("editProfile.photoPermissionDenied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${asset.base64}`;
    try {
      setUploadingAvatar(true);
      await updateAvatar(dataUri);
    } catch (error) {
      console.error("updateAvatar error:", error);
      Alert.alert(t("common.error"), t("editProfile.photoUploadError"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header bar ── */}
        <View style={[styles.headerBar, { backgroundColor: colors.bg }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("editProfile.personalInfo")}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} disabled={uploadingAvatar}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, { backgroundColor: getAvatarColor(name || user?.name || "") }]}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarPhoto} />
                ) : (
                  <Text style={styles.avatarInitials}>{getInitials(name || user?.name || "")}</Text>
                )}
              </View>
              <View style={[styles.cameraOverlay, { backgroundColor: colors.terra }]}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.7} disabled={uploadingAvatar}>
            <Text style={[styles.changeAvatarLink, { color: colors.terra }]}>{t("editProfile.changePhoto")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Form card ── */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Name field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("common.fullName")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.input, { color: colors.text }]}
                placeholder={t("editProfile.namePlaceholder")}
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors.bgMid }]} />

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.textLight }]}>{t("common.email")}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: colors.text }]}
                placeholder={t("editProfile.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textLight}
              />
            </View>
          </View>
        </View>

        {/* ── Security card ── */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.securityRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ChangePassword")}
          >
            <View style={styles.securityLeft}>
              <View style={[styles.securityIconBg, { backgroundColor: colors.terraLight }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.terra} />
              </View>
              <Text style={[styles.securityLabel, { color: colors.text }]}>{t("editProfile.changePassword")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.terra }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>{t("editProfile.saveChanges")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: F.sans700,
    textAlign: "center",
    flex: 1,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2A2318",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  avatarPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: F.sans700,
    letterSpacing: 1,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  changeAvatarLink: {
    fontSize: 14,
    fontFamily: F.sans600,
  },

  // Form card
  formCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  fieldGroup: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: F.sans600,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    fontFamily: F.sans400,
  },
  fieldDivider: {
    height: 1,
    marginHorizontal: 16,
  },

  // Security card
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  securityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  securityIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  securityLabel: {
    fontSize: 15,
    fontFamily: F.sans600,
  },

  // Save button
  saveButton: {
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#A35830",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: F.sans700,
  },
});

export default EditProfileScreen;
