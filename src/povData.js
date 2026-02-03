// src/povData.js
// POV: { name: string, infotext: string, id: number, isBlocked: boolean, isTheOne: boolean }
// Will be loaded from another program later; placeholder data for now.

export const POVS = [
    { id: 1,  name: "POV 1",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 2,  name: "POV 2",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 3,  name: "POV 3",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 4,  name: "POV 4",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 5,  name: "POV 5",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 6,  name: "POV 6",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 7,  name: "POV 7",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 8,  name: "POV 8",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 9,  name: "POV 9",  infotext: "", isBlocked: false, isTheOne: false },
    { id: 10, name: "POV 10", infotext: "", isBlocked: false, isTheOne: false },
    { id: 11, name: "POV 11", infotext: "", isBlocked: false, isTheOne: false },
    { id: 12, name: "POV 12", infotext: "", isBlocked: false, isTheOne: false },
    { id: 13, name: "POV 13", infotext: "", isBlocked: false, isTheOne: false },
    { id: 14, name: "POV 14", infotext: "", isBlocked: false, isTheOne: false },
    { id: 15, name: "POV 15", infotext: "", isBlocked: false, isTheOne: false },
    { id: 16, name: "POV 16", infotext: "", isBlocked: false, isTheOne: false },
  ];
  
  export function getPovById(id) {
    const numId = Number(id);
    const pov = POVS.find((p) => p.id === numId);
    return pov ?? POVS[0];
  }