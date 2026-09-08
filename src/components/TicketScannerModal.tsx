import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { useTicketScanner } from "../hooks/useTicketScanner";
import ResultPanel from "./ticketScanner/ResultPanel";
import { styles } from "./ticketScanner/ticketScannerStyles";
import BackButton from "./ui/BackButton";
import { useTheme } from "../contexts/ThemeContext";
import { DECORATIVE_ELEMENT_PROPS } from "../utils/accessibility";

export type { ScannedBookingData } from "../hooks/useTicketScanner";

const { width: SCREEN_W } = Dimensions.get("window");

interface TicketScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onFill: (data: import("../hooks/useTicketScanner").ScannedBookingData) => void;
}

const TicketScannerModal: React.FC<TicketScannerModalProps> = ({ visible, onClose, onFill }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    t,
    permission,
    requestPermission,
    mode,
    setMode,
    scanned,
    parsedData,
    rawData,
    scanning,
    scanError,
    previewUri,
    panelAnim,
    reset,
    handleFill,
    handleRescan,
    handleBarcodeScanned,
    handlePickImage,
    handlePickDocument,
  } = useTicketScanner(visible, onFill, onClose);

  React.useEffect(() => {
    if (visible) {
      setMode("choose");
      reset();
    }
  }, [visible]);

  if (mode === "camera" && !permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={[styles.permissionContainer, { backgroundColor: colors.bg }]}>
          <Ionicons name="camera-outline" size={56} color={colors.textMid} {...DECORATIVE_ELEMENT_PROPS} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            {t("bookings.scanCameraPermissionTitle")}
          </Text>
          <Text style={[styles.permissionSubtitle, { color: colors.textMid }]}>
            {t("bookings.scanCameraPermissionSubtitle")}
          </Text>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.terra }]} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>{t("bookings.scanCameraPermissionGrant")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("choose")} style={styles.linkButton}>
            <Text style={[styles.linkButtonText, { color: colors.textMid }]}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!visible) return null;

  if (mode === "choose") {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={[styles.chooseContainer, { backgroundColor: colors.bg }]} edges={["bottom", "left", "right"]}>
          <View style={[styles.chooseHeader, { paddingTop: insets.top + 6, backgroundColor: colors.bg, borderBottomColor: colors.bgMid }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.bgMid }]}
              accessibilityRole="button"
              accessibilityLabel={t("common.a11y.close")}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.chooseTitle, { color: colors.text }]}>{t("bookings.scanTitle")}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.chooseBody}>
            <Text style={[styles.chooseSubtitle, { color: colors.textMid }]}>
              {t("bookings.scanChooseSubtitle")}
            </Text>

            <TouchableOpacity
              style={[styles.chooseOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setMode("camera")}
              activeOpacity={0.8}
            >
              <View style={[styles.chooseOptionIcon, { backgroundColor: "#DCF0F5" }]}>
                <Ionicons name="camera" size={28} color="#5A8FAA" {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <View style={styles.chooseOptionText}>
                <Text style={[styles.chooseOptionTitle, { color: colors.text }]}>{t("bookings.scanCameraOption")}</Text>
                <Text style={[styles.chooseOptionDesc, { color: colors.textMid }]}>{t("bookings.scanCameraOptionDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chooseOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <View style={[styles.chooseOptionIcon, { backgroundColor: "#E2EDD9" }]}>
                <Ionicons name="images" size={28} color="#6B8C5A" {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <View style={styles.chooseOptionText}>
                <Text style={[styles.chooseOptionTitle, { color: colors.text }]}>{t("bookings.scanGalleryOption")}</Text>
                <Text style={[styles.chooseOptionDesc, { color: colors.textMid }]}>{t("bookings.scanGalleryOptionDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chooseOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickDocument}
              activeOpacity={0.8}
            >
              <View style={[styles.chooseOptionIcon, { backgroundColor: "#EDE8F5" }]}>
                <Ionicons name="document" size={28} color="#8B70C0" {...DECORATIVE_ELEMENT_PROPS} />
              </View>
              <View style={styles.chooseOptionText}>
                <Text style={[styles.chooseOptionTitle, { color: colors.text }]}>{t("bookings.scanFileOption")}</Text>
                <Text style={[styles.chooseOptionDesc, { color: colors.textMid }]}>{t("bookings.scanFileOptionDesc")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} {...DECORATIVE_ELEMENT_PROPS} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (mode === "gallery") {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[styles.galleryContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.galleryHeader, { paddingTop: insets.top + 10, borderBottomColor: colors.bgMid }]}>
            <BackButton onPress={() => { reset(); setMode("choose"); }} />
            <Text style={[styles.chooseTitle, { color: colors.text }]}>{t("bookings.scanGalleryOption")}</Text>
            <View style={{ width: 44 }} />
          </View>

          {previewUri && (
            /* Informative : c'est le document scanné, aucun texte de l'écran n'en rend compte. */
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" accessibilityLabel={t("bookings.a11y.ticketPreview")} />
          )}

          {scanning && (
            <View style={[styles.galleryStatus, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="small" color="#5A8FAA" />
              <Text style={[styles.galleryStatusText, { color: colors.textMid }]}>{t("bookings.scanAnalysing")}</Text>
            </View>
          )}

          {!scanning && scanError && (
            <View style={[styles.galleryStatus, { backgroundColor: "#FDEAEA" }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#C04040" {...DECORATIVE_ELEMENT_PROPS} />
              <Text style={[styles.galleryStatusText, { color: "#C04040" }]}>{scanError}</Text>
            </View>
          )}

          {!scanning && (
            <Animated.View
              style={[
                styles.resultPanel,
                { backgroundColor: colors.surface, transform: [{ translateY: panelAnim }] },
              ]}
            >
              {scanned && parsedData && (
                <ResultPanel
                  parsedData={parsedData}
                  rawData={rawData}
                  colors={colors}
                  t={t}
                  onFill={handleFill}
                  onRescan={handleRescan}
                />
              )}
              {scanError && (
                <SafeAreaView edges={["bottom"]}>
                  <View style={{ paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 }}>
                    <TouchableOpacity style={[styles.rescanButton, { borderColor: colors.border }]} onPress={() => { reset(); setMode("choose"); }}>
                      <Text style={[styles.rescanButtonText, { color: colors.textMid }]}>{t("bookings.scanTryOther")}</Text>
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              )}
            </Animated.View>
          )}
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "aztec", "pdf417", "code128", "code39", "ean13", "ean8", "datamatrix"],
          }}
        />

        <View style={styles.overlay}>
          <View style={[styles.cameraHeader, { paddingTop: insets.top + 4 }]}>
            <BackButton variant="overlay" onPress={() => { reset(); setMode("choose"); }} />
            <Text style={styles.cameraHeaderTitle}>{t("bookings.scanTitle")}</Text>
            <View style={{ width: 44 }} />
          </View>

          {!scanned && (
            <View style={styles.viewfinderWrapper}>
              <View style={[styles.viewfinder, { width: SCREEN_W * 0.7, height: SCREEN_W * 0.7 }]}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.scanHint}>{t("bookings.scanHint")}</Text>
            </View>
          )}
        </View>

        {scanned && parsedData && (
          <Animated.View
            style={[styles.resultPanel, { backgroundColor: colors.surface, transform: [{ translateY: panelAnim }] }]}
          >
            <ResultPanel
              parsedData={parsedData}
              rawData={rawData}
              colors={colors}
              t={t}
              onFill={handleFill}
              onRescan={handleRescan}
            />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

export default TicketScannerModal;
