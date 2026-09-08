/**
 * Mentions légales : éditeur, hébergeur, traitement des données et propriété
 * intellectuelle, informations dont la publication est obligatoire.
 *
 * Atteintes depuis la section « Confidentialité » des réglages, la route étant
 * déclarée dans la pile racine hors de la barrière d'authentification. Les
 * quatre sections viennent des fichiers i18n embarqués et LegalScreen les
 * présente. La date de mise à jour est laissée vide, à la différence des CGU et
 * de la politique de confidentialité : ces mentions ne sont pas versionnées.
 */
import React from "react";
import { useTranslation } from "react-i18next";
import LegalScreen from "../components/LegalScreen";

export default function LegalNoticeScreen() {
  const { t } = useTranslation();

  const sections = [
    { title: t("legalNotice.publisherTitle"),     body: t("legalNotice.publisherBody") },
    { title: t("legalNotice.hostingTitle"),       body: t("legalNotice.hostingBody") },
    { title: t("legalNotice.dataTitle"),          body: t("legalNotice.dataBody") },
    { title: t("legalNotice.intellectualTitle"),  body: t("legalNotice.intellectualBody") },
  ];

  return (
    <LegalScreen
      headerTitle={t("legalNotice.title")}
      lastUpdated=""
      sections={sections}
    />
  );
}
