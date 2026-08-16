import "../../__tests__/support/nativeMocks";

import React from "react";
import { render, screen } from "@testing-library/react-native";
import FieldRow from "../FieldRow";
import { lightColors } from "../../../contexts/ThemeContext";

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe("FieldRow", () => {
  it("should render the label followed by a colon and the value", () => {
    render(
      <FieldRow
        icon="calendar-outline"
        label="Date"
        value="12/03/2026"
        colors={lightColors}
      />,
    );

    expect(screen.getByText("Date :")).toBeTruthy();
    expect(screen.getByText("12/03/2026")).toBeTruthy();
  });

  it("should render the icon requested by the caller", () => {
    render(
      <FieldRow icon="barcode-outline" label="Réf." value="AB123" colors={lightColors} />,
    );

    expect(screen.UNSAFE_getByProps({ name: "barcode-outline" })).toBeTruthy();
  });

  it("should colour the value with the main text colour of the theme", () => {
    render(
      <FieldRow icon="text-outline" label="Titre" value="Vol AF123" colors={lightColors} />,
    );

    expect(flatten(screen.getByText("Vol AF123").props.style).color).toBe(
      lightColors.text,
    );
  });
});
