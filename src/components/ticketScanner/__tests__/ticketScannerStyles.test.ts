import { styles, CORNER_SIZE, CORNER_THICKNESS } from "../ticketScannerStyles";

describe("ticketScannerStyles", () => {
  it("should expose the viewfinder corner dimensions", () => {
    expect(CORNER_SIZE).toBe(24);
    expect(CORNER_THICKNESS).toBe(3);
  });

  it("should size the viewfinder corners from the exported constants", () => {
    expect(styles.corner.width).toBe(CORNER_SIZE);
    expect(styles.corner.height).toBe(CORNER_SIZE);
  });

  it("should anchor the result panel to the bottom of the screen", () => {
    expect(styles.resultPanel.position).toBe("absolute");
    expect(styles.resultPanel.bottom).toBe(0);
  });

  it("should render the camera screen on a black background", () => {
    expect(styles.cameraContainer.backgroundColor).toBe("black");
  });
});
