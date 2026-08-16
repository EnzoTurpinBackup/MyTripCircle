import createTripStyles from "../createTripStyles";
import { RADIUS } from "../../../theme";
import { COLORS as C } from "../../../theme/colors";
import { F } from "../../../theme/fonts";

describe("createTripStyles", () => {
  it("should build the primary button from the shared theme tokens", () => {
    // Assert — le bouton doit suivre la charte, pas des valeurs codées en dur
    expect(createTripStyles.primaryButton).toMatchObject({
      backgroundColor: C.terra,
      borderRadius: RADIUS.button,
      shadowColor: C.terra,
    });
    expect(createTripStyles.primaryButtonText.fontFamily).toBe(F.sans600);
  });

  it("should flatten the primary button when it is disabled", () => {
    // Assert — un bouton inactif ne doit plus projeter d'ombre
    expect(createTripStyles.primaryButtonDisabled).toEqual({
      backgroundColor: C.inkLight,
      shadowOpacity: 0,
      elevation: 0,
    });
  });

  it("should lay the two date boxes side by side without outer margins", () => {
    // Assert
    expect(createTripStyles.dateRow.flexDirection).toBe("row");
    expect(createTripStyles.dateBox).toMatchObject({
      flex: 1,
      marginHorizontal: 0,
      marginBottom: 0,
    });
    expect(createTripStyles.dateGap.width).toBe(12);
  });

  it("should render the date error message in the danger colour", () => {
    // Assert
    expect(createTripStyles.dateErrorText.color).toBe("#C04040");
  });

  it("should give the description field room to grow from the top", () => {
    // Assert
    expect(createTripStyles.descInput).toEqual({
      minHeight: 80,
      textAlignVertical: "top",
    });
  });
});
