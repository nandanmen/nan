import { atom } from "jotai";

export type LittleInternetEvent = { type: "add-sixth-node" };

export const sixthNodeAddedAtom = atom(false);

export const littleInternetEventAtom = atom(null, (_get, set, event: LittleInternetEvent) => {
  switch (event.type) {
    case "add-sixth-node":
      set(sixthNodeAddedAtom, true);
      break;
  }
});
