import menusData from '../../data/content/lunch-menus.v0.1.json';
import extras from '../../data/content/lunch-extras.v0.1.json';

/** D080~D081 lunch content (draft, not yet wired to the screen). Pure helpers only; no state or rewards here. */
export const lunchMenus = menusData.menus;
export const lunchReferences = menusData.references;
export const lunchExtras = extras;
export type LunchMenu = typeof menusData.menus[number];
export type LunchTip = typeof extras.tips[number];
type Rule = { all?: boolean; craves?: string[]; endsWith?: string[]; exclude?: string[] };

/** Inserts the menu name. Lines never put a particle right after {menu}, so no Korean particle logic is needed. */
export const fillMenu = (text: string, menu: { name: string }): string => text.split('{menu}').join(menu.name);

export function tipApplies(tip: LunchTip, menu: { name: string; crave: string }): boolean {
  const rule = tip.appliesTo as Rule;
  if (rule.exclude?.some(x => menu.name.includes(x))) return false;
  if (rule.all) return true;
  return !!(rule.craves?.includes(menu.crave) || rule.endsWith?.some(x => menu.name.endsWith(x)));
}

export const tipsFor = (menu: { name: string; crave: string }): LunchTip[] => extras.tips.filter(t => tipApplies(t, menu));

/** Fills the only numeric tip from the generator's DB reference row (no hand-written numbers). */
export function tipText(tip: LunchTip): string {
  const rice = menusData.references.rice.per100g;
  return tip.text.split('{riceKcal}').join(String(Math.round(rice.kcal))).split('{riceCarb}').join(String(Math.round(rice.carb)));
}
