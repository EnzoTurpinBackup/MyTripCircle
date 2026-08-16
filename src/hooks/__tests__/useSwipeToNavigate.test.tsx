import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Gesture } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { SwipeToNavigate } from "../useSwipeToNavigate";

// Le geste lui-même appartient à Gesture Handler : on ne le rejoue pas, on
// capture seulement le callback `onEnd` afin d'exercer la logique de décision
// (seuil, direction, bornes d'index) qui, elle, est du code applicatif.
jest.mock("react-native-gesture-handler", () => {
  const builder: Record<string, jest.Mock> = {};
  builder.activeOffsetX = jest.fn(() => builder);
  builder.failOffsetY = jest.fn(() => builder);
  builder.onEnd = jest.fn(() => builder);
  return {
    Gesture: { Pan: jest.fn(() => builder) },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.Mock;

const panBuilder = Gesture.Pan() as unknown as {
  activeOffsetX: jest.Mock;
  failOffsetY: jest.Mock;
  onEnd: jest.Mock;
};

const navigate = jest.fn();

/** Monte le composant et retourne le callback de fin de geste capturé. */
const mountAndCaptureSwipe = (currentIndex: number, totalTabs = 5) => {
  const view = render(
    <SwipeToNavigate currentIndex={currentIndex} totalTabs={totalTabs}>
      <Text>contenu</Text>
    </SwipeToNavigate>
  );
  const onEnd = panBuilder.onEnd.mock.calls.at(-1)?.[0] as (event: {
    translationX: number;
  }) => void;
  return { ...view, onEnd };
};

describe("SwipeToNavigate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({ navigate });
  });

  it("should render its children", () => {
    // Arrange & Act
    const { getByText } = mountAndCaptureSwipe(0);

    // Assert
    expect(getByText("contenu")).toBeTruthy();
  });

  it("should only activate horizontally and give up on vertical drags", () => {
    // Arrange & Act
    mountAndCaptureSwipe(0);

    // Assert
    expect(panBuilder.activeOffsetX).toHaveBeenCalledWith([-15, 15]);
    expect(panBuilder.failOffsetY).toHaveBeenCalledWith([-15, 15]);
  });

  it("should navigate to the previous tab when swiping right past the threshold", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(2);

    // Act
    onEnd({ translationX: 120 });

    // Assert
    expect(navigate).toHaveBeenCalledWith("Bookings");
  });

  it("should navigate to the next tab when swiping left past the threshold", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(2);

    // Act
    onEnd({ translationX: -120 });

    // Assert
    expect(navigate).toHaveBeenCalledWith("Addresses");
  });

  it("should not navigate when the swipe is exactly at the threshold", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(2);

    // Act
    onEnd({ translationX: 50 });

    // Assert
    expect(navigate).not.toHaveBeenCalled();
  });

  it("should not navigate when the swipe is shorter than the threshold", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(2);

    // Act
    onEnd({ translationX: -49 });

    // Assert
    expect(navigate).not.toHaveBeenCalled();
  });

  it("should not navigate when swiping right from the first tab", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(0);

    // Act
    onEnd({ translationX: 200 });

    // Assert
    expect(navigate).not.toHaveBeenCalled();
  });

  it("should not navigate when swiping left from the last tab", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(4);

    // Act
    onEnd({ translationX: -200 });

    // Assert
    expect(navigate).not.toHaveBeenCalled();
  });

  it("should navigate to the first tab when swiping right from the second one", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(1);

    // Act
    onEnd({ translationX: 80 });

    // Assert
    expect(navigate).toHaveBeenCalledWith("Trips");
  });

  it("should navigate to the last tab when swiping left from the one before it", () => {
    // Arrange
    const { onEnd } = mountAndCaptureSwipe(3);

    // Act
    onEnd({ translationX: -80 });

    // Assert
    expect(navigate).toHaveBeenCalledWith("Profile");
  });
});
