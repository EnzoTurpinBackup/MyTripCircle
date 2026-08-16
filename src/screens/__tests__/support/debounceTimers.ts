/**
 * Faux ordonnanceur réservé aux écrans qui temporisent une saisie.
 *
 * `jest.useFakeTimers()` sans précaution remplace aussi `setImmediate`,
 * `queueMicrotask` et `process.nextTick`. Le nettoyage automatique de RNTL — un
 * `act()` asynchrone qui démonte l'arbre — s'appuie sur cette plomberie : privé
 * d'elle, il attend indéfiniment et dépasse les 5 s allouées au hook. Le
 * symptôme reste invisible en local et n'apparaît que sur un runner lent.
 *
 * On ne simule donc que la planification différée (`setTimeout` et consorts) et
 * l'horloge, en laissant intactes les files de micro-tâches.
 */
const ASYNC_PLUMBING_TO_KEEP_REAL = [
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

export function useDebounceTimers(): void {
  jest.useFakeTimers({ doNotFake: [...ASYNC_PLUMBING_TO_KEEP_REAL] });
}

export function restoreDebounceTimers(): void {
  jest.useRealTimers();
}
