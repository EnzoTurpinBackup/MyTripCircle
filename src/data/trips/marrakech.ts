import { TripIdea } from "../tripIdeas";

export const marrakech: TripIdea = {
  id: "8",
  duration: 5,
  difficulty: "moderate",
  destinationCity: "Marrakech",
  destinationCountry: "Morocco",
  highlightsFr: [
    "Médina et souks labyrinthiques",
    "Place Djemaa el-Fna",
    "Jardin Majorelle & musée Yves Saint Laurent",
    "Hammam traditionnel",
    "Désert & bivouac à Ouarzazate",
  ],
  highlightsEn: [
    "Medina and labyrinthine souks",
    "Djemaa el-Fna square",
    "Majorelle Garden & Yves Saint Laurent Museum",
    "Traditional hammam",
    "Desert & bivouac near Ouarzazate",
  ],
  itinerary: [
    {
      day: 1, titleFr: "Arrivée & médina", titleEn: "Arrival & medina",
      activitiesFr: ["Arrivée & riad en médina", "Djemaa el-Fna le soir", "Dîner terrasse avec vue"],
      activitiesEn: ["Arrive & riad check-in", "Djemaa el-Fna at night", "Rooftop terrace dinner"],
    },
    {
      day: 2, titleFr: "Souks & palais", titleEn: "Souks & palaces",
      activitiesFr: ["Souks des teinturiers", "Palais Bahia", "Medersa Ben Youssef"],
      activitiesEn: ["Dyers' souks", "Bahia Palace", "Ben Youssef Madrasa"],
    },
    {
      day: 3, titleFr: "Jardins & culture", titleEn: "Gardens & culture",
      activitiesFr: ["Jardin Majorelle", "Musée Yves Saint Laurent", "Cours de cuisine marocaine"],
      activitiesEn: ["Majorelle Garden", "Yves Saint Laurent Museum", "Moroccan cooking class"],
    },
    {
      day: 4, titleFr: "Essaouira - bord de mer", titleEn: "Essaouira - seaside",
      activitiesFr: ["Route côtière vers Essaouira", "Médina et remparts", "Coucher de soleil sur l'Atlantique"],
      activitiesEn: ["Coastal road to Essaouira", "Medina and ramparts", "Atlantic sunset"],
    },
    {
      day: 5, titleFr: "Hammam & jardin secret", titleEn: "Hammam & secret garden",
      activitiesFr: ["Hammam & massage argan", "Jardin Secret de Marrakech", "Coucher de soleil sur les toits"],
      activitiesEn: ["Hammam & argan massage", "Secret Garden Marrakech", "Rooftop sunset"],
    },
    {
      day: 6, titleFr: "Atlas & cascades d'Ouzoud", titleEn: "Atlas & Ouzoud waterfalls",
      activitiesFr: ["Route vers les cascades d'Ouzoud", "Randonnée & singes barbares", "Village berbère"],
      activitiesEn: ["Drive to Ouzoud waterfalls", "Hike & Barbary macaques", "Berber village"],
    },
    {
      day: 7, titleFr: "Ouarzazate & Casbah", titleEn: "Ouarzazate & Kasbah",
      activitiesFr: ["Route du désert vers Ouarzazate", "Aït Benhaddou (UNESCO)", "Studios de cinéma"],
      activitiesEn: ["Desert road to Ouarzazate", "Aït Benhaddou (UNESCO)", "Film studios"],
    },
    {
      day: 8, titleFr: "Gorges du Dadès", titleEn: "Dadès Gorges",
      activitiesFr: ["Route des Mille Kasbahs", "Gorges du Dadès", "Nuit sous les étoiles"],
      activitiesEn: ["Road of a Thousand Kasbahs", "Dadès Gorges", "Night under the stars"],
    },
    {
      day: 9, titleFr: "Vallée du Drâa", titleEn: "Drâa Valley",
      activitiesFr: ["Palmeraie de Skoura", "Vallée du Drâa", "Oasis de Zagora"],
      activitiesEn: ["Skoura palm grove", "Drâa Valley", "Zagora oasis"],
    },
    {
      day: 10, titleFr: "Bivouac dans le désert", titleEn: "Desert bivouac",
      activitiesFr: ["Balade à dos de dromadaire", "Coucher de soleil sur les dunes", "Nuit en tente berbère"],
      activitiesEn: ["Camel ride in the dunes", "Desert sunset", "Night in a Berber tent"],
    },
    {
      day: 11, titleFr: "Retour Marrakech & palmeraie", titleEn: "Back to Marrakech & palmery",
      activitiesFr: ["Route du retour", "Palmeraie de Marrakech en calèche", "Dîner riad en terrasse"],
      activitiesEn: ["Return drive", "Marrakech palmery carriage ride", "Riad rooftop dinner"],
    },
    {
      day: 12, titleFr: "Artisanat & musées", titleEn: "Crafts & museums",
      activitiesFr: ["Musée de la Palmeraie", "Atelier de poterie berbère", "Fondouk souks"],
      activitiesEn: ["Museum of the Palmery", "Berber pottery workshop", "Fondouk souks"],
    },
    {
      day: 13, titleFr: "Spa & derniers souks", titleEn: "Spa & last souks",
      activitiesFr: ["Journée spa royal hammam", "Souks des épices", "Dîner gastronomique marocain"],
      activitiesEn: ["Royal hammam spa day", "Spice souks", "Gourmet Moroccan dinner"],
    },
    {
      day: 14, titleFr: "Fès - ville impériale", titleEn: "Fès - imperial city",
      activitiesFr: ["Bus ou train vers Fès", "Médina de Fès (UNESCO)", "Tanneries Chouara"],
      activitiesEn: ["Bus or train to Fès", "Fès medina (UNESCO)", "Chouara tanneries"],
    },
    {
      day: 15, titleFr: "Fès - artisanat & madrasa", titleEn: "Fès - crafts & madrasa",
      activitiesFr: ["Madrasa Bou Inania", "Atelier de céramiques de Fès", "Dîner dans un palais restauré"],
      activitiesEn: ["Bou Inania madrasa", "Fès ceramics workshop", "Dinner in a restored palace"],
    },
    {
      day: 16, titleFr: "Meknès & Volubilis", titleEn: "Meknès & Volubilis",
      activitiesFr: ["Cité impériale de Meknès", "Site romain de Volubilis (UNESCO)", "Moulay Idriss - ville sainte"],
      activitiesEn: ["Meknès imperial city", "Volubilis Roman site (UNESCO)", "Moulay Idriss holy town"],
    },
    {
      day: 17, titleFr: "Chefchaouen - ville bleue", titleEn: "Chefchaouen - blue city",
      activitiesFr: ["Route vers Chefchaouen", "Médina bleu et blanc", "Randonnée aux cascades d'Akchour"],
      activitiesEn: ["Drive to Chefchaouen", "Blue and white medina", "Akchour waterfalls hike"],
    },
    {
      day: 18, titleFr: "Tétouan & montagnes du Rif", titleEn: "Tétouan & Rif mountains",
      activitiesFr: ["Tétouan & influence andalouse", "Marché berbère du Rif", "Coucher de soleil sur la Méditerranée"],
      activitiesEn: ["Tétouan & Andalusian influence", "Rif Berber market", "Mediterranean sunset"],
    },
    {
      day: 19, titleFr: "Tanger & détroit de Gibraltar", titleEn: "Tangier & Strait of Gibraltar",
      activitiesFr: ["Tanger - cap Spartel", "Vue Europe-Afrique au détroit", "Café Hafa légendaire"],
      activitiesEn: ["Tangier - Cap Spartel", "Europe-Africa strait view", "Legendary Café Hafa"],
    },
    {
      day: 20, titleFr: "Casablanca - mosquée Hassan II", titleEn: "Casablanca - Hassan II mosque",
      activitiesFr: ["Mosquée Hassan II (3ème plus grande du monde)", "Corniche de Casablanca", "Quartier Art Déco"],
      activitiesEn: ["Hassan II Mosque (3rd largest)", "Casablanca corniche", "Art Deco district"],
    },
    {
      day: 21, titleFr: "Rabat - capitale royale", titleEn: "Rabat - royal capital",
      activitiesFr: ["Tour Hassan & Mausolée Mohammed V", "Kasbah des Oudayas", "Chellah - nécropole romaine"],
      activitiesEn: ["Hassan Tower & Mohammed V Mausoleum", "Oudayas Kasbah", "Chellah Roman necropolis"],
    },
    {
      day: 22, titleFr: "Agadir & plage", titleEn: "Agadir & beach",
      activitiesFr: ["Vol ou bus vers Agadir", "Plage d'Agadir (10 km)", "Souk El Had"],
      activitiesEn: ["Flight or bus to Agadir", "Agadir beach (10 km)", "Souk El Had"],
    },
    {
      day: 23, titleFr: "Taroudant - remparts", titleEn: "Taroudant - ramparts",
      activitiesFr: ["Taroudant & remparts de pisé", "Marché berbère antique", "Palmeraie de la Souss"],
      activitiesEn: ["Taroudant & pisé ramparts", "Ancient Berber market", "Souss palm grove"],
    },
    {
      day: 24, titleFr: "Anti-Atlas & Tafraoute", titleEn: "Anti-Atlas & Tafraoute",
      activitiesFr: ["Paysage lunaire de l'Anti-Atlas", "Tafraoute & rochers peints", "Amandiers en fleurs"],
      activitiesEn: ["Lunar Anti-Atlas landscape", "Tafraoute & painted rocks", "Almond blossom"],
    },
    {
      day: 25, titleFr: "Retour Marrakech - palmeraie", titleEn: "Back to Marrakech - palmery",
      activitiesFr: ["Route du retour à Marrakech", "Palmeraie en calèche", "Piscine & coucher de soleil"],
      activitiesEn: ["Return drive to Marrakech", "Palmery carriage ride", "Pool & sunset"],
    },
    {
      day: 26, titleFr: "Cours de musique gnawa", titleEn: "Gnawa music workshop",
      activitiesFr: ["Atelier musique gnawa", "Percussion & krakeb", "Soirée musicale traditionnelle"],
      activitiesEn: ["Gnawa music workshop", "Percussion & krakeb", "Traditional music evening"],
    },
    {
      day: 27, titleFr: "Quad dans le désert de l'Atlas", titleEn: "Quad in the Atlas desert",
      activitiesFr: ["Excursion quad dans les dunes de l'Atlas", "Bivouac berbère", "Thé à la menthe au lever du soleil"],
      activitiesEn: ["Atlas dunes quad excursion", "Berber bivouac", "Sunrise mint tea"],
    },
    {
      day: 28, titleFr: "Souk de la poterie & cuir", titleEn: "Pottery & leather souk",
      activitiesFr: ["Souk des potiers de Marrakech", "Maroquinerie & négociation", "Atelier de mosaïque zellige"],
      activitiesEn: ["Marrakech potters souk", "Leatherwork & bargaining", "Zellige mosaic workshop"],
    },
    {
      day: 29, titleFr: "Dernier dîner sur les toits", titleEn: "Last rooftop dinner",
      activitiesFr: ["Spa hammam royal", "Derniers souks du soir", "Dîner panoramique sur un rooftop"],
      activitiesEn: ["Royal hammam spa", "Last evening souks", "Panoramic rooftop dinner"],
    },
    {
      day: 30, titleFr: "Hammam & départ", titleEn: "Hammam & departure",
      activitiesFr: ["Hammam matinal", "Dernier tour des souks", "Transfert aéroport"],
      activitiesEn: ["Morning hammam", "Last souk stroll", "Airport transfer"],
    },
  ],
  suggestedBookings: [
    { type: "flight", titleFr: "Vol aller-retour → Marrakech", titleEn: "Round-trip flight → Marrakech", estimatedPrice: 200, currency: "€", placeSearchQuery: "Aeroport Marrakech Menara Morocco" },
    { type: "hotel", titleFr: "Riad en médina (5 nuits)", titleEn: "Medina riad (5 nights)", estimatedPrice: 500, currency: "€", placeSearchQuery: "La Mamounia Hotel Marrakech Medina Morocco" },
    { type: "activity", titleFr: "Cours de cuisine marocaine", titleEn: "Moroccan cooking class", estimatedPrice: 50, currency: "€", placeSearchQuery: "Jardin Majorelle Marrakech Morocco" },
    { type: "restaurant", titleFr: "Dîner traditionnel avec spectacle", titleEn: "Traditional dinner with show", estimatedPrice: 40, currency: "€", placeSearchQuery: "Le Jardin Restaurant Marrakech Morocco" },
  ],
};
