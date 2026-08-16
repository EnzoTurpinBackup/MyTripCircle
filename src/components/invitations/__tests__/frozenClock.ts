/**
 * Fige l'horloge sans toucher à l'ordonnancement asynchrone.
 *
 * Plusieurs composants du lot social affichent une date d'expiration ou un
 * temps écoulé calculés depuis `Date.now()` / `new Date()` : ces libellés
 * doivent être déterministes. En revanche, aucun de ces tests n'a besoin de
 * faire *avancer* le temps.
 *
 * Or `jest.useFakeTimers()` remplace aussi `setTimeout`, `setImmediate` et les
 * microtâches. Les icônes `@expo/vector-icons` chargent leur police de manière
 * asynchrone au montage (`Icon.setState` via une chaîne `async`) : sous faux
 * timers, cette chaîne ne se résout jamais, et le nettoyage automatique de RNTL
 * — un `act()` asynchrone qui démonte l'arbre — attend indéfiniment, jusqu'au
 * dépassement des 5 s allouées au hook. Le symptôme n'apparaît que sur une
 * machine lente (le runner CI à 2 cœurs), d'où son caractère intermittent.
 *
 * On ne simule donc que `Date`, en laissant intacte toute la plomberie
 * asynchrone dont dépendent le chargement des polices et le démontage.
 */
const TIMER_APIS_TO_KEEP_REAL = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "setImmediate",
  "clearImmediate",
  "nextTick",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "performance",
  "hrtime",
] as const;

export function freezeClockAt(instant: Date): void {
  jest.useFakeTimers({ doNotFake: [...TIMER_APIS_TO_KEEP_REAL] });
  jest.setSystemTime(instant);
}

export function restoreClock(): void {
  jest.useRealTimers();
}
