import React from "react";
import { Image } from "react-native";
import { render, screen } from "@testing-library/react-native";
import AttachmentThumb from "../AttachmentThumb";
import { lightColors } from "../../../contexts/ThemeContext";

// ThemeContext lit/écrit la préférence de thème via AsyncStorage au montage :
// on la mocke pour éviter l'erreur "NativeModule: AsyncStorage is null" en test.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// La police d'icônes ne laisse dans l'arbre rendu qu'un glyphe illisible :
// on la remplace par un texte porteur du nom de l'icône, seul moyen d'affirmer
// laquelle a été choisie.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, `icon:${name}`),
  };
});

// Le composant n'expose ni texte ni testID pour la vignette : la seule façon de
// distinguer l'image réelle du pictogramme de repli est de chercher le type.
const queryImage = () => screen.UNSAFE_queryByType(Image);

const renderThumb = (attachment: { type: string; uri: string }) =>
  render(<AttachmentThumb attachment={attachment} colors={lightColors} />);

describe("AttachmentThumb", () => {
  it.each(["file://", "content://", "ph://"])(
    "should render the picture itself when the image uri starts with %s",
    (scheme) => {
      // Arrange
      const uri = `${scheme}photos/ticket.png`;

      // Act
      renderThumb({ type: "image", uri });

      // Assert
      expect(queryImage()?.props.source).toEqual({ uri });
      expect(screen.queryByText(/^icon:/)).toBeNull();
    }
  );

  it("should render the image pictogram when the picture is hosted remotely", () => {
    // Arrange / Act
    renderThumb({ type: "image", uri: "https://cdn.example.com/ticket.png" });

    // Assert — l'URI distante ne peut pas être affichée en vignette locale
    expect(queryImage()).toBeNull();
    expect(screen.getByText("icon:image")).toBeTruthy();
  });

  it("should render the document pictogram when the attachment is a pdf", () => {
    // Arrange / Act
    renderThumb({ type: "pdf", uri: "file://documents/ticket.pdf" });

    // Assert
    expect(queryImage()).toBeNull();
    expect(screen.getByText("icon:document")).toBeTruthy();
  });
});
