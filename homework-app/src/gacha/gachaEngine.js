import { CARDS, RARITY_CONFIGS } from './cardData';

/**
 * Perform a weighted random draw of a single card from list of cards.
 * @param {Array} cards - The pool of cards to draw from
 * @returns {Object} Selected card
 */
export function weightedRandom(cards) {
  // Sum up the total weights based on each card's rarity configuration
  const totalWeight = cards.reduce((sum, card) => {
    const rarityConfig = RARITY_CONFIGS[card.rarity] || { weight: 0 };
    return sum + rarityConfig.weight;
  }, 0);

  let random = Math.random() * totalWeight;
  for (const card of cards) {
    const weight = (RARITY_CONFIGS[card.rarity] || { weight: 0 }).weight;
    if (random < weight) {
      return card;
    }
    random -= weight;
  }
  return cards[0]; // fallback
}

/**
 * Draw a single card.
 * @param {Object} pool - Gacha pool definition
 * @returns {Object} Drawn card
 */
export function drawSingle(pool) {
  return weightedRandom(pool.cards);
}

/**
 * Draw ten cards with pity guarantees.
 * Guarantee: At least 2 R cards OR at least 1 SR/SSR card.
 * If not met, we upgrade up to 2 N cards to R cards.
 * @param {Object} pool - Gacha pool definition
 * @returns {Array} List of 10 drawn cards
 */
export function drawTen(pool) {
  const results = Array(10).fill(null).map(() => weightedRandom(pool.cards));

  // Count rarities in current draw
  const rCount = results.filter(c => c.rarity === 'R').length;
  const srCount = results.filter(c => c.rarity === 'SR').length;
  const ssrCount = results.filter(c => c.rarity === 'SSR').length;

  const hasHighRarity = (srCount >= 1 || ssrCount >= 1);

  // If we don't have at least 2 R cards AND don't have any SR/SSR, trigger pity upgrade
  if (rCount < 2 && !hasHighRarity) {
    // We need to upgrade some N cards to R cards so we meet the "at least 2 R cards" threshold
    const rNeeded = 2 - rCount;
    let upgraded = 0;

    // Collect all cards of rarity R from the pool to pick replacements
    const rPool = pool.cards.filter(c => c.rarity === 'R');

    if (rPool.length > 0) {
      // Find indices of N cards in the result array
      const nIndices = [];
      results.forEach((card, idx) => {
        if (card.rarity === 'N') {
          nIndices.push(idx);
        }
      });

      // Shuffle the index list randomly to decide which ones to upgrade
      const shuffledIndices = nIndices.sort(() => Math.random() - 0.5);

      for (const idx of shuffledIndices) {
        if (upgraded >= rNeeded) break;
        // Upgrade this slot to a random R card
        const randomRCard = rPool[Math.floor(Math.random() * rPool.length)];
        results[idx] = { ...randomRCard, isPityUpgraded: true };
        upgraded++;
      }
    }
  }

  return results;
}
