import { COMPOUNDS } from "./data/compounds";
/** Small lookup passed to client components that link recommendations to database entries. */
export const compoundLite = () =>
  Object.fromEntries(COMPOUNDS.map((c) => [c.id, { name: c.name, access: c.access, rx: c.access !== "otc" }]));
