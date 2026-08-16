import userRoutes from "../userRoutes";
import { authMiddleware } from "../../middlewares/authMiddleware";
import { changePassword, updateProfile } from "../../controllers/authController";

jest.mock("../../middlewares/authMiddleware", () => ({ authMiddleware: jest.fn() }));

jest.mock("../../controllers/authController", () => ({
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
}));

interface RegisteredRoute {
  path: string;
  methods: Record<string, boolean>;
  stack: { handle: unknown }[];
}

/**
 * Table de routage réellement enregistrée par le routeur Express, aplatie en
 * une liste de couples chemin / chaîne de traitement. On interroge l'objet
 * produit plutôt que la source : c'est ce qu'Express servira à l'exécution.
 */
const routes = (): RegisteredRoute[] =>
  (userRoutes as unknown as { stack: { route: RegisteredRoute }[] }).stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route);

const routeFor = (path: string) => routes().find((route) => route.path === path);

describe("userRoutes", () => {
  it("should expose exactly the profile and password endpoints", () => {
    // Arrange & Act
    const paths = routes().map((route) => route.path);

    // Assert
    expect(paths).toEqual(["/me", "/change-password"]);
  });

  it("should serve the profile update over PUT only", () => {
    // Arrange & Act
    const route = routeFor("/me");

    // Assert
    expect(route?.methods).toEqual({ put: true });
  });

  it("should serve the password change over PUT only", () => {
    // Arrange & Act
    const route = routeFor("/change-password");

    // Assert
    expect(route?.methods).toEqual({ put: true });
  });

  it("should guard the profile update with the auth middleware before its handler", () => {
    // Arrange & Act
    const handlers = routeFor("/me")?.stack.map((layer) => layer.handle);

    // Assert
    expect(handlers).toEqual([authMiddleware, updateProfile]);
  });

  it("should guard the password change with the auth middleware before its handler", () => {
    // Arrange & Act
    const handlers = routeFor("/change-password")?.stack.map((layer) => layer.handle);

    // Assert
    expect(handlers).toEqual([authMiddleware, changePassword]);
  });
});
