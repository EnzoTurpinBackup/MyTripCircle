import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "add_friend_search_history";
const MAX_HISTORY = 6;

interface UseSearchHistoryReturn {
  history: string[];
  saveToHistory: (query: string) => Promise<void>;
  removeFromHistory: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

/**
 * Conserve les dernières recherches d'amis pour les proposer de nouveau à
 * l'ouverture de l'écran, la saisie d'un nom d'utilisateur au clavier mobile
 * étant fastidieuse.
 *
 * @returns L'historique du plus récent au plus ancien, ainsi que les commandes
 * d'ajout, de retrait d'une entrée et de purge complète.
 *
 * @remarks L'historique est borné et sans doublon : une recherche déjà connue
 * est remontée en tête plutôt que dupliquée. Il est persisté en clair dans le
 * stockage local, ce qui reste acceptable pour des termes de recherche, et
 * l'utilisateur peut l'effacer. Le premier rendu part d'une liste vide, la
 * lecture du stockage étant asynchrone.
 */
const useSearchHistory = (): UseSearchHistoryReturn => {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((val) => {
      if (val) setHistory(JSON.parse(val));
    });
  }, []);

  const saveToHistory = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const removeFromHistory = async (query: string) => {
    const updated = history.filter((h) => h !== query);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = async () => {
    setHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  };

  return { history, saveToHistory, removeFromHistory, clearHistory };
};

export default useSearchHistory;
