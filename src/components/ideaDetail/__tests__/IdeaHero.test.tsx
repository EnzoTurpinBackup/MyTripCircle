import "../../__tests__/support/nativeMocks";

import React from "react";
import { Image } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import IdeaHero from "../IdeaHero";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const baseProps = {
  ideaId: "1",
  name: "Kyoto",
  country: "Japon",
  onBack: jest.fn(),
};

describe("IdeaHero", () => {
  it("should render the destination name and country", () => {
    render(<IdeaHero {...baseProps} onBack={jest.fn()} />);

    expect(screen.getByText("Kyoto")).toBeTruthy();
    expect(screen.getByText("Japon")).toBeTruthy();
  });

  it("should render the cover photo mapped to a known idea id", () => {
    render(<IdeaHero {...baseProps} onBack={jest.fn()} />);

    expect(screen.UNSAFE_getByType(Image).props.source.uri).toContain(
      "photo-1552074284-5e88ef1aef18",
    );
  });

  it("should leave the cover source undefined for an unknown idea id", () => {
    render(<IdeaHero {...baseProps} ideaId="inconnu" onBack={jest.fn()} />);

    expect(screen.UNSAFE_getByType(Image).props.source.uri).toBeUndefined();
  });

  it("should call onBack when the back button is pressed", () => {
    const onBack = jest.fn();
    render(<IdeaHero {...baseProps} onBack={onBack} />);

    fireEvent.press(screen.getByLabelText("common.a11y.back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
