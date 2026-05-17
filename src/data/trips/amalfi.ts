import { TripIdea } from "../tripIdeas";

export const amalfi: TripIdea = {
  id: "10",
  duration: 7,
  difficulty: "moderate",
  destinationCity: "Amalfi",
  destinationCountry: "Italy",
  highlightsFr: [
    "Route panoramique de la côte amalfitaine",
    "Positano et ses maisons colorées",
    "Île de Capri & Grotte Bleue",
    "Ruines de Pompéi",
    "Limoncellos & cuisine napolitaine",
  ],
  highlightsEn: [
    "Panoramic Amalfi Coast drive",
    "Positano and its colorful houses",
    "Capri island & Blue Grotto",
    "Pompeii ruins",
    "Limoncello & Neapolitan cuisine",
  ],
  itinerary: [
    {
      day: 1, titleFr: "Naples - arrivée", titleEn: "Naples - arrival",
      activitiesFr: ["Arrivée à Naples", "Pizza napolitaine originale", "Quartier Spaccanapoli"],
      activitiesEn: ["Arrive in Naples", "Original Neapolitan pizza", "Spaccanapoli district"],
    },
    {
      day: 2, titleFr: "Amalfi & côte", titleEn: "Amalfi & the coast",
      activitiesFr: ["Route côtière panoramique", "Cathédrale d'Amalfi", "Baignade dans les criques"],
      activitiesEn: ["Panoramic coastal road", "Amalfi cathedral", "Swimming in coves"],
    },
    {
      day: 3, titleFr: "Positano", titleEn: "Positano",
      activitiesFr: ["Positano & ses ruelles", "Plage Fornillo", "Coucher de soleil en terrasse"],
      activitiesEn: ["Positano & its alleys", "Fornillo beach", "Terrace sunset"],
    },
    {
      day: 4, titleFr: "Ravello & villa Cimbrone", titleEn: "Ravello & Villa Cimbrone",
      activitiesFr: ["Villa Cimbrone & terrasse de l'infini", "Ravello & musique classique", "Randonnée chemin des dieux"],
      activitiesEn: ["Villa Cimbrone & infinity terrace", "Ravello classical music", "Path of the Gods hike"],
    },
    {
      day: 5, titleFr: "Capri", titleEn: "Capri",
      activitiesFr: ["Ferry pour Capri", "Grotte Bleue", "Villa San Michele & jardins"],
      activitiesEn: ["Ferry to Capri", "Blue Grotto", "Villa San Michele & gardens"],
    },
    {
      day: 6, titleFr: "Pompéi", titleEn: "Pompeii",
      activitiesFr: ["Ruines de Pompéi", "Mont Vésuve", "Retour côte amalfitaine"],
      activitiesEn: ["Pompeii ruins", "Mount Vesuvius", "Return to Amalfi Coast"],
    },
    {
      day: 7, titleFr: "Sorrente & limoncellos", titleEn: "Sorrento & limoncello",
      activitiesFr: ["Sorrente & limoncello", "Dégustation huile d'olive", "Marché couvert local"],
      activitiesEn: ["Sorrento & limoncello", "Olive oil tasting", "Local covered market"],
    },
    {
      day: 8, titleFr: "Île d'Ischia", titleEn: "Ischia island",
      activitiesFr: ["Ferry pour Ischia", "Thermes naturels Poseidon", "Castello Aragonese"],
      activitiesEn: ["Ferry to Ischia", "Poseidon natural thermal baths", "Aragonese Castle"],
    },
    {
      day: 9, titleFr: "Paestum & temples grecs", titleEn: "Paestum & Greek temples",
      activitiesFr: ["Temples grecs de Paestum (UNESCO)", "Mozzarella de bufflonne fermière", "Plages sauvages du Cilento"],
      activitiesEn: ["Paestum Greek temples (UNESCO)", "Farm buffalo mozzarella", "Wild Cilento beaches"],
    },
    {
      day: 10, titleFr: "Herculanum", titleEn: "Herculaneum",
      activitiesFr: ["Ruines d'Herculanum", "Vesuvio winery", "Balade dans Ercolano"],
      activitiesEn: ["Herculaneum ruins", "Vesuvio winery", "Ercolano stroll"],
    },
    {
      day: 11, titleFr: "Côte du Cilento", titleEn: "Cilento Coast",
      activitiesFr: ["Grotte marine de Castelcivita", "Plage de Palinuro", "Dîner fruits de mer"],
      activitiesEn: ["Castelcivita sea caves", "Palinuro beach", "Fresh seafood dinner"],
    },
    {
      day: 12, titleFr: "Salerne & Ravello revisité", titleEn: "Salerno & back to Ravello",
      activitiesFr: ["Centre historique de Salerne", "Villa Rufolo à Ravello", "Concert en plein air"],
      activitiesEn: ["Salerno historic centre", "Villa Rufolo in Ravello", "Open-air concert"],
    },
    {
      day: 13, titleFr: "Naples - gastronomie", titleEn: "Naples - gastronomy",
      activitiesFr: ["Tour gastronomique à Naples", "Pizzeria storica Brandi", "Quartieri Spagnoli"],
      activitiesEn: ["Naples food tour", "Historic Brandi pizzeria", "Quartieri Spagnoli"],
    },
    {
      day: 14, titleFr: "Rome - arrivée éternelle", titleEn: "Rome - eternal city arrival",
      activitiesFr: ["Train vers Rome", "Fontaine de Trevi & Panthéon", "Pasta cacio e pepe à Trastevere"],
      activitiesEn: ["Train to Rome", "Trevi Fountain & Pantheon", "Cacio e pepe pasta in Trastevere"],
    },
    {
      day: 15, titleFr: "Vatican & Chapelle Sixtine", titleEn: "Vatican & Sistine Chapel",
      activitiesFr: ["Musées du Vatican", "Chapelle Sixtine (Michel-Ange)", "Basilique Saint-Pierre & coupole"],
      activitiesEn: ["Vatican Museums", "Sistine Chapel (Michelangelo)", "St. Peter's Basilica & dome"],
    },
    {
      day: 16, titleFr: "Colisée & Forum romain", titleEn: "Colosseum & Roman Forum",
      activitiesFr: ["Colisée (accès arène)", "Forum romain & Palatin", "Soirée à Campo de' Fiori"],
      activitiesEn: ["Colosseum (arena floor access)", "Roman Forum & Palatine Hill", "Evening at Campo de' Fiori"],
    },
    {
      day: 17, titleFr: "Toscane - Florence", titleEn: "Tuscany - Florence",
      activitiesFr: ["Train vers Florence", "Galerie des Offices", "Ponte Vecchio & gelato"],
      activitiesEn: ["Train to Florence", "Uffizi Gallery", "Ponte Vecchio & gelato"],
    },
    {
      day: 18, titleFr: "Chianti & vignobles toscans", titleEn: "Chianti & Tuscan vineyards",
      activitiesFr: ["Route du Chianti en voiture", "Dégustation Brunello & Chianti Classico", "Villa médicéenne"],
      activitiesEn: ["Chianti wine road by car", "Brunello & Chianti Classico tasting", "Medici villa"],
    },
    {
      day: 19, titleFr: "Sienne & San Gimignano", titleEn: "Siena & San Gimignano",
      activitiesFr: ["Piazza del Campo de Sienne", "Tours médiévales de San Gimignano", "Dégustation vernaccia"],
      activitiesEn: ["Siena's Piazza del Campo", "San Gimignano medieval towers", "Vernaccia wine tasting"],
    },
    {
      day: 20, titleFr: "Cinque Terre", titleEn: "Cinque Terre",
      activitiesFr: ["Train vers les Cinque Terre", "Randonnée Monterosso-Vernazza", "Baignade dans les criques"],
      activitiesEn: ["Train to Cinque Terre", "Monterosso-Vernazza hike", "Swimming in coves"],
    },
    {
      day: 21, titleFr: "Portofino & Camogli", titleEn: "Portofino & Camogli",
      activitiesFr: ["Portofino & yachts de luxe", "Village coloré de Camogli", "Bateau vers les grottes marines"],
      activitiesEn: ["Portofino & luxury yachts", "Camogli colourful village", "Boat to sea caves"],
    },
    {
      day: 22, titleFr: "Milan - mode & design", titleEn: "Milan - fashion & design",
      activitiesFr: ["Train vers Milan", "Duomo & toit panoramique", "Galleria Vittorio Emanuele II"],
      activitiesEn: ["Train to Milan", "Duomo & rooftop terrace", "Galleria Vittorio Emanuele II"],
    },
    {
      day: 23, titleFr: "Lac de Côme", titleEn: "Lake Como",
      activitiesFr: ["Train & bateau vers Côme", "Villa del Balbianello", "Varenna & Bellagio"],
      activitiesEn: ["Train & boat to Como", "Villa del Balbianello", "Varenna & Bellagio"],
    },
    {
      day: 24, titleFr: "Venise - canaux", titleEn: "Venice - canals",
      activitiesFr: ["Train vers Venise", "Grand Canal en vaporetto", "Rialto & San Marco"],
      activitiesEn: ["Train to Venice", "Grand Canal by vaporetto", "Rialto & San Marco"],
    },
    {
      day: 25, titleFr: "Venise - îles", titleEn: "Venice - islands",
      activitiesFr: ["Gondole & sérénissime", "Murano & souffleurs de verre", "Burano & dentelles colorées"],
      activitiesEn: ["Gondola & La Serenissima", "Murano glassblowers", "Burano lace & coloured houses"],
    },
    {
      day: 26, titleFr: "Bologne la gourmande", titleEn: "Bologna the foodie city",
      activitiesFr: ["Train vers Bologne", "Marchés de la vieille ville", "Dégustation mortadelle & lasagne"],
      activitiesEn: ["Train to Bologna", "Old town markets", "Mortadella & lasagne tasting"],
    },
    {
      day: 27, titleFr: "Pise & tour penchée", titleEn: "Pisa & leaning tower",
      activitiesFr: ["Tour penchée de Pise", "Piazza dei Miracoli", "Retour côte amalfitaine"],
      activitiesEn: ["Pisa leaning tower", "Piazza dei Miracoli", "Return to Amalfi Coast"],
    },
    {
      day: 28, titleFr: "Paestum & mozzarella finale", titleEn: "Paestum & final mozzarella",
      activitiesFr: ["Dernière visite Paestum", "Ferme de bufflonne artisanale", "Déjeuner gastronomique"],
      activitiesEn: ["Final Paestum visit", "Artisanal buffalo farm", "Gourmet lunch"],
    },
    {
      day: 29, titleFr: "Spa côtier & adieux", titleEn: "Coastal spa & farewells",
      activitiesFr: ["Spa thermal côtier", "Dernier coucher de soleil amalfitain", "Dîner d'adieu gastronomique"],
      activitiesEn: ["Coastal thermal spa", "Last Amalfi sunset", "Farewell gourmet dinner"],
    },
    {
      day: 30, titleFr: "Sorrente & départ", titleEn: "Sorrento & departure",
      activitiesFr: ["Marché local matinal", "Shopping souvenirs", "Transfert Naples aéroport"],
      activitiesEn: ["Local morning market", "Souvenir shopping", "Naples airport transfer"],
    },
  ],
  suggestedBookings: [
    { type: "flight", titleFr: "Vol aller-retour → Naples (NAP)", titleEn: "Round-trip flight → Naples (NAP)", estimatedPrice: 250, currency: "€", placeSearchQuery: "Naples International Airport Capodichino Italy" },
    { type: "hotel", titleFr: "Hôtels côte amalfitaine (7 nuits)", titleEn: "Amalfi Coast hotels (7 nights)", estimatedPrice: 1400, currency: "€", placeSearchQuery: "Hotel Santa Caterina Amalfi Italy" },
    { type: "activity", titleFr: "Excursion en bateau côte + Capri", titleEn: "Boat tour coast + Capri", estimatedPrice: 110, currency: "€", placeSearchQuery: "Porto di Amalfi Italy" },
    { type: "restaurant", titleFr: "Dîner gastronomique vue mer", titleEn: "Gourmet seafront dinner", estimatedPrice: 80, currency: "€", placeSearchQuery: "La Sponda Restaurant Positano Italy" },
  ],
};
