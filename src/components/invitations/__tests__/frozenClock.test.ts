import { freezeClockAt, restoreClock } from "./frozenClock";

const NOW = new Date("2026-06-15T12:00:00.000Z");

describe("freezeClockAt", () => {
  afterEach(() => {
    restoreClock();
  });

  it("should freeze the wall clock on the given instant", () => {
    // Arrange / Act
    freezeClockAt(NOW);

    // Assert
    expect(Date.now()).toBe(NOW.getTime());
    expect(new Date().toISOString()).toBe("2026-06-15T12:00:00.000Z");
  });

  // Régression : simuler `setImmediate` / `setTimeout` casse le nettoyage
  // automatique de RNTL, qui démonte l'arbre dans un `act()` asynchrone. Une
  // chaîne asynchrone en vol (le chargement de police des icônes Expo) reste
  // alors orpheline et le hook `afterEach` expire au bout de 5 s — l'échec
  // observé en CI. Ce test verrouille l'invariant : seule `Date` est simulée.
  it("should leave the asynchronous scheduling untouched when the clock is frozen", async () => {
    // Arrange
    freezeClockAt(NOW);

    // Act
    const settled = await Promise.race([
      new Promise((resolve) => setImmediate(() => resolve("setImmediate"))),
      new Promise((resolve) => setTimeout(() => resolve("setTimeout"), 0)),
    ]);

    // Assert
    expect(settled).toBeDefined();
  });

  it("should let a real timer fire while the clock stays frozen", async () => {
    // Arrange
    freezeClockAt(NOW);

    // Act
    await new Promise((resolve) => setTimeout(resolve, 1));

    // Assert
    expect(Date.now()).toBe(NOW.getTime());
  });

  it("should give the real clock back after restoreClock", () => {
    // Arrange
    freezeClockAt(NOW);
    expect(Date.now()).toBe(NOW.getTime());

    // Act
    restoreClock();

    // Assert
    expect(Date.now()).not.toBe(NOW.getTime());
  });
});
