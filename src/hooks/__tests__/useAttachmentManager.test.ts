import { renderHook, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import useAttachmentManager from "../useAttachmentManager";

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

const mockRequestPermissions =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
const mockGetDocument = DocumentPicker.getDocumentAsync as jest.Mock;

// Le hook consomme une fonction de traduction : on renvoie la clé telle quelle
// pour rendre les assertions lisibles.
const t = (key: string) => key;

const setup = () => renderHook(() => useAttachmentManager(t));

describe("useAttachmentManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-20T10:00:00.000Z"));
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockRequestPermissions.mockResolvedValue({ status: "granted" });
    mockLaunchLibrary.mockResolvedValue({ canceled: true });
    mockGetDocument.mockResolvedValue({ canceled: true });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    (globalThis as { __DEV__: boolean }).__DEV__ = true;
  });

  it("should start with no attachment and no rename in progress", () => {
    // Arrange & Act
    const { result } = setup();

    // Assert
    expect(result.current.attachments).toEqual([]);
    expect(result.current.renamingIndex).toBeNull();
    expect(result.current.renameValue).toBe("");
  });

  describe("handlePickImage", () => {
    it("should warn and not open the library when the permission is denied", async () => {
      // Arrange
      mockRequestPermissions.mockResolvedValue({ status: "denied" });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "bookings.permissionDenied"
      );
      expect(mockLaunchLibrary).not.toHaveBeenCalled();
    });

    it("should keep the attachments untouched when the user cancels", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: null });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments).toEqual([]);
    });

    it("should keep the attachments untouched when the picker returns no asset", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: null });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments).toEqual([]);
    });

    it("should add the selected image with its original file name", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://a.jpg", fileName: "vacances.jpg" }],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments).toEqual([
        { uri: "file://a.jpg", name: "vacances.jpg", type: "image" },
      ]);
    });

    it("should fall back to a timestamped name when the asset has none", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://a.jpg", fileName: undefined }],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments[0].name).toBe(
        `image_${Date.now()}.jpg`
      );
    });

    it("should ignore assets that carry no uri", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: "", fileName: "vide.jpg" },
          { uri: "file://b.jpg", fileName: "ok.jpg" },
        ],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments).toHaveLength(1);
      expect(result.current.attachments[0].name).toBe("ok.jpg");
    });

    it("should offer to rename immediately when a single image is added", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://a.jpg", fileName: "a.jpg" }],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.renamingIndex).toBe(0);
      expect(result.current.renameValue).toBe("");
    });

    it("should not offer to rename when several images are added at once", async () => {
      // Arrange
      mockLaunchLibrary.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: "file://a.jpg", fileName: "a.jpg" },
          { uri: "file://b.jpg", fileName: "b.jpg" },
        ],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(result.current.attachments).toHaveLength(2);
      expect(result.current.renamingIndex).toBeNull();
    });

    it("should report an error when the image picker throws", async () => {
      // Arrange
      const failure = new Error("picker crashed");
      mockLaunchLibrary.mockRejectedValue(failure);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "bookings.imagePickerError"
      );
      expect(console.warn).toHaveBeenCalledWith(
        "[useAttachmentManager] Erreur sélection image:",
        failure
      );
    });

    it("should not log the image picker failure outside development builds", async () => {
      // Arrange
      (globalThis as { __DEV__: boolean }).__DEV__ = false;
      mockLaunchLibrary.mockRejectedValue(new Error("picker crashed"));
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickImage();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "bookings.imagePickerError"
      );
    });
  });

  describe("handlePickDocument", () => {
    it("should keep the attachments untouched when the user cancels", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({ canceled: true, assets: null });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(result.current.attachments).toEqual([]);
    });

    it("should keep the attachments untouched when the picker returns no asset", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({ canceled: false, assets: null });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(result.current.attachments).toEqual([]);
    });

    it("should tag a PDF document as a pdf attachment", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        canceled: false,
        assets: [
          { uri: "file://b.pdf", name: "billet.pdf", mimeType: "application/pdf" },
        ],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(result.current.attachments).toEqual([
        { uri: "file://b.pdf", name: "billet.pdf", type: "pdf" },
      ]);
    });

    it("should tag a non-PDF document as an image attachment", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://c.png", name: "plan.png", mimeType: "image/png" }],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(result.current.attachments[0].type).toBe("image");
    });

    it("should tag a document without mime type as an image attachment", async () => {
      // Arrange
      mockGetDocument.mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file://d.bin", name: "inconnu", mimeType: undefined }],
      });
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(result.current.attachments[0].type).toBe("image");
    });

    it("should report an error when the document picker throws", async () => {
      // Arrange
      const failure = new Error("picker crashed");
      mockGetDocument.mockRejectedValue(failure);
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "bookings.documentPickerError"
      );
      expect(console.warn).toHaveBeenCalledWith(
        "[useAttachmentManager] Erreur sélection document:",
        failure
      );
    });

    it("should not log the document picker failure outside development builds", async () => {
      // Arrange
      (globalThis as { __DEV__: boolean }).__DEV__ = false;
      mockGetDocument.mockRejectedValue(new Error("picker crashed"));
      const { result } = setup();

      // Act
      await act(async () => {
        await result.current.handlePickDocument();
      });

      // Assert
      expect(console.warn).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.error",
        "bookings.documentPickerError"
      );
    });
  });

  describe("rename", () => {
    it("should open the rename editor with an empty value for the given index", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.handleOpenRename(2));

      // Assert
      expect(result.current.renamingIndex).toBe(2);
      expect(result.current.renameValue).toBe("");
    });

    it("should do nothing when confirming a rename with no index selected", () => {
      // Arrange
      const { result } = setup();
      act(() => result.current.setRenameValue("nouveau"));

      // Act
      act(() => result.current.handleConfirmRename());

      // Assert
      expect(result.current.attachments).toEqual([]);
      expect(result.current.renamingIndex).toBeNull();
    });

    it("should keep the current name when the new one is blank", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a.jpg", name: "a.jpg", type: "image" },
        ])
      );
      act(() => result.current.handleOpenRename(0));
      act(() => result.current.setRenameValue("   "));

      // Act
      act(() => result.current.handleConfirmRename());

      // Assert
      expect(result.current.attachments[0].name).toBe("a.jpg");
      expect(result.current.renamingIndex).toBe(0);
    });

    it("should keep the original extension when renaming an attachment", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a.jpg", name: "a.jpg", type: "image" },
          { uri: "file://b.pdf", name: "b.pdf", type: "pdf" },
        ])
      );
      act(() => result.current.handleOpenRename(1));
      act(() => result.current.setRenameValue("  Billet aller  "));

      // Act
      act(() => result.current.handleConfirmRename());

      // Assert
      expect(result.current.attachments[1].name).toBe("Billet aller.pdf");
      expect(result.current.attachments[0].name).toBe("a.jpg");
    });

    it("should rename without extension when the attachment had none", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a", name: "sansExtension", type: "image" },
        ])
      );
      act(() => result.current.handleOpenRename(0));
      act(() => result.current.setRenameValue("Billet"));

      // Act
      act(() => result.current.handleConfirmRename());

      // Assert
      expect(result.current.attachments[0].name).toBe("Billet");
    });

    it("should close the rename editor once the rename is confirmed", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a.jpg", name: "a.jpg", type: "image" },
        ])
      );
      act(() => result.current.handleOpenRename(0));
      act(() => result.current.setRenameValue("Photo"));

      // Act
      act(() => result.current.handleConfirmRename());

      // Assert
      expect(result.current.renamingIndex).toBeNull();
    });
  });

  describe("handleRemoveAttachment", () => {
    it("should ask for confirmation before removing an attachment", () => {
      // Arrange
      const { result } = setup();

      // Act
      act(() => result.current.handleRemoveAttachment(0));

      // Assert
      expect(Alert.alert).toHaveBeenCalledWith(
        "common.confirm",
        "bookings.removeAttachmentConfirm",
        expect.any(Array)
      );
    });

    it("should keep the attachment when the confirmation is dismissed", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a.jpg", name: "a.jpg", type: "image" },
        ])
      );

      // Act
      act(() => result.current.handleRemoveAttachment(0));

      // Assert
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      expect(buttons[0].style).toBe("cancel");
      expect(result.current.attachments).toHaveLength(1);
    });

    it("should remove only the confirmed attachment", () => {
      // Arrange
      const { result } = setup();
      act(() =>
        result.current.setAttachments([
          { uri: "file://a.jpg", name: "a.jpg", type: "image" },
          { uri: "file://b.pdf", name: "b.pdf", type: "pdf" },
          { uri: "file://c.jpg", name: "c.jpg", type: "image" },
        ])
      );
      act(() => result.current.handleRemoveAttachment(1));
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];

      // Act
      act(() => buttons[1].onPress());

      // Assert
      expect(result.current.attachments.map((a) => a.name)).toEqual([
        "a.jpg",
        "c.jpg",
      ]);
    });
  });
});
