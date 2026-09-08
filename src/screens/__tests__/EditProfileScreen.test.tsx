import "./support/screenMocks";

import React from "react";
import { Alert } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";

import EditProfileScreen from "../EditProfileScreen";
import { lightColors, useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@react-navigation/native", () => ({ useNavigation: jest.fn() }));

jest.mock("../../contexts/AuthContext", () => ({ useAuth: jest.fn() }));

jest.mock("../../contexts/ThemeContext", () => ({
  ...jest.requireActual("../../contexts/ThemeContext"),
  useTheme: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const picker = ImagePicker as unknown as {
  requestMediaLibraryPermissionsAsync: jest.Mock;
  launchImageLibraryAsync: jest.Mock;
};

const navigate = jest.fn();
const goBack = jest.fn();
const updateUser = jest.fn();
const updateAvatar = jest.fn();

const USER = { id: "u1", name: "Ada Lovelace", email: "ada@exemple.test", avatar: "" };
const BASE64 = "AAECAwQ=";
const AVATAR_URL = "https://cdn.exemple.test/ada.png";

const setAuth = (overrides: Record<string, unknown> = {}) => {
  (useAuth as jest.Mock).mockReturnValue({ user: USER, updateUser, updateAvatar, ...overrides });
};

const pickPhoto = async () => {
  await act(async () => {
    fireEvent.press(screen.getByText("editProfile.changePhoto"));
  });
};

describe("EditProfileScreen", () => {
  let alert: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    error = jest.spyOn(console, "error").mockImplementation(() => {});
    (useNavigation as jest.Mock).mockReturnValue({ navigate, goBack });
    (useTheme as jest.Mock).mockReturnValue({ colors: lightColors });
    setAuth();
    updateUser.mockResolvedValue(undefined);
    updateAvatar.mockResolvedValue(undefined);
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "granted" });
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ base64: BASE64, mimeType: "image/png" }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("pré-remplissage du formulaire", () => {
    it("should prefill the fields with the signed in identity", () => {
      // Arrange & Act
      render(<EditProfileScreen />);

      // Assert
      expect(screen.getByPlaceholderText("editProfile.namePlaceholder").props.value).toBe(USER.name);
      expect(screen.getByPlaceholderText("editProfile.emailPlaceholder").props.value).toBe(USER.email);
    });

    it("should leave the fields empty when no user is signed in", () => {
      // Arrange
      setAuth({ user: null });

      // Act
      render(<EditProfileScreen />);

      // Assert
      expect(screen.getByPlaceholderText("editProfile.namePlaceholder").props.value).toBe("");
      expect(screen.getByPlaceholderText("editProfile.emailPlaceholder").props.value).toBe("");
    });

    it("should show the initials of the typed name when the account has no photo", () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("editProfile.namePlaceholder"), "Grace Hopper");

      // Assert
      expect(screen.getByText("GH")).toBeTruthy();
    });

    it("should fall back to the stored name when the field has been emptied", () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      fireEvent.changeText(screen.getByPlaceholderText("editProfile.namePlaceholder"), "");

      // Assert
      expect(screen.getByText("AL")).toBeTruthy();
    });

    it("should show the photo instead of the initials when the account has one", () => {
      // Arrange
      setAuth({ user: { ...USER, avatar: AVATAR_URL } });

      // Act
      render(<EditProfileScreen />);

      // Assert
      expect(screen.queryByText("AL")).toBeNull();
    });
  });

  describe("enregistrement du profil", () => {
    const save = async () => {
      await act(async () => {
        fireEvent.press(screen.getByText("editProfile.saveChanges"));
      });
    };

    it("should send the edited identity to the API", async () => {
      // Arrange
      render(<EditProfileScreen />);
      fireEvent.changeText(screen.getByPlaceholderText("editProfile.namePlaceholder"), "Grace Hopper");
      fireEvent.changeText(screen.getByPlaceholderText("editProfile.emailPlaceholder"), "grace@exemple.test");

      // Act
      await save();

      // Assert
      expect(updateUser).toHaveBeenCalledWith({ name: "Grace Hopper", email: "grace@exemple.test" });
    });

    it("should confirm and leave the screen when the API accepts", async () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      await save();

      // Assert
      expect(alert).toHaveBeenCalledWith(
        "editProfile.updateSuccessTitle",
        "editProfile.updateSuccessMessage",
      );
      expect(goBack).toHaveBeenCalledTimes(1);
    });

    it("should report the failure and stay on the screen when the API refuses", async () => {
      // Arrange
      updateUser.mockRejectedValue(new Error("adresse déjà utilisée"));
      render(<EditProfileScreen />);

      // Act
      await save();

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "editProfile.updateErrorMessage");
      expect(goBack).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith("Error updating profile:", expect.any(Error));
    });
  });

  describe("changement de photo", () => {
    it("should refuse to open the library when the photo permission is denied", async () => {
      // Arrange
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: "denied" });
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "editProfile.photoPermissionDenied");
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it("should upload the chosen photo as a data URI carrying its own mime type", async () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(updateAvatar).toHaveBeenCalledWith(`data:image/png;base64,${BASE64}`);
    });

    it("should assume a JPEG when the chosen photo declares no mime type", async () => {
      // Arrange
      picker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ base64: BASE64 }],
      });
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(updateAvatar).toHaveBeenCalledWith(`data:image/jpeg;base64,${BASE64}`);
    });

    it("should upload nothing when the user cancels the library", async () => {
      // Arrange
      picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(updateAvatar).not.toHaveBeenCalled();
    });

    it("should upload nothing when the chosen photo carries no data", async () => {
      // Arrange
      picker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{}] });
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(updateAvatar).not.toHaveBeenCalled();
    });

    it("should report the failure when the upload is refused", async () => {
      // Arrange
      updateAvatar.mockRejectedValue(new Error("fichier trop lourd"));
      render(<EditProfileScreen />);

      // Act
      await pickPhoto();

      // Assert
      expect(alert).toHaveBeenCalledWith("common.error", "editProfile.photoUploadError");
      expect(error).toHaveBeenCalledWith("updateAvatar error:", expect.any(Error));
    });

    // L'icône est décorative : elle porte `DECORATIVE_ELEMENT_PROPS` et sort donc
    // du parcours des technologies d'assistance, que les requêtes ignorent par
    // défaut. C'est bien son rendu visuel que ce cas observe — d'où la levée
    // explicite du filtre, plutôt qu'un retrait du masquage côté composant.
    const cameraIcon = () => screen.queryByText("icon:camera", { includeHiddenElements: true });

    it("should show a progress indicator while the photo is being uploaded", async () => {
      // Arrange
      let release: () => void = () => {};
      updateAvatar.mockReturnValue(new Promise<void>((r) => { release = r; }));
      render(<EditProfileScreen />);
      expect(cameraIcon()).toBeTruthy();

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("editProfile.changePhoto"));
      });

      // Assert
      expect(cameraIcon()).toBeNull();
      await act(async () => { release(); });
      expect(cameraIcon()).toBeTruthy();
    });

    it("should ignore a second request while an upload is already running", async () => {
      // Arrange
      let release: () => void = () => {};
      updateAvatar.mockReturnValue(new Promise<void>((r) => { release = r; }));
      render(<EditProfileScreen />);
      await act(async () => {
        fireEvent.press(screen.getByText("editProfile.changePhoto"));
      });

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText("editProfile.changePhoto"));
      });

      // Assert
      expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
      await act(async () => { release(); });
    });
  });

  describe("navigation", () => {
    it("should open the password change screen from the security row", () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      fireEvent.press(screen.getByText("editProfile.changePassword"));

      // Assert
      expect(navigate).toHaveBeenCalledWith("ChangePassword");
    });

    it("should go back when the back button is pressed", () => {
      // Arrange
      render(<EditProfileScreen />);

      // Act
      fireEvent.press(screen.getByRole("button", { name: "common.a11y.back" }));

      // Assert
      expect(goBack).toHaveBeenCalledTimes(1);
    });
  });
});
