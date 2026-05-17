import { TripIdea } from "../tripIdeas";

export const kyoto: TripIdea = {
  id: "4",
  duration: 8,
  difficulty: "easy",
  destinationCity: "Kyoto",
  destinationCountry: "Japan",
  highlightsFr: [
    "10 000 torii du sanctuaire Fushimi Inari",
    "Bambouseraie d'Arashiyama",
    "Cérémonie du thé traditionnelle",
    "Quartier de Gion & geishas",
    "Temples et jardins zen",
  ],
  highlightsEn: [
    "10,000 torii gates at Fushimi Inari",
    "Arashiyama bamboo grove",
    "Traditional tea ceremony",
    "Gion geisha district",
    "Zen temples and gardens",
  ],
  itinerary: [
    {
      day: 1, titleFr: "Arrivée & Higashiyama", titleEn: "Arrival & Higashiyama",
      activitiesFr: ["Arrivée à Osaka / train Shinkansen", "Quartier Higashiyama", "Temple Kiyomizudera"],
      activitiesEn: ["Arrive at Osaka / Shinkansen train", "Higashiyama district", "Kiyomizudera temple"],
    },
    {
      day: 2, titleFr: "Fushimi Inari", titleEn: "Fushimi Inari",
      activitiesFr: ["Lever du soleil à Fushimi Inari", "Randonnée dans les torii", "Marché Nishiki"],
      activitiesEn: ["Fushimi Inari at sunrise", "Torii gate hike", "Nishiki market"],
    },
    {
      day: 3, titleFr: "Arashiyama", titleEn: "Arashiyama",
      activitiesFr: ["Bambouseraie d'Arashiyama", "Temple Tenryuji", "Balade en bateau sur l'Oi"],
      activitiesEn: ["Arashiyama bamboo grove", "Tenryuji temple", "Oi River boat ride"],
    },
    {
      day: 4, titleFr: "Nara - cerfs sacrés", titleEn: "Nara - sacred deer",
      activitiesFr: ["Train vers Nara", "Parc aux cerfs", "Grand Bouddha Todaiji"],
      activitiesEn: ["Train to Nara", "Deer park", "Todaiji Great Buddha"],
    },
    {
      day: 5, titleFr: "Cérémonie du thé & Gion", titleEn: "Tea ceremony & Gion",
      activitiesFr: ["Cérémonie du thé japonaise", "Temple Kinkakuji (pavillon d'or)", "Quartier Gion le soir"],
      activitiesEn: ["Japanese tea ceremony", "Kinkakuji Golden Pavilion", "Gion district at night"],
    },
    {
      day: 6, titleFr: "Osaka day trip", titleEn: "Osaka day trip",
      activitiesFr: ["Château d'Osaka", "Dotonbori & street food", "Shinsaibashi shopping"],
      activitiesEn: ["Osaka Castle", "Dotonbori street food", "Shinsaibashi shopping"],
    },
    {
      day: 7, titleFr: "Temples & jardins zen", titleEn: "Zen temples & gardens",
      activitiesFr: ["Temple Ryoanji & jardin zen", "Temple Daitokuji", "Cours de cuisine japonaise"],
      activitiesEn: ["Ryoanji zen garden", "Daitokuji temple complex", "Japanese cooking class"],
    },
    {
      day: 8, titleFr: "Temples & jardins zen", titleEn: "Zen temples & gardens",
      activitiesFr: ["Temple Ryoanji & jardin zen", "Temple Daitokuji", "Cours de cuisine japonaise"],
      activitiesEn: ["Ryoanji zen garden", "Daitokuji temple complex", "Japanese cooking class"],
    },
    {
      day: 9, titleFr: "Hakone & Mont Fuji", titleEn: "Hakone & Mount Fuji",
      activitiesFr: ["Shinkansen vers Hakone", "Vue sur le Mont Fuji", "Onsen avec vue sur le lac Ashi"],
      activitiesEn: ["Shinkansen to Hakone", "Mount Fuji views", "Lake Ashi onsen"],
    },
    {
      day: 10, titleFr: "Hiroshima & Miyajima", titleEn: "Hiroshima & Miyajima",
      activitiesFr: ["Mémorial de la paix d'Hiroshima", "Île de Miyajima", "Torii flottant d'Itsukushima"],
      activitiesEn: ["Hiroshima Peace Memorial", "Miyajima island", "Itsukushima floating torii"],
    },
    {
      day: 11, titleFr: "Tokyo - découverte", titleEn: "Tokyo - discovery",
      activitiesFr: ["Shinkansen Tokyo", "Quartier Asakusa & temple Senso-ji", "Shibuya crossing"],
      activitiesEn: ["Shinkansen to Tokyo", "Asakusa & Senso-ji temple", "Shibuya crossing"],
    },
    {
      day: 12, titleFr: "Tokyo - Harajuku & Akihabara", titleEn: "Tokyo - Harajuku & Akihabara",
      activitiesFr: ["Harajuku & mode japonaise", "Parc Yoyogi", "Akihabara & culture geek"],
      activitiesEn: ["Harajuku Japanese fashion", "Yoyogi park", "Akihabara geek culture"],
    },
    {
      day: 13, titleFr: "Tokyo - Shinjuku & Ginza", titleEn: "Tokyo - Shinjuku & Ginza",
      activitiesFr: ["Jardin national Shinjuku Gyoen", "Tour de Tokyo", "Shopping haut de gamme à Ginza"],
      activitiesEn: ["Shinjuku Gyoen national garden", "Tokyo Tower", "Ginza luxury shopping"],
    },
    {
      day: 14, titleFr: "Nikko & temples laqués", titleEn: "Nikko & lacquered temples",
      activitiesFr: ["Train vers Nikko", "Tōshō-gū (UNESCO)", "Chute Kegon & lac Chūzenji"],
      activitiesEn: ["Train to Nikko", "Tōshō-gū shrine (UNESCO)", "Kegon falls & Lake Chūzenji"],
    },
    {
      day: 15, titleFr: "Kamakura & Grand Bouddha", titleEn: "Kamakura & Great Buddha",
      activitiesFr: ["Grand Bouddha de Kamakura", "Temple Engaku-ji", "Plage d'Enoshima"],
      activitiesEn: ["Kamakura Great Buddha", "Engaku-ji temple", "Enoshima beach"],
    },
    {
      day: 16, titleFr: "Yokohama Chinatown", titleEn: "Yokohama Chinatown",
      activitiesFr: ["Chinatown de Yokohama", "Musée du ramen Shin-Yokohama", "Port & Landmark Tower"],
      activitiesEn: ["Yokohama Chinatown", "Shin-Yokohama ramen museum", "Harbor & Landmark Tower"],
    },
    {
      day: 17, titleFr: "Mont Fuji - 5ème station", titleEn: "Mount Fuji - 5th station",
      activitiesFr: ["Route vers le mont Fuji", "5ème station en bus", "Lac Kawaguchiko & ryokan"],
      activitiesEn: ["Drive to Mount Fuji", "5th station by bus", "Lake Kawaguchiko & ryokan"],
    },
    {
      day: 18, titleFr: "Nagoya & château", titleEn: "Nagoya & castle",
      activitiesFr: ["Château de Nagoya", "Quartier Sakae", "Cuisine locale miso katsu"],
      activitiesEn: ["Nagoya castle", "Sakae district", "Local miso katsu cuisine"],
    },
    {
      day: 19, titleFr: "Kanazawa - Kenroku-en", titleEn: "Kanazawa - Kenroku-en",
      activitiesFr: ["Jardin Kenroku-en", "Quartier samouraï Nagamachi", "Marché Omicho"],
      activitiesEn: ["Kenroku-en garden", "Nagamachi samurai district", "Omicho market"],
    },
    {
      day: 20, titleFr: "Shirakawa-go (UNESCO)", titleEn: "Shirakawa-go (UNESCO)",
      activitiesFr: ["Village à toits de chaume Shirakawa-go", "Randonnée & vue panoramique", "Cuisine montagnarde japonaise"],
      activitiesEn: ["Shirakawa-go thatched village", "Hike & panoramic view", "Japanese mountain cuisine"],
    },
    {
      day: 21, titleFr: "Takayama - vieille ville", titleEn: "Takayama - old town",
      activitiesFr: ["Vieille ville Sanmachi Suji", "Marché matinal Jinya-mae", "Brasseries de saké"],
      activitiesEn: ["Sanmachi Suji old town", "Jinya-mae morning market", "Sake breweries"],
    },
    {
      day: 22, titleFr: "Alpes japonaises - Matsumoto", titleEn: "Japanese Alps - Matsumoto",
      activitiesFr: ["Château de Matsumoto (corbeau noir)", "Alpes japonaises panorama", "Onsen en montagne"],
      activitiesEn: ["Matsumoto black crow castle", "Japanese Alps panorama", "Mountain onsen"],
    },
    {
      day: 23, titleFr: "Nagano & singes des neiges", titleEn: "Nagano & snow monkeys",
      activitiesFr: ["Parc des singes de Jigokudani", "Singes dans les sources chaudes", "Temple Zenkō-ji"],
      activitiesEn: ["Jigokudani snow monkey park", "Monkeys in hot springs", "Zenkō-ji temple"],
    },
    {
      day: 24, titleFr: "Tokyo - DisneySea", titleEn: "Tokyo - DisneySea",
      activitiesFr: ["Tokyo DisneySea", "Attractions uniques au monde", "Feu d'artifice nocturne"],
      activitiesEn: ["Tokyo DisneySea", "World-unique attractions", "Evening fireworks"],
    },
    {
      day: 25, titleFr: "Tokyo - teamLab & Odaiba", titleEn: "Tokyo - teamLab & Odaiba",
      activitiesFr: ["teamLab Borderless", "Gundam géant d'Odaiba", "Vue sur la baie de Tokyo"],
      activitiesEn: ["teamLab Borderless", "Giant Gundam at Odaiba", "Tokyo Bay views"],
    },
    {
      day: 26, titleFr: "Tokyo - quartiers tendance", titleEn: "Tokyo - trendy neighbourhoods",
      activitiesFr: ["Shimokitazawa vintage & music", "Daikanyama & cafés branchés", "Nakameguro le long du canal"],
      activitiesEn: ["Shimokitazawa vintage & music", "Daikanyama & cool cafes", "Nakameguro canal walk"],
    },
    {
      day: 27, titleFr: "Gastronomie & ramen", titleEn: "Gastronomy & ramen",
      activitiesFr: ["Cours de préparation ramen", "Marché Tsukiji extérieur", "Izakaya & yakitori"],
      activitiesEn: ["Ramen making class", "Tsukiji outer market", "Izakaya & yakitori"],
    },
    {
      day: 28, titleFr: "Sumo & culture", titleEn: "Sumo & culture",
      activitiesFr: ["Visite d'un training sumo", "Musée national de Tokyo", "Spectacle kabuki"],
      activitiesEn: ["Sumo training visit", "Tokyo national museum", "Kabuki show"],
    },
    {
      day: 29, titleFr: "Shopping & adieux", titleEn: "Shopping & farewells",
      activitiesFr: ["Akihabara dernière chance", "Cadeaux & souvenirs", "Dîner de gala japonais"],
      activitiesEn: ["Last Akihabara visit", "Gifts & souvenirs", "Japanese farewell dinner"],
    },
    {
      day: 30, titleFr: "Dernier matin & départ", titleEn: "Last morning & departure",
      activitiesFr: ["Marché aux puces de Shinjuku", "Shopping souvenirs", "Transfert aéroport Narita"],
      activitiesEn: ["Shinjuku flea market", "Souvenir shopping", "Narita airport transfer"],
    },
  ],
  suggestedBookings: [
    { type: "flight", titleFr: "Vol aller-retour → Osaka (KIX)", titleEn: "Round-trip flight → Osaka (KIX)", estimatedPrice: 650, currency: "€", placeSearchQuery: "Kansai International Airport Osaka Japan" },
    { type: "hotel", titleFr: "Ryokan traditionnel Kyoto (8 nuits)", titleEn: "Traditional Kyoto ryokan (8 nights)", estimatedPrice: 1200, currency: "€", placeSearchQuery: "Tawaraya Ryokan Kyoto Japan" },
    { type: "activity", titleFr: "Cérémonie du thé privée", titleEn: "Private tea ceremony", estimatedPrice: 60, currency: "€", placeSearchQuery: "Urasenke Foundation Tea Ceremony Kyoto Japan" },
    { type: "restaurant", titleFr: "Dîner kaiseki japonais", titleEn: "Japanese kaiseki dinner", estimatedPrice: 100, currency: "€", placeSearchQuery: "Kikunoi Honten Restaurant Kyoto Japan" },
  ],
};
