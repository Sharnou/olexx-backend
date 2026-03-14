function visibilityFromRating(avgRating, reviewCount) {
  const rating = Number(avgRating || 0);
  const count = Number(reviewCount || 0);
  let level = "normal";
  if (rating === 0 && count === 0) level = "blocked";
  else if (count >= 5 && rating >= 4.5) level = "featured";
  else if (count >= 3 && rating <= 2.0) level = "low";
  const ui =
    level === "featured"
      ? { glow: "orange", dim: false, position: "top" }
      : level === "blocked"
      ? { glow: "red", dim: true, position: "removed" }
      : level === "low"
      ? { glow: "none", dim: true, position: "bottom" }
      : { glow: "none", dim: false, position: "normal" };
  return { visibility: level, ui };
}

module.exports = { visibilityFromRating };
