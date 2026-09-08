import "./support/nativeMocks";

import React from "react";
import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ModernCard } from "../ModernCard";
import { COLORS } from "../../theme";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/**
 * Les variantes de style sont observées sur la carte interactive : la branche
 * non interactive rend une `View` sans diffuser les props (donc sans testID).
 */
const renderPressableCard = (props: React.ComponentProps<typeof ModernCard>) =>
  render(
    <ModernCard {...props} onPress={props.onPress ?? jest.fn()} testID="card">
      {props.children}
    </ModernCard>,
  );

describe("ModernCard", () => {
  it("should render its children", () => {
    render(
      <ModernCard>
        <Text>Contenu de la carte</Text>
      </ModernCard>,
    );

    expect(screen.getByText("Contenu de la carte")).toBeTruthy();
  });

  it("should render a non-interactive card when no onPress is provided", () => {
    render(
      <ModernCard>
        <Text>Statique</Text>
      </ModernCard>,
    );

    expect(screen.getByText("Statique")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("should forward presses when onPress is provided", () => {
    const onPress = jest.fn();
    renderPressableCard({ onPress, children: <Text>Cliquable</Text> });

    fireEvent.press(screen.getByTestId("card"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should apply the base card background for the default variant", () => {
    renderPressableCard({ children: <Text>Défaut</Text> });

    expect(flatten(screen.getByTestId("card").props.style).backgroundColor).toBe(
      COLORS.white,
    );
  });

  it("should add a thin border for the elevated variant", () => {
    renderPressableCard({ variant: "elevated", children: <Text>Élevée</Text> });

    expect(flatten(screen.getByTestId("card").props.style).borderWidth).toBe(1);
  });

  it("should use a thicker border and remove the elevation for the outlined variant", () => {
    renderPressableCard({ variant: "outlined", children: <Text>Contour</Text> });

    const style = flatten(screen.getByTestId("card").props.style);
    expect(style.borderWidth).toBe(2);
    expect(style.elevation).toBe(0);
  });

  it("should use the sand background for the filled variant", () => {
    renderPressableCard({ variant: "filled", children: <Text>Pleine</Text> });

    expect(flatten(screen.getByTestId("card").props.style).backgroundColor).toBe(
      COLORS.sandMid,
    );
  });

  it("should merge the caller style over the variant style", () => {
    renderPressableCard({
      variant: "filled",
      style: { padding: 3 },
      children: <Text>Personnalisée</Text>,
    });

    expect(flatten(screen.getByTestId("card").props.style).padding).toBe(3);
  });
});
