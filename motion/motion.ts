export const motion = {
  duration: {
    pressIn: 110,
    pressOut: 180,
    toast: 250,
    content: 220,
    sheet: 300,
  },
  scale: {
    pressable: 0.97,
    fab: 0.93,
  },
  spring: {
    damping: 19,
    stiffness: 300,
    mass: 0.7,
    overshootClamping: true,
  },
  fab: {
    size: 68,
    iconSize: 36,
    right: 20,
    bottom: 20,
  },
} as const;
