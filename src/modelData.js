// src/modelData.js
// models: { id: number, name: string, image: string, description: string, year: number , attributes: number[], isPlaced: boolean }
// Will be loaded from another program later; placeholder data for now.

export const models = [

    //Achao Church
  { id: 1,  
    name: "Achao Church",  
    image: "assets/placeHolderModels/achaoChurch.png", 
    description: "Wooden religious structure, assembled without nails using local carpentry techniques. Part of a network of churches embedded in rural landscapes and community life.", 
    category: "Fate", 
    attributes: {patrioticHeritage: 0.8, nationalImage: 0.6, moralHygiene: 0.4, growthProsperity: -0.2, touristicDesire: -0.75, protectedDemocracy: 0.3}, 
    isPlaced: false 
    },

    //Amazone Spheres
  { id: 2,  
    name: "Amazon Spheres",  
    image: "assets/placeHolderModels/amazoneSpheres.png", 
    description: "Glass-domed interiors house thousands of plants, forming a controlled microclimate where corporate workspaces merge with curated nature, staging productivity within an artificial, carefully maintained ecosystem.",
    category: "Progress", 
    attributes: {patrioticHeritage: -0.7, nationalImage: 0.9, moralHygiene: 0.7, growthProsperity: 0.95, touristicDesire: 0.4, protectedDemocracy: 0.6}, 
    isPlaced: false 
    },

     //Antonia's Rocket Factory
  { id: 3,  
    name: "Antonia's Rocket Factory",  
    image: "assets/placeHolderModels/todo.png", //todo
    description: "Small-scale workshop organized for the fabrication, repair, and storage of miniatures and plastiglomerates, equipped with worktables, tools, and material shelves for manual production.",
    category: "Imaginary", 
    attributes: {patrioticHeritage: -0.5, nationalImage: 0.2, moralHygiene: 0.1, growthProsperity: 0.5, touristicDesire: -0.1, protectedDemocracy: -0.3}, 
    isPlaced: false 
    },

      //Mundomágico's Araucanian Reserve
  { id: 4,  
    name: "Mundomágico's Araucanian Reserve",  
    image: "assets/placeHolderModels/araucanianReserve.png",
    description: "Protected territory associated with Indigenous land use, combining forest, agriculture, and spiritual significance within a managed natural environment.",
    category: "Power", 
    attributes: {patrioticHeritage: 0.1, nationalImage: -0.3, moralHygiene: -0.6, growthProsperity: -0.1, touristicDesire: -0.8, protectedDemocracy: -0.2}, 
    isPlaced: false 
    },

    //Arauco Cellulose Factory
  { id: 5,  
    name: "Arauco Cellulose Factory",  
    image: "assets/placeHolderModels/araucoCelluloseFactory.png",
    description: "Large-scale industrial complex dedicated to wood processing and cellulose production, linked to forestry extraction, logistics networks, and environmental transformation.",
    category: "Progress", 
    attributes: {patrioticHeritage: -0.7, nationalImage: -0.3, moralHygiene: 0.6, growthProsperity: 0.9, touristicDesire: -0.7, protectedDemocracy: 0.4}, 
    isPlaced: false 
    },

    //ALMA
  { id: 6,  
    name: "Atacama Large Millimeter Array Observatory",  
    image: "assets/placeHolderModels/alma.png",
    description: "High-altitude scientific facility composed of distributed radio antennas, designed for astronomical observation and data collection in extreme desert conditions.",
    category: "Progress", 
    attributes: {patrioticHeritage: 0.0, nationalImage: 0.85, moralHygiene: 0.65, growthProsperity: 0.7, touristicDesire: 0.3, protectedDemocracy: 0.55}, 
    isPlaced: false 
    },

    //Dismaland
  { id: 7,  
    name: "Dismaland",  
    image: "assets/placeHolderModels/dismaland.png",
    description: "Temporary amusement park installation mimicking familiar attractions while exposing their mechanisms, using decay, irony, and controlled dysfunction as its core structure.",
    category: "Imaginary", 
    attributes: {patrioticHeritage: -0.6, nationalImage: 0.75, moralHygiene: -0.7, growthProsperity: -0.3, touristicDesire: 0.85, protectedDemocracy: -0.5}, 
    isPlaced: false 
    },

    //Grüne Bunker
  { id: 8,  
    name: "Grüne Bunker",  
    image: "assets/placeHolderModels/grüneBunker.png",
    description: "Massive concrete wartime structure later converted to civilian use, combining defensive architecture with layered adaptations across decades.",
    category: "Imaginary", 
    attributes: {patrioticHeritage: -0.8, nationalImage: 0.2, moralHygiene: 0.6, growthProsperity: 0.3, touristicDesire: 0.65, protectedDemocracy: 0.6}, 
    isPlaced: false 
    },

     //Alicia's Roturas Country House
  { id: 9,  
    name: "Alicia's Roturas Country House",  
    image: "assets/placeHolderModels/countryHouse.png",
    description: "Abandomed stone house. Typical construction of the west spanish countryside. Represents a ghosts of an era that is over where people use to live there int he summer together with their donkeys and pigs. Where there was a lot of poverty but also a thriving community of people that helped each other and kids that runned around those mountains. Evokes at the same time an idealised past that popoluates lots of minds of our time and all the potentiallity of rehabilitating these places and building up a dream rural futurism. Where people have shelters close to nature and enjoy working together and celebrating live.",
    category: "Progress, Identity", //todo
    attributes: {patrioticHeritage: 0.3, nationalImage: -0.2, moralHygiene: -0.4, growthProsperity: -0.5, touristicDesire: -0.3, protectedDemocracy: -0.2}, 
    isPlaced: false 
    },

    //Bukele's CECOT Anti-terrorism Prison
  { id: 10,  
    name: "Bukele's CECOT Anti-terrorism Prison",  
    image: "assets/placeHolderModels/bukele.png",
    description: "High-security detention complex designed for large-scale incarceration, organized around surveillance, isolation, and strict spatial control.",
    category: "Fate", 
    attributes: {patrioticHeritage: -0.4, nationalImage: 0.5, moralHygiene: 0.95, growthProsperity: 0.2, touristicDesire: -0.9, protectedDemocracy: 0.85}, 
    isPlaced: false 
    },

   ];

  export function getModelById(id) {
    const numId = Number(id);
    const pov = models.find((p) => p.id === numId);
    return pov ?? models[0];
  }