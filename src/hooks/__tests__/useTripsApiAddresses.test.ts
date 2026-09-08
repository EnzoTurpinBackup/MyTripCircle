import { renderHook, act } from "@testing-library/react-native";
import { useTripsApiAddresses } from "../useTripsApiAddresses";
import ApiService from "../../services/ApiService";
import type { Address } from "../../types";

jest.mock("../../services/ApiService", () => ({
  __esModule: true,
  default: {
    createAddress: jest.fn(),
    updateAddress: jest.fn(),
    deleteAddress: jest.fn(),
  },
}));

const mockApi = ApiService as unknown as {
  createAddress: jest.Mock;
  updateAddress: jest.Mock;
  deleteAddress: jest.Mock;
};

const RAW_ADDRESS = {
  _id: "addr-1",
  type: "hotel",
  name: "Hôtel Central",
  address: "1 rue de Paris",
  city: "Paris",
  country: "France",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** Rejoue l'updater passé au setter React sur un état initial donné. */
function applyUpdater(setter: jest.Mock, previous: Address[]): Address[] {
  const updater = setter.mock.calls[0][0] as (prev: Address[]) => Address[];
  return updater(previous);
}

function setup() {
  const setAddresses = jest.fn();
  const { result } = renderHook(() =>
    useTripsApiAddresses({
      setAddresses: setAddresses as unknown as React.Dispatch<React.SetStateAction<Address[]>>,
    }),
  );
  return { result, setAddresses };
}

describe("useTripsApiAddresses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createAddress", () => {
    it("should return the mapped address when the API call succeeds", async () => {
      // Arrange
      mockApi.createAddress.mockResolvedValue(RAW_ADDRESS);
      const { result } = setup();

      // Act
      let created: Address | undefined;
      await act(async () => {
        created = await result.current.createAddress(
          {} as Omit<Address, "id" | "createdAt" | "updatedAt">,
        );
      });

      // Assert
      expect(created).toMatchObject({ id: "addr-1", name: "Hôtel Central" });
    });

    it("should append the created address to the existing list when the API call succeeds", async () => {
      // Arrange
      mockApi.createAddress.mockResolvedValue(RAW_ADDRESS);
      const { result, setAddresses } = setup();

      // Act
      await act(async () => {
        await result.current.createAddress({} as Omit<Address, "id" | "createdAt" | "updatedAt">);
      });

      // Assert
      expect(applyUpdater(setAddresses, [{ id: "addr-0" } as Address]).map((a) => a.id)).toEqual([
        "addr-0",
        "addr-1",
      ]);
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.createAddress.mockRejectedValue(new Error("create failed"));
      const { result } = setup();

      // Act & Assert
      await expect(
        result.current.createAddress({} as Omit<Address, "id" | "createdAt" | "updatedAt">),
      ).rejects.toThrow("create failed");
    });
  });

  describe("updateAddress", () => {
    it("should return the mapped address when the API returns a payload", async () => {
      // Arrange
      mockApi.updateAddress.mockResolvedValue({ ...RAW_ADDRESS, name: "Hôtel Nord" });
      const { result } = setup();

      // Act
      let updated: Address | null | undefined;
      await act(async () => {
        updated = await result.current.updateAddress("addr-1", { name: "Hôtel Nord" });
      });

      // Assert
      expect(updated).toMatchObject({ id: "addr-1", name: "Hôtel Nord" });
    });

    it("should replace only the matching address in the list when the API returns a payload", async () => {
      // Arrange
      mockApi.updateAddress.mockResolvedValue({ ...RAW_ADDRESS, name: "Hôtel Nord" });
      const { result, setAddresses } = setup();
      const existing = [
        { id: "addr-0", name: "Autre" } as Address,
        { id: "addr-1", name: "Hôtel Central" } as Address,
      ];

      // Act
      await act(async () => {
        await result.current.updateAddress("addr-1", { name: "Hôtel Nord" });
      });

      // Assert
      expect(applyUpdater(setAddresses, existing).map((a) => a.name)).toEqual([
        "Autre",
        "Hôtel Nord",
      ]);
    });

    it("should return null and leave the list untouched when the API returns nothing", async () => {
      // Arrange
      mockApi.updateAddress.mockResolvedValue(null);
      const { result, setAddresses } = setup();

      // Act
      let updated: Address | null | undefined;
      await act(async () => {
        updated = await result.current.updateAddress("addr-1", {});
      });

      // Assert
      expect(updated).toBeNull();
      expect(setAddresses).not.toHaveBeenCalled();
    });

    it("should rethrow when the API call fails", async () => {
      // Arrange
      mockApi.updateAddress.mockRejectedValue(new Error("update failed"));
      const { result } = setup();

      // Act & Assert
      await expect(result.current.updateAddress("addr-1", {})).rejects.toThrow("update failed");
    });
  });

  describe("deleteAddress", () => {
    it("should return true when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteAddress.mockResolvedValue(undefined);
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteAddress("addr-1");
      });

      // Assert
      expect(deleted).toBe(true);
    });

    it("should remove the address from the list when the API call succeeds", async () => {
      // Arrange
      mockApi.deleteAddress.mockResolvedValue(undefined);
      const { result, setAddresses } = setup();
      const existing = [{ id: "addr-0" } as Address, { id: "addr-1" } as Address];

      // Act
      await act(async () => {
        await result.current.deleteAddress("addr-1");
      });

      // Assert
      expect(applyUpdater(setAddresses, existing).map((a) => a.id)).toEqual(["addr-0"]);
    });

    it("should return false when the API call fails", async () => {
      // Arrange
      mockApi.deleteAddress.mockRejectedValue(new Error("delete failed"));
      const { result } = setup();

      // Act
      let deleted: boolean | undefined;
      await act(async () => {
        deleted = await result.current.deleteAddress("addr-1");
      });

      // Assert
      expect(deleted).toBe(false);
    });
  });
});
