const rankAnchors = [
  { rank: 1, rating: 10 }, { rank: 150, rating: 9 }, { rank: 500, rating: 8 },
  { rank: 2000, rating: 6 }, { rank: 10000, rating: 4 }, { rank: 50000, rating: 1 },
];
const tiers = [
  { minimumRating: 9.5, key: "sidebarRankObsidian", icon: "obsidian.svg" },
  { minimumRating: 9, key: "sidebarRankDiamond", icon: "diamond.svg" },
  { minimumRating: 8, key: "sidebarRankPlatinum", icon: "platinum.svg" },
  { minimumRating: 6, key: "sidebarRankGold", icon: "gold.svg" },
  { minimumRating: 4, key: "sidebarRankSilver", icon: "silver.svg" },
  { minimumRating: -Infinity, key: "sidebarRankBronze", icon: "bronze.svg" },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function rankToRating(rank) {
  if (rank <= rankAnchors[0].rank) return rankAnchors[0].rating;
  for (let index = 1; index < rankAnchors.length; index += 1) {
    const upper = rankAnchors[index];
    if (rank <= upper.rank) {
      const lower = rankAnchors[index - 1];
      const progress = (Math.log10(rank) - Math.log10(lower.rank))
        / (Math.log10(upper.rank) - Math.log10(lower.rank));
      return lower.rating + progress * (upper.rating - lower.rating);
    }
  }
  return rankAnchors.at(-1).rating;
}

export function calculateLobbyRating(ranks, translate) {
  const validRanks = ranks.filter(rank => Number.isFinite(rank) && rank > 0);
  if (!validRanks.length) return null;
  const playerRatings = validRanks.map(rankToRating);
  const strongestRatings = [...playerRatings].sort((a, b) => b - a)
    .slice(0, Math.max(1, Math.ceil(playerRatings.length * .25)));
  const top10 = validRanks.filter(rank => rank <= 10).length;
  const top100 = validRanks.filter(rank => rank <= 100).length;
  const minimumRating = top10 >= 2 ? 8 : top100 >= 2 ? 6 : top10 >= 1 ? 4 : 1;
  const depthBonus = Math.min(1.5, validRanks.reduce((sum, rank) => sum + (
    rank <= 10 ? .15 : rank <= 100 ? .12 : rank <= 250 ? .08 : rank <= 500 ? .04 : 0
  ), 0));
  const rating = Math.min(10, Math.max(
    median(playerRatings) * .4 + (strongestRatings.reduce((sum, value) => sum + value, 0) / strongestRatings.length) * .6,
    minimumRating,
  ) + depthBonus);
  const tier = tiers.find(item => rating >= item.minimumRating);
  const medianRank = Math.round(median(validRanks));
  const format = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
  const formattedRating = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  const tierName = translate(tier.key);
  const stylesheet = document.querySelector('link[rel="stylesheet"][href*="main.css"]');
  return {
    value: formattedRating,
    tier: tierName,
    image: new URL(`rank-badges/${tier.icon}`, stylesheet?.href ?? window.location.href).href,
    meta: translate("sidebarReadySkillMeta")
      .replace("{tier}", tierName)
      .replace("{rank}", new Intl.NumberFormat().format(medianRank)),
    title: translate("sidebarReadySkillTitle")
      .replace("{count}", String(validRanks.length))
      .replace("{tier}", tierName)
      .replace("{rating}", formattedRating)
      .replace("{rank}", new Intl.NumberFormat().format(medianRank)),
    numericRating: rating,
  };
}
