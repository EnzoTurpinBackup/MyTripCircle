import { TripIdea } from "../tripIdeas";

export const islande: TripIdea = {
  id: "9",
  duration: 8,
  difficulty: "adventurous",
  destinationCity: "Reykjavik",
  destinationCountry: "Iceland",
  highlightsFr: [
    "Aurores boréales (sept. à mars)",
    "Cercle d'Or : geyser Strokkur & cascade Gullfoss",
    "Randonnée sur glacier",
    "Lagune glaciaire de Jökulsárlón",
    "Péninsule de Snæfellsnes",
  ],
  highlightsEn: [
    "Northern lights (Sept to March)",
    "Golden Circle: Strokkur geyser & Gullfoss falls",
    "Glacier hiking",
    "Jökulsárlón glacier lagoon",
    "Snæfellsnes peninsula",
  ],
  itinerary: [
    {
      day: 1, titleFr: "Arrivée à Reykjavik", titleEn: "Arrival in Reykjavik",
      activitiesFr: ["Arrivée à Keflavik", "Hallgrímskirkja", "Vieux port Grandi"],
      activitiesEn: ["Arrive at Keflavik", "Hallgrímskirkja church", "Grandi old harbour"],
    },
    {
      day: 2, titleFr: "Cercle d'Or", titleEn: "Golden Circle",
      activitiesFr: ["Parc national de Þingvellir", "Geyser Strokkur", "Cascade Gullfoss"],
      activitiesEn: ["Þingvellir National Park", "Strokkur geyser", "Gullfoss waterfall"],
    },
    {
      day: 3, titleFr: "Côte sud", titleEn: "South Coast",
      activitiesFr: ["Cascade Seljalandsfoss", "Cascade Skógafoss", "Plage de sable noir de Vík"],
      activitiesEn: ["Seljalandsfoss waterfall", "Skógafoss waterfall", "Vík black sand beach"],
    },
    {
      day: 4, titleFr: "Glacier & lagune", titleEn: "Glacier & lagoon",
      activitiesFr: ["Randonnée sur glacier Vatnajökull", "Lagune glaciaire Jökulsárlón", "Plage Diamond Beach"],
      activitiesEn: ["Vatnajökull glacier hike", "Jökulsárlón glacier lagoon", "Diamond Beach"],
    },
    {
      day: 5, titleFr: "Péninsule de Snæfellsnes", titleEn: "Snæfellsnes Peninsula",
      activitiesFr: ["Glacier Snæfellsjökull", "Village de pêcheurs Arnarstapi", "Grottes de lave"],
      activitiesEn: ["Snæfellsjökull glacier", "Arnarstapi fishing village", "Lava caves"],
    },
    {
      day: 6, titleFr: "Chasse aux aurores boréales", titleEn: "Northern lights hunt",
      activitiesFr: ["Randonnée à cheval", "Thermes géothermaux", "Tour aurores boréales nocturne"],
      activitiesEn: ["Horseback riding", "Geothermal hot springs", "Northern lights night tour"],
    },
    {
      day: 7, titleFr: "Blue Lagoon & Reykjavik", titleEn: "Blue Lagoon & Reykjavik",
      activitiesFr: ["Blue Lagoon geothermal spa", "Retour à Reykjavik", "Restaurants locaux"],
      activitiesEn: ["Blue Lagoon geothermal spa", "Return to Reykjavik", "Local restaurants"],
    },
    {
      day: 8, titleFr: "Blue Lagoon & Reykjavik", titleEn: "Blue Lagoon & Reykjavik",
      activitiesFr: ["Blue Lagoon geothermal spa", "Retour à Reykjavik", "Restaurants locaux"],
      activitiesEn: ["Blue Lagoon geothermal spa", "Return to Reykjavik", "Local restaurants"],
    },
    {
      day: 9, titleFr: "Fjords de l'Ouest", titleEn: "Westfjords",
      activitiesFr: ["Route panoramique des Westfjords", "Ísafjörður & fjords sauvages", "Aurores boréales nocturnes"],
      activitiesEn: ["Westfjords scenic drive", "Ísafjörður & wild fjords", "Northern lights at night"],
    },
    {
      day: 10, titleFr: "Akureyri - capitale du Nord", titleEn: "Akureyri - northern capital",
      activitiesFr: ["Vol vers Akureyri", "Botanical Garden arctique", "Ski ou randonnée en montagne"],
      activitiesEn: ["Flight to Akureyri", "Arctic botanical garden", "Mountain ski or hike"],
    },
    {
      day: 11, titleFr: "Lac Mývatn", titleEn: "Lake Mývatn",
      activitiesFr: ["Lac Mývatn & pseudocraters", "Bains de Mývatn Nature Baths", "Champs de lave de Dimmuborgir"],
      activitiesEn: ["Mývatn lake & pseudocraters", "Mývatn Nature Baths", "Dimmuborgir lava fields"],
    },
    {
      day: 12, titleFr: "Est de l'Islande", titleEn: "East Iceland",
      activitiesFr: ["Fjords de l'Est", "Village de Seyðisfjörður", "Observation rennes sauvages"],
      activitiesEn: ["East Fjords", "Seyðisfjörður village", "Wild reindeer watching"],
    },
    {
      day: 13, titleFr: "Cascades & chevaux islandais", titleEn: "Waterfalls & Icelandic horses",
      activitiesFr: ["Cascade Háifoss", "Balade à cheval islandais", "Thermes secrets de la campagne"],
      activitiesEn: ["Háifoss waterfall", "Icelandic horse ride", "Hidden countryside hot springs"],
    },
    {
      day: 14, titleFr: "Hautes terres - Landmannalaugar", titleEn: "Highlands - Landmannalaugar",
      activitiesFr: ["4x4 vers les hautes terres", "Montagnes rhyolites multicolores", "Sources géothermales naturelles"],
      activitiesEn: ["4x4 to the highlands", "Multicoloured rhyolite mountains", "Natural geothermal springs"],
    },
    {
      day: 15, titleFr: "Trek Laugavegur", titleEn: "Laugavegur trek",
      activitiesFr: ["Trek Laugavegur (étape 1)", "Paysages de lune volcanique", "Nuit en refuge de montagne"],
      activitiesEn: ["Laugavegur trek (stage 1)", "Volcanic moonscape", "Mountain hut overnight"],
    },
    {
      day: 16, titleFr: "Þórsmörk - vallée des dieux", titleEn: "Þórsmörk - valley of the gods",
      activitiesFr: ["Trek vers Þórsmörk", "Gorges vertes & glaciers", "Rivières glaciaires à traverser"],
      activitiesEn: ["Trek to Þórsmörk", "Green gorges & glaciers", "Glacial river crossings"],
    },
    {
      day: 17, titleFr: "Vestmannaeyjar - îles volcaniques", titleEn: "Vestmannaeyjar - volcanic islands",
      activitiesFr: ["Ferry vers les îles Vestmann", "Eldfell - volcan de 1973", "Colonie de macareux moine"],
      activitiesEn: ["Ferry to Vestmannaeyjar", "Eldfell - 1973 volcano", "Puffin colony"],
    },
    {
      day: 18, titleFr: "Iles Féroé - Tórshavn", titleEn: "Faroe Islands - Tórshavn",
      activitiesFr: ["Vol vers les îles Féroé", "Tórshavn & toits en gazon", "Falaises de Vestmanna"],
      activitiesEn: ["Flight to Faroe Islands", "Tórshavn & grass-roofed houses", "Vestmanna cliffs"],
    },
    {
      day: 19, titleFr: "Iles Féroé - paysages", titleEn: "Faroe Islands - landscapes",
      activitiesFr: ["Lac Sørvágsvatn en falaise", "Village de Gásadalur", "Cascade Múlafossur"],
      activitiesEn: ["Clifftop lake Sørvágsvatn", "Gásadalur village", "Múlafossur waterfall"],
    },
    {
      day: 20, titleFr: "Retour & soleil de minuit", titleEn: "Return & midnight sun",
      activitiesFr: ["Retour à Reykjavik", "Soleil de minuit (été) ou aurores (hiver)", "Fête locale islandaise"],
      activitiesEn: ["Return to Reykjavik", "Midnight sun (summer) or auroras (winter)", "Local Icelandic celebration"],
    },
    {
      day: 21, titleFr: "Cuisine géothermale", titleEn: "Geothermal cooking",
      activitiesFr: ["Cuisson géothermale en terre", "Atelier Skyr & pain volcanique", "Repas gastronomique nordique"],
      activitiesEn: ["Underground geothermal cooking", "Skyr & volcanic bread workshop", "Nordic gourmet dinner"],
    },
    {
      day: 22, titleFr: "Observation des baleines", titleEn: "Whale watching",
      activitiesFr: ["Tour d'observation des baleines", "Baleines boréales & dauphins", "Retour & soupe de homard"],
      activitiesEn: ["Whale watching tour", "Bowhead whales & dolphins", "Return & lobster soup"],
    },
    {
      day: 23, titleFr: "Festival viking", titleEn: "Viking festival",
      activitiesFr: ["Musée viking de Hafnarfjörður", "Reconstitution historique", "Banquet viking"],
      activitiesEn: ["Hafnarfjörður Viking museum", "Historical reenactment", "Viking banquet"],
    },
    {
      day: 24, titleFr: "Groenland - day trip", titleEn: "Greenland - day trip",
      activitiesFr: ["Vol vers Kulusuk (Groenland)", "Glacier inlandsis", "Rencontre chasseurs inuits"],
      activitiesEn: ["Flight to Kulusuk (Greenland)", "Inlandsis glacier", "Inuit hunters encounter"],
    },
    {
      day: 25, titleFr: "Thermes secrets ruraux", titleEn: "Rural secret hot springs",
      activitiesFr: ["Pot hors des sentiers battus", "Hot pot naturel secret", "Pique-nique géothermal"],
      activitiesEn: ["Off-the-beaten-path hot pot", "Secret natural hot pot", "Geothermal picnic"],
    },
    {
      day: 26, titleFr: "Art & design islandais", titleEn: "Icelandic art & design",
      activitiesFr: ["Musée national d'Islande", "Galeries d'art contemporain", "Atelier de laine lopapeysa"],
      activitiesEn: ["National Museum of Iceland", "Contemporary art galleries", "Lopapeysa wool workshop"],
    },
    {
      day: 27, titleFr: "Équitation & nature", titleEn: "Horse riding & nature",
      activitiesFr: ["Randonnée à cheval islandais 4h", "Vallées volcaniques isolées", "Soupe d'agneau islandais"],
      activitiesEn: ["4h Icelandic horse riding", "Isolated volcanic valleys", "Icelandic lamb soup"],
    },
    {
      day: 28, titleFr: "Bain thermal & aurora finale", titleEn: "Thermal bath & final aurora",
      activitiesFr: ["Hammam nordique Sky Lagoon", "Dernier tour aurora boréale", "Photographie de nuit"],
      activitiesEn: ["Sky Lagoon Nordic hammam", "Last northern lights tour", "Night photography"],
    },
    {
      day: 29, titleFr: "Reykjavik - vie nocturne", titleEn: "Reykjavik - nightlife",
      activitiesFr: ["Bar Laugavegur Street", "Musique live islandaise", "Adieux au pays de feu et de glace"],
      activitiesEn: ["Laugavegur Street bars", "Live Icelandic music", "Farewell to the land of fire & ice"],
    },
    {
      day: 30, titleFr: "Dernier matin & départ", titleEn: "Last morning & departure",
      activitiesFr: ["Marché local de Reykjavik", "Musée de la saga viking", "Transfert aéroport"],
      activitiesEn: ["Reykjavik local market", "Viking saga museum", "Airport transfer"],
    },
  ],
  suggestedBookings: [
    { type: "flight", titleFr: "Vol aller-retour → Reykjavik (KEF)", titleEn: "Round-trip flight → Reykjavik (KEF)", estimatedPrice: 350, currency: "€", placeSearchQuery: "Keflavik International Airport Iceland" },
    { type: "hotel", titleFr: "Hébergements Ring Road (8 nuits)", titleEn: "Ring Road accommodations (8 nights)", estimatedPrice: 1500, currency: "€", placeSearchQuery: "Ion Adventure Hotel Nesjavellir Iceland" },
    { type: "activity", titleFr: "Randonnée glacier Vatnajökull", titleEn: "Vatnajökull glacier hike", estimatedPrice: 90, currency: "€", placeSearchQuery: "Jokulsarlon Glacier Lagoon Iceland" },
    { type: "activity", titleFr: "Tour aurores boréales", titleEn: "Northern lights tour", estimatedPrice: 70, currency: "€", placeSearchQuery: "Aurora Reykjavik Northern Lights Center Iceland" },
  ],
};
