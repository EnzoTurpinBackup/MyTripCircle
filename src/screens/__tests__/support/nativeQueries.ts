import { ActivityIndicator, RefreshControl } from "react-native";
import { act, fireEvent, screen } from "@testing-library/react-native";

/**
 * Accès aux primitives React Native qui n'exposent aucune prise publique.
 *
 * `RefreshControl` et `ActivityIndicator` ne rendent ni texte, ni rôle, ni
 * libellé accessible : aucune requête de RNTL ne peut les désigner. Le premier
 * est de surcroît monté comme *frère* du contenu sous `RCTScrollView`, si bien
 * qu'un `fireEvent` émis depuis un descendant ne remonte jamais jusqu'à lui.
 *
 * `UNSAFE_getByType` est donc le seul accès possible ; il reste confiné à ce
 * module pour qu'aucune suite ne dépende de la structure des écrans. Le jour où
 * ces deux primitives recevront un libellé accessible — ce qu'exige WCAG 2.1 AA
 * pour un indicateur d'activité — ce module pourra disparaître.
 */

/** Déclenche le « tirer pour rafraîchir » de l'écran monté. */
export const pullToRefresh = async (): Promise<void> => {
  const control = screen.UNSAFE_getByType(RefreshControl);
  await act(async () => {
    fireEvent(control, "refresh");
  });
};

/** Indique si l'indicateur de rafraîchissement est actuellement affiché. */
export const isRefreshing = (): boolean =>
  screen.UNSAFE_getByType(RefreshControl).props.refreshing === true;

/** Indique si un indicateur d'activité est actuellement affiché. */
export const hasActivityIndicator = (): boolean =>
  screen.UNSAFE_queryAllByType(ActivityIndicator).length > 0;
