export const debugSettings = {
  startSelectionSeconds: 2.5,
  rouletteTimerSeconds: 20,
  rouletteResultSeconds: 8.5,
  playmodeTimerSeconds: 120,
  infoTimerSeconds: 100,
  slotmachineTimerSeconds: 30,
  modelpickerTimerSeconds: 200,
  nameConfirmSeconds: 1.5,
};

export const timingSettingDefinitions = [
  { key: "startSelectionSeconds", label: "Start select", min: 0.5, max: 10, step: 0.5 },
  { key: "rouletteTimerSeconds", label: "Roulette", min: 5, max: 300, step: 5 },
  { key: "rouletteResultSeconds", label: "Roulette result", min: 0.5, max: 30, step: 0.5 },
  { key: "playmodeTimerSeconds", label: "Play mode", min: 5, max: 600, step: 5 },
  { key: "infoTimerSeconds", label: "Info mode", min: 5, max: 600, step: 5 },
  { key: "slotmachineTimerSeconds", label: "Slot machine", min: 5, max: 300, step: 5 },
  { key: "modelpickerTimerSeconds", label: "Model picker", min: 5, max: 600, step: 5 },
  { key: "nameConfirmSeconds", label: "Name confirm", min: 0.5, max: 10, step: 0.5 },
];

export function adjustTimingSetting(index, direction, coarse = false) {
  const definition = timingSettingDefinitions[index];
  if (!definition) return;
  const multiplier = coarse ? 5 : 1;
  const next = debugSettings[definition.key] + direction * definition.step * multiplier;
  debugSettings[definition.key] = Math.min(definition.max, Math.max(definition.min, next));
}
