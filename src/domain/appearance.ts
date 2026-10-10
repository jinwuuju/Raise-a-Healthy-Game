export const presets = ['male', 'female', 'alien'] as const;
export type Preset = (typeof presets)[number];
export const presetNames: Record<Preset, string> = { male: '남성 기자', female: '여성 기자', alien: '외계인 기자' };

/** Body build used by the sprite painter. Derived from the preset, never chosen separately. */
export type Build = 'm' | 'f' | 'a';
export const buildOf = (p: Preset): Build => (p === 'male' ? 'm' : p === 'female' ? 'f' : 'a');

export const hairStyles = {
  short: '댄디 컷', comma: '쉼표 머리', part: '가르마 펌', mash: '바가지 머리', spiky: '삐죽 머리', curly: '곱슬 펌',
  messy: '부스스 머리', slick: '올백', buzz: '짧은 스포츠', wolf: '울프 컷',
  leaf: '리프컷', shadow: '쉐도우 펌', curtain: '센터 가르마 중단발',
  hush: '허쉬컷', jelly: '젤리 펌 보브', layered: '레이어드 장발',
  bob: '단발', long: '긴 생머리', wave: '긴 웨이브', hime: '히메컷', pixie: '숏컷', ponytail: '포니테일',
  braid: '옆 땋은 머리', twin: '양갈래', bun: '똥머리', odango: '양쪽 똥머리',
  buds: '동글 안테나', tuft: '별빛 솜털', ears: '토끼 귀', crest: '말랑 볏',
} as const;
export const faceStyles = {
  smile: '반달 눈웃음', bright: '반짝 눈', calm: '차분한 눈', cool: '시크한 눈', wink: '윙크',
  doe: '초롱 눈', cat: '고양이 눈', dot: '콩알 눈', star: '별빛 눈',
} as const;
export const faceShapes = { oval: '갸름', round: '동글', vline: '브이라인', mochi: '찹쌀떡' } as const;
export const skinColors = {
  fair: '뽀얀', peach: '밝은 살구', honey: '꿀빛', tan: '구릿빛', deep: '짙은 갈색',
  mint: '민트', lilac: '라일락', sky: '하늘', pink: '딸기우유',
} as const;
export const hairColors = {
  ink: '검정', brown: '갈색', ash: '애쉬 브라운', chestnut: '적갈색', gold: '금빛', silver: '은빛',
  pink: '벚꽃 핑크', lavender: '라벤더', teal: '청록',
} as const;
export const outfits = { reporter: '취재 재킷', knit: '캐주얼 니트', hoodie: '포근한 후드', coat: '도시 코트' } as const;

export type HairId = keyof typeof hairStyles;
export type FaceId = keyof typeof faceStyles;
export type ShapeId = keyof typeof faceShapes;
export type SkinId = keyof typeof skinColors;
export type HairColorId = keyof typeof hairColors;
export type OutfitId = keyof typeof outfits;
export type NpcOutfit = 'suit' | 'apron' | 'uniform' | 'casual';

export type Appearance = { build: Build; hair: HairId; face: FaceId; shape: ShapeId; skin: SkinId; hairColor: HairColorId; outfit: OutfitId };
export type Look = Omit<Appearance, 'outfit'> & { outfit: OutfitId | NpcOutfit; glasses?: boolean };

export const starterOutfits: OutfitId[] = ['reporter', 'knit', 'hoodie'];

const HAIR_BY: Record<Build, HairId[]> = {
  m: ['leaf', 'shadow', 'curtain', 'comma', 'short', 'part', 'mash', 'spiky', 'curly', 'messy', 'slick', 'buzz', 'wolf'],
  f: ['hush', 'jelly', 'layered', 'bob', 'long', 'wave', 'hime', 'pixie', 'ponytail', 'braid', 'twin', 'bun', 'odango'],
  a: ['buds', 'tuft', 'ears', 'crest'],
};
const FACE_BY: Record<Build, FaceId[]> = {
  m: ['bright', 'smile', 'calm', 'cool', 'wink'],
  f: ['doe', 'bright', 'smile', 'cat', 'wink'],
  a: ['bright', 'dot', 'star', 'smile'],
};
const SHAPE_BY: Record<Build, ShapeId[]> = { m: ['oval', 'round', 'vline'], f: ['oval', 'round', 'vline'], a: ['mochi', 'round'] };
const SKIN_BY: Record<Build, SkinId[]> = { m: ['fair', 'peach', 'honey', 'tan', 'deep'], f: ['fair', 'peach', 'honey', 'tan', 'deep'], a: ['mint', 'lilac', 'sky', 'pink'] };

export function hairFor(preset: Preset): HairId[] { return HAIR_BY[buildOf(preset)]; }
export function faceFor(preset: Preset): FaceId[] { return FACE_BY[buildOf(preset)]; }
export function shapeFor(preset: Preset): ShapeId[] { return SHAPE_BY[buildOf(preset)]; }
export function skinFor(preset: Preset): SkinId[] { return SKIN_BY[buildOf(preset)]; }

export function defaultAppearance(preset: Preset): Appearance {
  if (preset === 'alien') return { build: 'a', hair: 'buds', face: 'bright', shape: 'mochi', skin: 'mint', hairColor: 'teal', outfit: 'hoodie' };
  if (preset === 'female') return { build: 'f', hair: 'long', face: 'doe', shape: 'oval', skin: 'fair', hairColor: 'chestnut', outfit: 'reporter' };
  return { build: 'm', hair: 'comma', face: 'bright', shape: 'oval', skin: 'peach', hairColor: 'ink', outfit: 'reporter' };
}

/**
 * Strict check used by the creator. With `migrate`, values saved by older builds (no face shape,
 * shared human hair list) are moved to the closest supported choice instead of failing the load.
 */
export function validateAppearance(value: unknown, preset: Preset, migrate = false): Appearance {
  if (!value || typeof value !== 'object') throw new Error('외형 설정을 확인해 주세요.');
  const a = value as Record<string, unknown>;
  const base = defaultAppearance(preset);
  const pick = <T extends string>(v: unknown, table: Record<string, string>, allowed: readonly string[], fallback: T): T => {
    // Older saves may hold removed or preset-mismatched values (e.g. the retired square face): use the default.
    if (migrate && (typeof v !== 'string' || !allowed.includes(v))) return fallback;
    if (typeof v !== 'string' || !Object.hasOwn(table, v)) throw new Error('지원하지 않는 외형 값입니다.');
    if (!allowed.includes(v)) throw new Error('이 기자 타입에서 고를 수 없는 외형입니다.');
    return v as T;
  };
  return {
    build: buildOf(preset),
    hair: pick<HairId>(a.hair, hairStyles, hairFor(preset), base.hair),
    face: pick<FaceId>(a.face, faceStyles, faceFor(preset), base.face),
    shape: pick<ShapeId>(a.shape, faceShapes, shapeFor(preset), base.shape),
    skin: pick<SkinId>(a.skin, skinColors, skinFor(preset), base.skin),
    hairColor: pick<HairColorId>(a.hairColor, hairColors, Object.keys(hairColors), base.hairColor),
    outfit: pick<OutfitId>(a.outfit, outfits, Object.keys(outfits), base.outfit),
  };
}
