/**
 * Simule `setInterval` / `clearInterval` — et rien d'autre.
 *
 * Les écrans à compte à rebours (l'OTP renvoie un code au bout de 60 s) doivent
 * pouvoir faire *avancer* le temps, ce que `freezeClockAt` ne permet pas.
 *
 * Mais `jest.useFakeTimers()` sans restriction remplace aussi `setTimeout`,
 * `setImmediate` et les microtâches. Les icônes `@expo/vector-icons` chargent
 * leur police par une chaîne asynchrone au montage : sous faux timers complets,
 * cette chaîne ne se résout jamais et le nettoyage automatique de RNTL — un
 * `act()` asynchrone qui démonte l'arbre — dépasse les 5 s allouées au hook.
 * L'échec n'apparaît que sur une machine lente, typiquement le runner CI.
 *
 * On ne simule donc que l'ordonnanceur d'intervalles, en laissant réelle toute
 * la plomberie asynchrone dont dépendent le chargement des polices, `act()` et
 * le démontage.
 */
const TIMER_APIS_TO_KEEP_REAL = [
  "Date",
  "setTimeout",
  "clearTimeout",
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

export function useFakeIntervals(): void {
  jest.useFakeTimers({ doNotFake: [...TIMER_APIS_TO_KEEP_REAL] });
}

export function restoreIntervals(): void {
  jest.useRealTimers();
}
