// Photos load in the visitor's browser from Unsplash; every use sits on a
// gradient fallback (.scenery) so a missing photo never breaks the layout.
const u = (id: string, w = 1600) => `url("https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70")`;

export const BACKDROP = u("photo-1501785888041-af3ef285b470", 2000); // mountain lake valley
export const HERO = u("photo-1464822759023-fed622ff2c3b", 1400); // mountain ridge

const BY_TYPE: [RegExp, string][] = [
  [/beach|coast|sea|island|goa|gokarna|varkala|andaman|pondicherry|puducherry/i, "photo-1507525428034-b723cf961d3e"],
  [/mountain|hill|himalaya|manali|munnar|coorg|ooty|snow|valley/i, "photo-1464822759023-fed622ff2c3b"],
  [/heritage|fort|palace|temple|ruins|hampi|udaipur|jaipur|agra/i, "photo-1524492412937-b28074a5d7da"],
  [/forest|wildlife|nature|jungle|tea|safari|waterfall/i, "photo-1441974231531-c6227db76b6e"],
  [/city|mumbai|bangalore|delhi|kolkata/i, "photo-1477959858617-67f85cf4f1df"],
];

/** A fitting landscape for a destination, based on its name and description. */
export function photoFor(text: string): string {
  const hit = BY_TYPE.find(([re]) => re.test(text));
  return u(hit ? hit[1] : "photo-1469474968028-56623f02e42e", 900);
}
