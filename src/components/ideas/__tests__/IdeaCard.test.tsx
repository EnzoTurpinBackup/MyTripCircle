import "../../__tests__/support/nativeMocks";

import React from "react";
import { Image, View } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import IdeaCard from "../IdeaCard";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** La carte n'expose pas de testID : c'est la vue racine du composant. */
const cardView = () => screen.UNSAFE_getAllByType(View)[0];

const destination = {
  id: "7",
  category: "city",
  image: "https://example.test/kyoto.jpg",
  name: "Kyoto",
  country: "Japon",
};

describe("IdeaCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("should render the destination name and country", () => {
    render(<IdeaCard item={destination} index={0} />);

    expect(screen.getByText("Kyoto")).toBeTruthy();
    expect(screen.getByText("Japon")).toBeTruthy();
  });

  it("should render the destination image", () => {
    render(<IdeaCard item={destination} index={0} />);

    expect(screen.UNSAFE_getByType(Image).props.source.uri).toBe(
      "https://example.test/kyoto.jpg",
    );
  });

  it("should mockNavigate to the idea detail with the destination id when pressed", () => {
    render(<IdeaCard item={destination} index={0} />);

    fireEvent.press(screen.getByText("Kyoto"));

    expect(mockNavigate).toHaveBeenCalledWith("IdeaDetail", { ideaId: "7" });
  });

  it("should offset the card to the right for an even index", () => {
    render(<IdeaCard item={destination} index={0} />);

    expect(flatten(cardView().props.style).marginRight).toBe(6);
  });

  it("should offset the card to the left for an odd index", () => {
    render(<IdeaCard item={destination} index={1} />);

    expect(flatten(cardView().props.style).marginLeft).toBe(6);
  });
});
