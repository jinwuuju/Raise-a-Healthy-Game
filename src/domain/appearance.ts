export const hairStyles = { short:'짧은 머리', bob:'단발', wave:'웨이브', buds:'동글 안테나', tuft:'별빛 솜털', ears:'토끼 귀' } as const;
export const faceStyles = { smile:'미소', bright:'반짝 눈', calm:'차분한 눈' } as const;
export const skinColors = { peach:'따뜻한 밝은색', honey:'꿀빛', tan:'구릿빛', deep:'짙은 갈색', mint:'민트', lilac:'라일락', sky:'하늘색' } as const;
export const hairColors = { ink:'검정', brown:'밤색', chestnut:'적갈색', gold:'금빛', silver:'은빛', teal:'청록' } as const;
export const outfits = { reporter:'취재 재킷', knit:'캐주얼 니트', hoodie:'포근한 후드', coat:'도시 코트' } as const;
export const starterOutfits = ['reporter','knit','hoodie'];
export type Appearance = { hairId:keyof typeof hairStyles; faceId:keyof typeof faceStyles; skinId:keyof typeof skinColors; hairColor:keyof typeof hairColors; outfitId:keyof typeof outfits };
export function defaultAppearance(preset:'male'|'female'|'alien'):Appearance {
  return { hairId:preset==='alien'?'buds':preset==='female'?'bob':'short',faceId:'smile',skinId:preset==='alien'?'mint':'peach',hairColor:preset==='female'?'chestnut':'ink',outfitId:'reporter' };
}
export function validateAppearance(value:unknown,preset:'male'|'female'|'alien'):Appearance {
  if(!value || typeof value!=='object')throw new Error('외형 설정을 확인해 주세요.');
  const a=value as Appearance;
  if(![a.hairId,a.faceId,a.skinId,a.hairColor,a.outfitId].every(v=>typeof v==='string'))throw new Error('외형 값은 정해진 선택 항목이어야 합니다.');
  if(!Object.hasOwn(hairStyles,a.hairId) || !Object.hasOwn(faceStyles,a.faceId) || !Object.hasOwn(skinColors,a.skinId) || !Object.hasOwn(hairColors,a.hairColor) || !Object.hasOwn(outfits,a.outfitId) ||
    (preset==='alien'?!['buds','tuft','ears'].includes(a.hairId):!['short','bob','wave'].includes(a.hairId)))throw new Error('지원하지 않는 외형입니다.');
  return {hairId:a.hairId,faceId:a.faceId,skinId:a.skinId,hairColor:a.hairColor,outfitId:a.outfitId};
}
