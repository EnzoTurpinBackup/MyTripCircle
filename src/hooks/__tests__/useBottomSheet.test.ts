import { renderHook } from "@testing-library/react-native";
import { Animated } from "react-native";
import { useBottomSheet } from "../useBottomSheet";

describe("useBottomSheet", () => {
  let start: jest.Mock;
  let parallelSpy: jest.SpyInstance;
  let springSpy: jest.SpyInstance;
  let timingSpy: jest.SpyInstance;

  beforeEach(() => {
    start = jest.fn();
    parallelSpy = jest
      .spyOn(Animated, "parallel")
      .mockReturnValue({ start } as unknown as Animated.CompositeAnimation);
    springSpy = jest.spyOn(Animated, "spring");
    timingSpy = jest.spyOn(Animated, "timing");
  });

  afterEach(() => {
    parallelSpy.mockRestore();
    springSpy.mockRestore();
    timingSpy.mockRestore();
  });

  it("should start the sheet fully closed", () => {
    // Arrange & Act
    const { result } = renderHook(() => useBottomSheet());

    // Assert
    expect((result.current.sheetAnim as any).__getValue()).toBe(0);
    expect((result.current.backdropAnim as any).__getValue()).toBe(0);
  });

  it("should map the closed sheet to the default offscreen offset", () => {
    // Arrange & Act
    const { result } = renderHook(() => useBottomSheet());

    // Assert
    expect((result.current.translateY as any).__getValue()).toBe(340);
  });

  it("should map the closed sheet to the custom offset when an outputRange is given", () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      useBottomSheet({ outputRange: [500, 0] })
    );

    // Assert
    expect((result.current.translateY as any).__getValue()).toBe(500);
  });

  it("should spring the sheet open with the default bounciness when open is called", () => {
    // Arrange
    const { result } = renderHook(() => useBottomSheet());

    // Act
    result.current.open();

    // Assert
    expect(springSpy).toHaveBeenCalledWith(
      result.current.sheetAnim,
      expect.objectContaining({ toValue: 1, bounciness: 4 })
    );
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("should spring the sheet open with the custom bounciness when one is given", () => {
    // Arrange
    const { result } = renderHook(() => useBottomSheet({ bounciness: 12 }));

    // Act
    result.current.open();

    // Assert
    expect(springSpy).toHaveBeenCalledWith(
      result.current.sheetAnim,
      expect.objectContaining({ bounciness: 12 })
    );
  });

  it("should fade the backdrop in when open is called", () => {
    // Arrange
    const { result } = renderHook(() => useBottomSheet());

    // Act
    result.current.open();

    // Assert
    expect(timingSpy).toHaveBeenCalledWith(
      result.current.backdropAnim,
      expect.objectContaining({ toValue: 1, duration: 250 })
    );
  });

  it("should animate the sheet and the backdrop back to zero when close is called", () => {
    // Arrange
    const { result } = renderHook(() => useBottomSheet());

    // Act
    result.current.close();

    // Assert
    expect(timingSpy).toHaveBeenCalledWith(
      result.current.sheetAnim,
      expect.objectContaining({ toValue: 0, duration: 220 })
    );
    expect(timingSpy).toHaveBeenCalledWith(
      result.current.backdropAnim,
      expect.objectContaining({ toValue: 0, duration: 220 })
    );
  });

  it("should start the closing animation without a callback when none is given", () => {
    // Arrange
    const { result } = renderHook(() => useBottomSheet());

    // Act
    result.current.close();

    // Assert
    expect(start).toHaveBeenCalledWith(undefined);
  });

  it("should invoke the completion callback when the closing animation ends", () => {
    // Arrange
    const onComplete = jest.fn();
    const { result } = renderHook(() => useBottomSheet());

    // Act
    result.current.close(onComplete);
    start.mock.calls[0][0]();

    // Assert
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
