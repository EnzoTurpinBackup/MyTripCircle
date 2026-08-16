import { lightColors } from "../../../contexts/ThemeContext";
import i18n from "../../../utils/i18n";

/**
 * Les onglets de l'écran Amis reçoivent `colors` et `t` par props plutôt que
 * par contexte : on leur passe la palette réelle et le `t` réel d'i18next pour
 * que les assertions portent sur les libellés que voit l'utilisateur.
 */
export const colors = lightColors;

export const t = (key: string, opts?: any) => i18n.t(key, opts) as string;
