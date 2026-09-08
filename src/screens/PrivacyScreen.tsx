/**
 * Politique de confidentialité : texte de référence sur le traitement des
 * données personnelles.
 *
 * Atteinte sans être authentifié depuis le consentement du premier lancement et
 * l'écran d'authentification, et une fois connecté depuis les réglages comme
 * depuis la gestion des consentements. Ses onze sections viennent des fichiers
 * i18n embarqués, ce qui la rend consultable hors connexion — condition pour
 * qu'elle reste opposable —, et LegalScreen en assure la présentation.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import LegalScreen from "../components/LegalScreen";

export default function PrivacyScreen() {
  const { t } = useTranslation();

  const sections = [
    { title: t("privacy.s1Title"),  body: t("privacy.s1Body") },
    { title: t("privacy.s2Title"),  body: t("privacy.s2Body") },
    { title: t("privacy.s3Title"),  body: t("privacy.s3Body") },
    { title: t("privacy.s4Title"),  body: t("privacy.s4Body") },
    { title: t("privacy.s5Title"),  body: t("privacy.s5Body") },
    { title: t("privacy.s6Title"),  body: t("privacy.s6Body") },
    { title: t("privacy.s7Title"),  body: t("privacy.s7Body") },
    { title: t("privacy.s8Title"),  body: t("privacy.s8Body") },
    { title: t("privacy.s9Title"),  body: t("privacy.s9Body") },
    { title: t("privacy.s10Title"), body: t("privacy.s10Body") },
    { title: t("privacy.s11Title"), body: t("privacy.s11Body") },
  ];

  return (
    <LegalScreen
      headerTitle={t("privacy.headerTitle")}
      lastUpdated={t("privacy.lastUpdated")}
      sections={sections}
    />
  );
}
