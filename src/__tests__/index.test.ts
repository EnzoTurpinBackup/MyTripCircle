import { registerRootComponent } from "expo";

jest.mock("expo", () => ({ registerRootComponent: jest.fn() }));

jest.mock("../../App", () => ({ __esModule: true, default: "AppRoot" }));

/**
 * `index.ts` est le point d'entrée natif : son unique rôle est d'enregistrer le
 * composant racine auprès d'`AppRegistry`. Oublier cet appel donne une
 * application qui compile mais n'affiche rien — d'où ce verrou.
 */
describe("point d'entrée de l'application", () => {
  it("should register the App component as the native root", () => {
    // Arrange & Act
    require("../../index");

    // Assert
    expect(registerRootComponent).toHaveBeenCalledWith("AppRoot");
    expect(registerRootComponent).toHaveBeenCalledTimes(1);
  });
});
