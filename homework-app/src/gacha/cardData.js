const categoryImages = import.meta.glob('../assets/Image */tile_*.png', {
  eager: true,
  import: 'default'
});

const CATEGORY_CONFIGS = [
  {
    id: 'transport',
    folder: 'Image 交通工具',
    icon: '🚗',
    name: { zh: '交通工具', en: 'Transport' },
    poolName: { zh: '交通工具集', en: 'Transport Collection' },
    description: { zh: '从城市穿梭到空天探索，收集各种交通载具。', en: 'Collect vehicles spanning city streets, oceans, rails, and the outer sky.' }
  },
  {
    id: 'landmark',
    folder: 'Image 景点',
    icon: '🏯',
    name: { zh: '景点', en: 'Landmarks' },
    poolName: { zh: '景点集', en: 'Landmark Collection' },
    description: { zh: '把世界各地的标志景观收入图鉴。', en: 'Build a postcard collection of iconic sights and destinations.' }
  },
  {
    id: 'food',
    folder: 'Image 食物',
    icon: '🍜',
    name: { zh: '食物', en: 'Food' },
    poolName: { zh: '食物集', en: 'Food Collection' },
    description: { zh: '从街头小吃到大餐名菜，抽出你的美味图鉴。', en: 'Pull a delicious lineup from snacks, desserts, and signature dishes.' }
  },
  {
    id: 'highspeed',
    folder: 'Image 高铁',
    icon: '🚄',
    name: { zh: '高铁', en: 'High-Speed Rail' },
    poolName: { zh: '高铁主题集', en: 'High-Speed Rail Collection' },
    description: { zh: '围绕高铁主题的整套拼图卡面。', en: 'A full themed pool built around high-speed rail imagery.' }
  },
  {
    id: 'dragon',
    folder: 'Image 奶龙',
    icon: '🐉',
    name: { zh: '奶龙', en: 'Milk Dragon' },
    poolName: { zh: '奶龙集', en: 'Milk Dragon Collection' },
    description: { zh: '可爱奶龙主题整套卡面，适合冲满图鉴。', en: 'A playful full-set pool starring the Milk Dragon theme.' }
  }
];

export const RARITY_CONFIGS = {
  N: { weight: 700, label: 'N', color: '#8b8b8b' },
  R: { weight: 200, label: 'R', color: '#3aa6b9' },
  SR: { weight: 80, label: 'SR', color: '#9b59b6' },
  SSR: { weight: 20, label: 'SSR', color: '#f2b84b' }
};

const RARITY_BY_INDEX = [
  ...Array.from({ length: 16 }, () => 'N'),
  ...Array.from({ length: 8 }, () => 'R'),
  ...Array.from({ length: 4 }, () => 'SR'),
  ...Array.from({ length: 2 }, () => 'SSR')
];

const rarityLabelMap = {
  N: { zh: '普通', en: 'Normal' },
  R: { zh: '稀有', en: 'Rare' },
  SR: { zh: '超稀有', en: 'Super Rare' },
  SSR: { zh: '传说', en: 'Legendary' }
};

function toTitleCase(value) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseImageEntries(folder) {
  return Object.entries(categoryImages)
    .filter(([path]) => path.includes(`/${folder}/`))
    .map(([path, src]) => {
      const fileName = path.split('/').pop() || '';
      const indexMatch = fileName.match(/tile_(\d+)\.png$/i);
      return {
        src,
        fileName,
        index: indexMatch ? Number(indexMatch[1]) : 0
      };
    })
    .filter(item => item.index > 0)
    .sort((a, b) => a.index - b.index);
}

function buildCardsForCategory(category) {
  const entries = parseImageEntries(category.folder);

  return entries.map((entry, idx) => {
    const rarity = RARITY_BY_INDEX[idx] || 'N';
    const order = idx + 1;
    const padded = String(order).padStart(2, '0');
    const rarityLabels = rarityLabelMap[rarity];

    return {
      id: `card_${category.id}_${padded}`,
      name: {
        zh: `${category.name.zh} ${padded}`,
        en: `${category.name.en} ${padded}`
      },
      emoji: category.icon,
      series: category.id,
      category: category.id,
      categoryName: category.name,
      rarity,
      image: entry.src,
      imageIndex: order,
      description: {
        zh: `${category.name.zh}主题拼图卡面第 ${padded} 张，稀有度为${rarityLabels.zh}。`,
        en: `${category.name.en} puzzle tile ${padded} with ${rarityLabels.en} rarity.`
      }
    };
  });
}

export const CARD_CATEGORIES = CATEGORY_CONFIGS.map(category => {
  const cards = buildCardsForCategory(category);
  return {
    ...category,
    cards,
    totalCards: cards.length,
    coverImage: cards[0]?.image || '',
    previewImages: cards.slice(0, 3).map(card => card.image)
  };
});

export const CARDS = CARD_CATEGORIES.flatMap(category => category.cards);

export const GACHA_POOLS = CARD_CATEGORIES.map((category, index) => ({
  id: `pool_${category.id}_v1`,
  categoryId: category.id,
  name: {
    zh: `${category.poolName.zh} · 第${index + 1}弹`,
    en: `${category.poolName.en} Vol. ${index + 1}`
  },
  shortName: category.poolName,
  description: category.description,
  icon: category.icon,
  coverImage: category.coverImage,
  previewImages: category.previewImages,
  singleCost: 10,
  tenCost: 90,
  cards: category.cards
}));

export function getCardsByCategory(categoryId) {
  return CARDS.filter(card => card.category === categoryId);
}

export function getCardById(cardId) {
  return CARDS.find(card => card.id === cardId) || null;
}

