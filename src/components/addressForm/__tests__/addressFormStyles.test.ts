import { Platform } from "react-native";
import { RADIUS } from "../../../theme";
import { F } from "../../../theme/fonts";

/**
 * Recharge la feuille de styles pour la plateforme demandée. Les marges sont
 * figées à l'évaluation du module : il faut donc l'isoler et fixer la
 * plateforme sur son propre exemplaire de React Native avant de le charger.
 */
const loadStyles = (os: typeof Platform.OS) => {
  let styles: typeof import("../addressFormStyles").default;
  jest.isolateModules(() => {
    require("react-native").Platform.OS = os;
    styles = require("../addressFormStyles").default;
  });
  return styles!;
};

describe("addressFormStyles", () => {
  it("should build the primary button from the shared theme tokens", () => {
    // Arrange
    const styles = loadStyles("ios");

    // Assert
    expect(styles.primaryButton.borderRadius).toBe(RADIUS.button);
    expect(styles.primaryButtonText).toMatchObject({
      color: "#FFFFFF",
      fontFamily: F.sans700,
    });
  });

  it("should uppercase the field labels with the shared letter spacing", () => {
    // Arrange
    const styles = loadStyles("ios");

    // Assert
    expect(styles.fieldLabel).toMatchObject({
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontFamily: F.sans600,
    });
  });

  it("should clear the iOS status bar and home indicator on iOS", () => {
    // Arrange / Act
    const styles = loadStyles("ios");

    // Assert
    expect(styles.topBar.paddingTop).toBe(56);
    expect(styles.footer.paddingBottom).toBe(36);
  });

  it("should use the tighter Android spacings on Android", () => {
    // Arrange / Act
    const styles = loadStyles("android");

    // Assert
    expect(styles.topBar.paddingTop).toBe(36);
    expect(styles.footer.paddingBottom).toBe(24);
  });

  it("should give the primary button twice the width of the cancel button", () => {
    // Arrange
    const styles = loadStyles("ios");

    // Assert
    expect(styles.cancelButton.flex).toBe(1);
    expect(styles.primaryButton.flex).toBe(2);
  });
});
