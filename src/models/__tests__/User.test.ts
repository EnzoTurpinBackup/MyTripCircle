import User from "../User";

/**
 * `src/models/User.ts` est un bouchon : il n'existe que pour que les imports du
 * dossier `src/controllers` et `src/middlewares` compilent. Chacune de ses
 * méthodes échoue explicitement plutôt que de renvoyer une valeur vide — c'est
 * ce contrat de « fail fast » que l'on verrouille ici, pour qu'un branchement
 * accidentel sur ce bouchon casse bruyamment au lieu de corrompre des données.
 */
describe("User (modèle bouchon)", () => {
  it("should refuse to save an instance", async () => {
    // Arrange
    const user = new User();

    // Act & Assert
    await expect(user.save()).rejects.toThrow(
      "User.save() is not implemented in this stub model.",
    );
  });

  it("should refuse to update a document by id", async () => {
    // Arrange & Act & Assert
    await expect(User.findByIdAndUpdate("u1", { name: "Zoé" })).rejects.toThrow(
      "User.findByIdAndUpdate() is not implemented in this stub model.",
    );
  });

  it("should refuse to look a document up by id", async () => {
    // Arrange & Act & Assert
    await expect(User.findById("u1")).rejects.toThrow(
      "User.findById() is not implemented in this stub model.",
    );
  });
});
