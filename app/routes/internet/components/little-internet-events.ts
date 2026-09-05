import { atom } from "jotai";

export type LittleInternetEvent = { type: "add" };

export const littleInternetEventAtom = atom<LittleInternetEvent | null>(null);

export const sixthNodeAddedAtom = atom((get) => get(littleInternetEventAtom)?.type === "add");
