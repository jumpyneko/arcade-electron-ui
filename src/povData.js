// src/povData.js
// POV: { name: string, infotext: string, id: number, isBlocked: boolean, isTheOne: boolean }
// Will be loaded from another program later; placeholder data for now.

export const POVS = [
    { id: 1,  name: "Magic Train",  icon: "assets/sprites/pov1.png", isBlocked: false, isTheOne: false },
    { id: 2,  name: "GloboVision",  icon: "assets/sprites/pov2.png", isBlocked: false, isTheOne: false },
    { id: 3,  name: "Mustard Nation",  icon: "assets/sprites/pov3.png", isBlocked: false, isTheOne: false },
    { id: 4,  name: "Willy The Bear",  icon: "assets/sprites/pov4.png", isBlocked: false, isTheOne: false },
    { id: 5,  name: "Order and Progress",  icon: "assets/sprites/pov5.png", isBlocked: false, isTheOne: false },
    { id: 6,  name: "Dele Dele!",  icon: "assets/sprites/pov52.png", isBlocked: false, isTheOne: false },
    { id: 7,  name: "City Tour",  icon: "", isBlocked: false, isTheOne: false },
    { id: 8,  name: "Valaparaiso de mi Amor",  icon: "", isBlocked: false, isTheOne: false },
    { id: 9,  name: "Aseo y Ornato",  icon: "", isBlocked: false, isTheOne: false },
    { id: 10, name: "Kiltro", icon: "", isBlocked: false, isTheOne: false },
    { id: 11, name: "Arriba en la Cordillera", icon: "", isBlocked: false, isTheOne: false },
    { id: 12, name: "Nubosidad Parcial", icon: "", isBlocked: false, isTheOne: false },
    { id: 13, name: "Se va enredando, enredando", icon: "", isBlocked: false, isTheOne: false },
    { id: 14, name: "The Giant Garden", icon: "", isBlocked: false, isTheOne: false },
    { id: 15, name: "Buque Esmeralda", icon: "", isBlocked: false, isTheOne: false },
    { id: 16, name: "Tren al Sur", icon: "", isBlocked: false, isTheOne: false },
  ];
  
  export function getPovById(id) {
    const numId = Number(id);
    const pov = POVS.find((p) => p.id === numId);
    return pov ?? POVS[0];
  }