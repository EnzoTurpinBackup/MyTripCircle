import bcrypt from "bcrypt";

import { changePassword, updateProfile } from "../authController";
import User from "../../models/User";

jest.mock("bcrypt", () => ({ compare: jest.fn(), hash: jest.fn() }));

jest.mock("../../models/User", () => ({
  __esModule: true,
  default: { findByIdAndUpdate: jest.fn() },
}));

const compare = bcrypt.compare as unknown as jest.Mock;
const hash = bcrypt.hash as unknown as jest.Mock;
const findByIdAndUpdate = (User as unknown as { findByIdAndUpdate: jest.Mock })
  .findByIdAndUpdate;

interface ResponseDouble {
  status: jest.Mock;
  json: jest.Mock;
}

/** Double minimal de la réponse Express : `status` est chaînable. */
const makeResponse = (): ResponseDouble => {
  const res: ResponseDouble = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe("updateProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject the request when the name is missing", async () => {
    // Arrange
    const res = makeResponse();

    // Act
    await updateProfile({ user: { id: "u1" }, body: { email: "zoe@ex.fr" } }, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Name and email are required.",
    });
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should reject the request when the email is missing", async () => {
    // Arrange
    const res = makeResponse();

    // Act
    await updateProfile({ user: { id: "u1" }, body: { name: "Zoé" } }, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return the updated profile when both fields are provided", async () => {
    // Arrange
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    findByIdAndUpdate.mockResolvedValue({
      _id: "u1",
      name: "Zoé",
      email: "zoe@ex.fr",
      createdAt,
    });
    const res = makeResponse();

    // Act
    await updateProfile(
      { user: { id: "u1" }, body: { name: "Zoé", email: "zoe@ex.fr" } },
      res,
    );

    // Assert
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      "u1",
      { name: "Zoé", email: "zoe@ex.fr" },
      { new: true },
    );
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      user: { id: "u1", name: "Zoé", email: "zoe@ex.fr", createdAt },
    });
  });

  it("should never echo the stored password back to the client", async () => {
    // Arrange
    findByIdAndUpdate.mockResolvedValue({
      _id: "u1",
      name: "Zoé",
      email: "zoe@ex.fr",
      password: "hachage-secret",
    });
    const res = makeResponse();

    // Act
    await updateProfile(
      { user: { id: "u1" }, body: { name: "Zoé", email: "zoe@ex.fr" } },
      res,
    );

    // Assert
    expect(res.json.mock.calls[0][0].user).not.toHaveProperty("password");
  });

  it("should answer with a generic server error when the storage fails", async () => {
    // Arrange
    findByIdAndUpdate.mockRejectedValue(new Error("base injoignable"));
    const res = makeResponse();

    // Act
    await updateProfile(
      { user: { id: "u1" }, body: { name: "Zoé", email: "zoe@ex.fr" } },
      res,
    );

    // Assert — le message reste générique : aucune trace technique n'est exposée.
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Server error. Please try again later.",
    });
  });
});

describe("changePassword", () => {
  const makeUser = () => ({ password: "ancien-hachage", save: jest.fn() });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject the request when the current password is missing", async () => {
    // Arrange
    const res = makeResponse();
    const user = makeUser();

    // Act
    await changePassword({ user, body: { newPassword: "nouveau" } }, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false });
    expect(compare).not.toHaveBeenCalled();
  });

  it("should reject the request when the new password is missing", async () => {
    // Arrange
    const res = makeResponse();
    const user = makeUser();

    // Act
    await changePassword({ user, body: { currentPassword: "ancien" } }, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(compare).not.toHaveBeenCalled();
  });

  it("should refuse the change when the current password does not match", async () => {
    // Arrange
    compare.mockResolvedValue(false);
    const res = makeResponse();
    const user = makeUser();

    // Act
    await changePassword(
      { user, body: { currentPassword: "faux", newPassword: "nouveau" } },
      res,
    );

    // Assert
    expect(compare).toHaveBeenCalledWith("faux", "ancien-hachage");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Current password is incorrect.",
    });
    expect(user.save).not.toHaveBeenCalled();
  });

  it("should store the hashed new password when the current one matches", async () => {
    // Arrange
    compare.mockResolvedValue(true);
    hash.mockResolvedValue("nouveau-hachage");
    const res = makeResponse();
    const user = makeUser();

    // Act
    await changePassword(
      { user, body: { currentPassword: "ancien", newPassword: "nouveau" } },
      res,
    );

    // Assert
    expect(hash).toHaveBeenCalledWith("nouveau", 10);
    expect(user.password).toBe("nouveau-hachage");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it("should answer with a generic server error when saving fails", async () => {
    // Arrange
    compare.mockResolvedValue(true);
    hash.mockResolvedValue("nouveau-hachage");
    const res = makeResponse();
    const user = makeUser();
    user.save.mockRejectedValue(new Error("base injoignable"));

    // Act
    await changePassword(
      { user, body: { currentPassword: "ancien", newPassword: "nouveau" } },
      res,
    );

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Server error. Please try again later.",
    });
  });
});
