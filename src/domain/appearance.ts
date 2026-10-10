export const presets = ['male', 'female', 'alien'] as const;
export type Preset = (typeof presets)[number];
export const presetNames: Record<Preset, string> = { male: '남성 기자', female: '여성 기자', alien: '외계인 기자' };

export const hairStyles = { short: '짧은 머리', bob: '단발', wave: '긴 웨이브', buds: '동글 안테나', tuft: '별빛 솜털', ears: '토끼 귀' } as const;
export const faceStyles = { smile: '미소', bright: '반짝 눈', calm: '차분한 눈' } as const;
export const skinColors = { peach: '밝은 살구', honey: '꿀빛', tan: '구릿빛', deep: '짙은 갈색', mint: '민트', lilac: '라일락', sky: '하늘' } as const;
export const hairColors = { ink: '검정', brown: '갈색', chestnut: '적갈색', gold: '금빛', silver: '은빛', teal: '청록' } as const;
export const outfits = { reporter: '취재 재킷', knit: '캐주얼 니트', hoodie: '포근한 후드', coat: '도시 코트' } as const;

export type HairId = keyof typeof hairStyles;
export type FaceId = keyof typeof faceStyles;
export type SkinId = keyof typeof skinColors;
export type HairColorId = keyof typeof hairColors;
export type OutfitId = keyof typeof outfits;
export type NpcOutfit = 'suit' | 'apron' | 'uniform' | 'casual';

export type Appearance = { hair: HairId; face: FaceId; skin: SkinId; hairColor: HairColorId; outfit: OutfitId };
export type Look = { hair: HairId; face: FaceId; skin: SkinId; hairColor: HairColorId; outfit: OutfitId | NpcOutfit; glasses?: boolean };

export const starterOutfits: OutfitId[] = ['reporter', 'knit', 'hoodie'];
export const humanHair: HairId[] = ['short', 'bob', 'wave'];
export const alienHair: HairId[] = ['buds', 'tuft', 'ears'];
export const humanSkin: SkinId[] = ['peach', 'honey', 'tan', 'deep'];
export const alienSkin: SkinId[] = ['mint', 'lilac', 'sky'];

export function hairFor(preset: Preset): HairId[] { return preset === 'alien' ? alienHair : humanHair; }
export function skinFor(preset: Preset): SkinId[] { return preset === 'alien' ? alienSkin : humanSkin; }

export function defaultAppearance(preset: Preset): Appearance {
  if (preset === 'alien') return { hair: 'buds', face: 'bright', skin: 'mint', hairColor: 'teal', outfit: 'hoodie' };
  if (preset === 'female') return { hair: 'bob', face: 'smile', skin: 'peach', hairColor: 'chestnut', outfit: 'reporter' };
  return { hair: 'short', face: 'smile', skin: 'peach', hairColor: 'ink', outfit: 'reporter' };
}

export function validateAppearance(value: unknown, preset: Preset): Appearance {
  if (!value || typeof value !== 'object') throw new Error('외형 설정을 확인해 주세요.');
  const a = value as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, table: Record<string, string>): T => {
    if (typeof v !== 'string' || !Object.hasOwn(table, v)) throw new Error('지원하지 않는 외형 값입니다.');
    return v as T;
  };
  const look: Appearance = {
    hair: pick<HairId>(a.hair, hairStyles), face: pick<FaceId>(a.face, faceStyles), skin: pick<SkinId>(a.skin, skinColors),
    hairColor: pick<HairColorId>(a.hairColor, hairColors), outfit: pick<OutfitId>(a.outfit, outfits),
  };
  if (!hairFor(preset).includes(look.hair)) throw new Error('이 프리셋에서 고를 수 없는 머리 모양입니다.');
  if (!skinFor(preset).includes(look.skin)) throw new Error('이 프리셋에서 고를 수 없는 피부색입니다.');
  return look;
}
