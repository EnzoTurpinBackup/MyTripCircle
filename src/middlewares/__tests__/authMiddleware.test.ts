import jwt from "jsonwebtoken";

import { authMiddleware } from "../authMiddleware";
import User from "../../models/User";

jest.mock("jsonwebtoken", () => ({ verify: jest.fn() }));

jest.mock("../../models/User", () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

const verify = jwt.verify as unknown as jest.Mock;
const findById = (User as unknown as { findById: jest.Mock }).findById;

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

const SIGNED_IN_USER = { _id: "u1", email: "zoe@ex.fr" };

describe("authMiddleware", () => {
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    next = jest.fn();
    process.env.JWT_SECRET = "secret-de-test";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("en-tête d'autorisation", () => {
    it("should refuse the request when the header is absent", async () => {
      // Arrange
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: {} }, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false });
      expect(next).not.toHaveBeenCalled();
      expect(verify).not.toHaveBeenCalled();
    });

    it("should refuse the request when the scheme is not Bearer", async () => {
      // Arrange
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: { authorization: "Basic abc" } }, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(verify).not.toHaveBeenCalled();
    });
  });

  describe("jeton valide", () => {
    it("should attach the user and hand over when the token carries an id", async () => {
      // Arrange
      verify.mockReturnValue({ id: "u1" });
      findById.mockResolvedValue(SIGNED_IN_USER);
      const req: Record<string, unknown> = {
        headers: { authorization: "Bearer jeton-valide" },
      };
      const res = makeResponse();

      // Act
      await authMiddleware(req, res, next);

      // Assert
      expect(verify).toHaveBeenCalledWith("jeton-valide", "secret-de-test");
      expect(findById).toHaveBeenCalledWith("u1");
      expect(req.user).toBe(SIGNED_IN_USER);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should treat a plain string payload as the user id", async () => {
      // Arrange — `jwt.verify` renvoie une chaîne quand la charge utile n'est
      // pas un objet JSON.
      verify.mockReturnValue("u1");
      findById.mockResolvedValue(SIGNED_IN_USER);
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: { authorization: "Bearer jeton" } }, res, next);

      // Assert
      expect(findById).toHaveBeenCalledWith("u1");
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("jeton refusé", () => {
    it("should refuse the request when no user matches the token", async () => {
      // Arrange
      verify.mockReturnValue({ id: "u-inconnu" });
      findById.mockResolvedValue(null);
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: { authorization: "Bearer jeton" } }, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false });
      expect(next).not.toHaveBeenCalled();
    });

    it("should refuse the request when the signature does not verify", async () => {
      // Arrange
      const cause = new Error("signature invalide");
      verify.mockImplementation(() => {
        throw cause;
      });
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: { authorization: "Bearer falsifié" } }, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "[authMiddleware] token verification failed:",
        cause,
      );
    });

    it("should never leak the rejected token in the log", async () => {
      // Arrange
      verify.mockImplementation(() => {
        throw new Error("signature invalide");
      });
      const res = makeResponse();

      // Act
      await authMiddleware({ headers: { authorization: "Bearer secret-brut" } }, res, next);

      // Assert
      const logged = (console.error as unknown as jest.Mock).mock.calls.flat().join(" ");
      expect(logged).not.toContain("secret-brut");
    });
  });
});
