import { styles } from "../addressStyles";

describe("addressStyles", () => {
  it("should expose a fully rounded filter chip", () => {
    expect(styles.chip.borderRadius).toBe(9999);
  });

  it("should give the map widget a fixed height so the list layout stays stable", () => {
    expect(styles.mapWidget.height).toBe(130);
    expect(styles.mapWidget.overflow).toBe("hidden");
  });

  it("should reserve room for the floating tab bar at the end of the list", () => {
    expect(styles.listContent.paddingBottom).toBe(100);
  });

  it("should keep the address type icon from shrinking in a row", () => {
    expect(styles.addressIcon.flexShrink).toBe(0);
  });
});
