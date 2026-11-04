// ========== CONFIG ==========

const CARDS_CSV = "../../cards_new.csv";
const CARDS_IMG_DIR = "../../cards_new/";   // images live in cards_new/<Temple>/<Tier>/<Art File>
const SIGILS_CSV = "../../sigils.csv";
const TRAITS_CSV = "../../traits.csv";

// Used for the "Sort by" dropdown. Anything not listed here is sorted after the listed ones.
const TEMPLE_ORDER = ["Beast", "Undead", "Tech", "Magick", "Terrain", "Potion", "Pelt"];
const TIER_ORDER = ["Side", "Token", "Common", "Uncommon", "Rare", "Talking"];

// Cards that should never appear in the viewer (the old list is dropped since the pool was rebuilt).
const excludedNames = new Set([]);

// ========== STATE ==========

let allCards = [];
let sigilDescriptions = {};
let traitDescriptions = {};

// Values available in each search box
let allSigils = [];
let allTraits = [];
let allTags = [];
let allTribes = [];
let allRoles = [];
let allCredits = [];

// Values currently selected
let selectedCosts = [];
const Selected = {
  sigils: [],
  traits: [],
  tags: [],
  tribes: [],
  roles: [],
  credits: []
};

let currentSort = null;

let deck = [];
let deckVisible = true;

// ========== INIT ==========

fetch(CARDS_CSV)
  .then(response => {
    if (!response.ok) throw new Error(`Could not load ${CARDS_CSV} (${response.status})`);
    return response.text();
  })
  .then(parseCSV)
  .then(cards => {
    const filteredCards = cards.filter(
      card => card["Card Name"] && !excludedNames.has(card["Card Name"])
    );

    allCards = filteredCards;
    allSigils = extractUniqueSigils(filteredCards);
    allTraits = extractUnique(filteredCards, "Traits", splitComma);
    allTags = extractUnique(filteredCards, "Tags", splitTags);
    allTribes = extractUnique(filteredCards, "Tribes", splitSpaces);
    allRoles = extractUnique(filteredCards, "Role", splitComma);
    allCredits = extractUnique(filteredCards, "Credit", splitComma);

    FilterUI.setup(filteredCards);
    FilterLogic.apply();
  })
  .catch(err => {
    console.error(err);
    document.getElementById("card-count").textContent = `Error: ${err.message}`;
  });

loadDescriptions(SIGILS_CSV, sigilDescriptions);
loadDescriptions(TRAITS_CSV, traitDescriptions);

function loadDescriptions(url, target) {
  fetch(url)
    .then(response => response.text())
    .then(csv => {
      parseCSV(csv).forEach(row => {
        if (row.Name && row.Description) {
          target[row.Name.trim()] = row.Description.trim();
        }
      });
    })
    .catch(console.error);
}

// ========== PARSING ==========

// Small RFC-4180-style parser: handles quoted fields, "" escapes, commas and newlines inside quotes.
// Missing trailing cells come back as "" (never undefined), so checks like `card.Draftable !== ""` are safe.
function parseCSV(csvText) {
  const text = csvText.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ""));
  if (nonEmpty.length === 0) return [];

  const headers = nonEmpty[0].map(h => h.trim());
  return nonEmpty.slice(1).map(r =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))
  );
}

// ========== LIST HELPERS ==========

const splitComma = str => (str || "").split(",").map(s => s.trim()).filter(Boolean);
const splitSpaces = str => (str || "").split(/\s+/).map(s => s.trim()).filter(Boolean);
// Tags are things like "bloodless_bg": accept commas, semicolons, pipes or spaces as separators
const splitTags = str => (str || "").split(/[,;|\s]+/).map(s => s.trim()).filter(Boolean);

// Sigils can carry a LATCHER_ / CELL_ prefix, or be the special markers TRIBAL / RAINBOW
function rawSigilsOf(card) {
  return splitComma(card.Sigils);
}

function cleanSigilsOf(card) {
  return rawSigilsOf(card)
    .filter(s => s !== "TRIBAL" && s !== "RAINBOW")
    .map(s => (s.includes("_") ? s.split("_")[1] : s));
}

function extractUnique(cards, field, splitter) {
  const set = new Set();
  cards.forEach(card => splitter(card[field]).forEach(v => set.add(v)));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function extractUniqueSigils(cards) {
  const set = new Set();
  cards.forEach(card => cleanSigilsOf(card).forEach(s => set.add(s)));
  return [...set].sort();
}

// ========== IMAGES ==========

function getImageSrc(card) {
  // Use the "Art File" column; fall back to the card name without spaces/punctuation
  const file = card["Art File"] || `${(card["Card Name"] || "").replace(/[^A-Za-z0-9]/g, "")}.png`;
  const temple = card.Temple || "Unknown";
  const tier = card.Tier || "Unknown";
  return `${CARDS_IMG_DIR}${encodeURIComponent(temple)}/${encodeURIComponent(tier)}/${encodeURIComponent(file)}`;
}

function createCardImage(card) {
  const img = document.createElement("img");
  const name = card["Card Name"];
  img.src = getImageSrc(card);
  img.alt = name;
  img.addEventListener("error", () => {
    const placeholder = document.createElement("div");
    placeholder.className = "img-missing";
    placeholder.textContent = `${name} (image not found)`;
    img.replaceWith(placeholder);
  });
  return img;
}

// ========== SORTING LOGIC ==========

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function orderIndex(list, value) {
  const i = list.indexOf(value || "");
  return i === -1 ? list.length : i;
}

function getSortValue(card, field) {
  switch (field) {
    case "name":
      return (card["Card Name"] || "").toLowerCase();
    case "temple":
      return orderIndex(TEMPLE_ORDER, card.Temple);
    case "tier":
      return orderIndex(TIER_ORDER, card.Tier);
    case "power":
      return Number.parseInt(card.Power, 10);
    case "health":
      return Number.parseInt(card.Health, 10);
    case "role":
      return (card.Role || "").toLowerCase();
    default:
      return "";
  }
}

function sortCards(cards) {
  if (!currentSort) return cards;

  if (currentSort.field === "random") {
    const order = new Map(currentSort.randomOrder.map((name, index) => [name, index]));
    return [...cards].sort((a, b) => {
      const ai = order.has(a["Card Name"]) ? order.get(a["Card Name"]) : Number.MAX_SAFE_INTEGER;
      const bi = order.has(b["Card Name"]) ? order.get(b["Card Name"]) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }

  const dir = currentSort.direction === "desc" ? -1 : 1;
  const field = currentSort.field;

  return [...cards].sort((a, b) => {
    const av = getSortValue(a, field);
    const bv = getSortValue(b, field);

    if (["power", "health", "temple", "tier"].includes(field)) {
      const aNum = Number.isFinite(av) ? av : Number.NEGATIVE_INFINITY;
      const bNum = Number.isFinite(bv) ? bv : Number.NEGATIVE_INFINITY;
      return (aNum - bNum) * dir;
    }

    return String(av).localeCompare(String(bv), undefined, {
      numeric: true,
      sensitivity: "base"
    }) * dir;
  });
}

// ========== LOGIC ==========

function matchesList(selected, cardValues, requireAll) {
  if (selected.length === 0) return true;
  return requireAll
    ? selected.every(s => cardValues.includes(s))
    : selected.some(s => cardValues.includes(s));
}

const FilterLogic = {
  getCurrentValues() {
    const checked = id => document.getElementById(id).checked;
    return {
      temple: document.getElementById("temple-filter").value,
      tier: document.getElementById("tier-filter").value,
      powerOp: document.getElementById("power-operator").value,
      powerVal: parseInt(document.getElementById("power-value").value),
      healthOp: document.getElementById("health-operator").value,
      healthVal: parseInt(document.getElementById("health-value").value),
      exclusiveSigils: checked("exclusive-sigils-checkbox"),
      latcherSigil: checked("latcher-sigil-checkbox"),
      cellSigil: checked("cell-sigil-checkbox"),
      rainbowSigil: checked("rainbow-sigil-checkbox"),
      tribalSigil: checked("tribal-sigil-checkbox"),
      activeSigil: checked("active-sigil-checkbox"),
      exclusiveTraits: checked("exclusive-traits-checkbox"),
      exclusiveTags: checked("exclusive-tags-checkbox"),
      exclusiveTribes: checked("exclusive-tribes-checkbox"),
      exclusiveCosts: checked("exclusive-cost-checkbox"),
      exclusiveRoles: checked("exclusive-roles-checkbox"),
      exclusiveCredits: checked("exclusive-artists-checkbox"),
      onlyCosts: checked("only-cost-checkbox"),
      onlyDraftable: checked("draftable-filter"),
      onlyNotDraftable: checked("not-draftable-filter"),
      onlyEvolved: checked("evolved-filter"),
      onlyGemified: checked("gemified-filter")
    };
  },

  apply() {
    const values = this.getCurrentValues();
    const nameQuery = document.getElementById("name-filter").value.trim().toLowerCase();

    const result = allCards.filter(card => {
      const nameOk = !nameQuery || (card["Card Name"] || "").toLowerCase().includes(nameQuery);
      const templeOk = !values.temple || card.Temple === values.temple;
      const tierOk = !values.tier || card.Tier === values.tier;

      const power = parseInt(card.Power) || 0;
      const health = parseInt(card.Health) || 0;
      const statsOk =
        compare(power, values.powerOp, values.powerVal) &&
        compare(health, values.healthOp, values.healthVal);

      // Sigils
      const rawSigils = rawSigilsOf(card);
      const sigils = cleanSigilsOf(card);
      const sigilsOk = matchesList(Selected.sigils, sigils, values.exclusiveSigils);
      const latcherOk = !values.latcherSigil || rawSigils.some(s => s.startsWith("LATCHER_"));
      const cellOk = !values.cellSigil || rawSigils.some(s => s.startsWith("CELL_"));
      const rainbowOk = !values.rainbowSigil || rawSigils.includes("RAINBOW");
      const tribalOk = !values.tribalSigil || rawSigils.includes("TRIBAL");
      const activeOk = !values.activeSigil || sigils.some(
        s => sigilDescriptions[s] && sigilDescriptions[s].includes("[")
      );

      // Traits / tags / tribes / roles / credits
      const traitsOk = matchesList(Selected.traits, splitComma(card.Traits), values.exclusiveTraits);
      const tagsOk = matchesList(Selected.tags, splitTags(card.Tags), values.exclusiveTags);
      const tribesOk = matchesList(Selected.tribes, splitSpaces(card.Tribes), values.exclusiveTribes);
      const rolesOk = matchesList(Selected.roles, splitComma(card.Role), values.exclusiveRoles);
      const creditsOk = matchesList(Selected.credits, splitComma(card.Credit), values.exclusiveCredits);

      // Costs
      const costs = (card.Cost || "").toLowerCase();
      let costsOk = true;
      if (selectedCosts.length > 0) {
        if (values.onlyCosts) {
          const leftovers = costs.split(" ").filter(c =>
            c &&
            !["shattered", "asterisk", "+"].includes(c) &&
            isNaN(Number(c)) &&
            !selectedCosts.some(c2 => c.includes(c2))
          );
          costsOk = selectedCosts.every(c => costs.includes(c)) && leftovers.length === 0;
        } else if (values.exclusiveCosts) {
          costsOk = selectedCosts.every(c => costs.includes(c));
        } else {
          costsOk = selectedCosts.some(c => costs.includes(c));
        }
      }

      // Flags
      const isDraftable = card.Draftable !== "";
      const draftableOk = (!values.onlyDraftable || isDraftable) && (!values.onlyNotDraftable || !isDraftable);
      const evolvedOk = !values.onlyEvolved || card.Evolution !== "";
      const gemifiedOk = !values.onlyGemified || card.Gemified !== "";

      return nameOk && templeOk && tierOk && statsOk &&
        sigilsOk && latcherOk && cellOk && rainbowOk && tribalOk && activeOk &&
        traitsOk && tagsOk && tribesOk && rolesOk && creditsOk && costsOk &&
        draftableOk && evolvedOk && gemifiedOk;
    });

    CardDisplay.render(sortCards(result));
  }
};

function compare(val, op, target) {
  if (isNaN(target)) return true;
  switch (op) {
    case "=": return val === target;
    case "<": return val < target;
    case ">": return val > target;
    case "<=": return val <= target;
    case ">=": return val >= target;
    case "!=": return val !== target;
    default: return true;
  }
}

// ========== FILTER UI SETUP ==========

const FilterUI = {
  setup(cards) {
    this.initDropdowns(cards);
    this.initNameFilter();
    this.initCostSearch();

    this.initTagSearch("sigil-search", "sigil-suggestions", "selected-sigils", allSigils, Selected.sigils);
    this.initTagSearch("trait-search", "trait-suggestions", "selected-traits", allTraits, Selected.traits);
    this.initTagSearch("tag-search", "tag-suggestions", "selected-tags", allTags, Selected.tags);
    this.initTagSearch("tribe-search", "tribe-suggestions", "selected-tribes", allTribes, Selected.tribes);
    this.initTagSearch("role-search", "role-suggestions", "selected-roles", allRoles, Selected.roles);
    this.initTagSearch("artist-search", "artist-suggestions", "selected-artists", allCredits, Selected.credits);

    this.initReset();
    this.initSortControls();
  },

  initNameFilter() {
    document.getElementById("name-filter").addEventListener("input", () => FilterLogic.apply());
  },

  initDropdowns(cards) {
    const templeSelect = document.getElementById("temple-filter");
    const tierSelect = document.getElementById("tier-filter");
    const temples = [...new Set(cards.map(c => c.Temple).filter(Boolean))];
    const tiers = [...new Set(cards.map(c => c.Tier).filter(Boolean))];

    temples.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      templeSelect.appendChild(opt);
    });
    tiers.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      tierSelect.appendChild(opt);
    });

    [
      "temple-filter", "tier-filter", "draftable-filter", "not-draftable-filter", "evolved-filter", "gemified-filter",
      "power-operator", "power-value", "health-operator", "health-value",
      "exclusive-sigils-checkbox", "exclusive-traits-checkbox", "exclusive-tags-checkbox", "exclusive-tribes-checkbox",
      "exclusive-cost-checkbox", "exclusive-roles-checkbox", "exclusive-artists-checkbox", "only-cost-checkbox",
      "latcher-sigil-checkbox", "cell-sigil-checkbox", "rainbow-sigil-checkbox", "tribal-sigil-checkbox", "active-sigil-checkbox"
    ].forEach(id => document.getElementById(id).addEventListener("input", () => FilterLogic.apply()));
  },

  initCostSearch() {
    const checkboxes = document.querySelectorAll(".cost-checkbox");
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        selectedCosts = Array.from(checkboxes).filter(ch => ch.checked).map(ch => ch.value);
        FilterLogic.apply();
      });
    });
  },

  initReset() {
    document.getElementById("reset-filters").addEventListener("click", () => {
      location.reload();
    });
  },

  // One generic "search box + suggestions + selected chips" widget, used by
  // sigils, traits, tags, tribes, roles and credits.
  initTagSearch(searchId, suggestionsId, selectedId, items, selectedList) {
    const search = document.getElementById(searchId);
    const suggestions = document.getElementById(suggestionsId);
    const selectedDiv = document.getElementById(selectedId);

    const refreshTags = () => {
      renderTags(selectedList, selectedDiv, removed => {
        const idx = selectedList.indexOf(removed);
        if (idx !== -1) selectedList.splice(idx, 1);
        refreshTags();
        FilterLogic.apply();
      });
    };

    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;

      items.filter(item => item.toLowerCase().includes(query)).forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = item;
        div.addEventListener("click", () => {
          if (!selectedList.includes(item)) {
            selectedList.push(item);
            refreshTags();
            FilterLogic.apply();
          }
          search.value = "";
          suggestions.innerHTML = "";
        });
        suggestions.appendChild(div);
      });
    });
  },

  initSortControls() {
    const sortField = document.getElementById("sort-field");
    const sortDirection = document.getElementById("sort-direction");
    const sortButton = document.getElementById("sort-cards-btn");

    const updateDirectionState = () => {
      sortDirection.disabled = sortField.value === "random";
    };

    sortField.addEventListener("change", updateDirectionState);
    updateDirectionState();

    sortButton.addEventListener("click", () => {
      const field = sortField.value;
      currentSort = { field, direction: sortDirection.value };

      if (field === "random") {
        currentSort.randomOrder = shuffleArray(allCards.map(card => card["Card Name"]));
      }

      FilterLogic.apply();
    });
  }
};

function renderTags(list, container, onRemove) {
  container.innerHTML = "";
  list.forEach(item => {
    const tag = document.createElement("span");
    tag.className = "tribe-tag";
    tag.textContent = item;
    const remove = document.createElement("span");
    remove.className = "remove-tribe";
    remove.textContent = "✕";
    remove.addEventListener("click", () => onRemove(item));
    tag.appendChild(remove);
    container.appendChild(tag);
  });
}

// ========== DISPLAY ==========

const popup = document.getElementById("card-popup-overlay");

function makeTagSpan(text, descriptions) {
  const tag = document.createElement("span");
  tag.className = "tribe-tag";
  tag.textContent = text;
  if (descriptions) {
    tag.addEventListener("mouseenter", () => {
      const desc = descriptions[text] || "";
      if (desc) showTooltip(desc);
    });
    tag.addEventListener("mouseleave", hideTooltip);
  }
  return tag;
}

function addLabelledTags(parent, label, values, descriptions) {
  if (values.length === 0) return;
  const p = document.createElement("p");
  p.innerHTML = `<strong>${label}:</strong> `;
  values.forEach(v => p.appendChild(makeTagSpan(v, descriptions)));
  parent.appendChild(p);
}

function openCardPopup(card) {
  const name = card["Card Name"];
  const content = document.getElementById("popup-content");
  content.innerHTML = "";

  // LEFT: main image + credit
  const popupImagesLeft = document.createElement("div");
  popupImagesLeft.className = "popup-images";
  popupImagesLeft.appendChild(createCardImage(card));

  const creditLabel = document.createElement("p");
  creditLabel.style.textAlign = "center";
  creditLabel.style.fontStyle = "italic";
  creditLabel.style.marginTop = "0.5rem";
  creditLabel.textContent = card.Credit ? `by ${card.Credit}` : "";
  popupImagesLeft.appendChild(creditLabel);
  content.appendChild(popupImagesLeft);

  // MIDDLE: details
  const details = document.createElement("div");
  details.className = "popup-details";

  const title = document.createElement("h2");
  title.textContent = name;
  details.appendChild(title);

  const subtitle = document.createElement("h3");
  const subtitleParts = [`${card.Tier || "Unknown"} ${card.Temple || "Unknown"}`];
  if (card.Tribes) subtitleParts.push(card.Tribes);
  if (card.Role) subtitleParts.push(card.Role);
  subtitle.textContent = subtitleParts.join(" - ");
  subtitle.style.color = "#ccc";
  subtitle.style.fontSize = "1rem";
  details.appendChild(subtitle);

  if (card["Flavor Text"]) {
    const flavor = document.createElement("blockquote");
    flavor.textContent = card["Flavor Text"];
    flavor.style.fontStyle = "italic";
    flavor.style.margin = "1rem 0";
    details.appendChild(flavor);
  }

  const stats = document.createElement("p");
  stats.innerHTML = `<strong>Stats:</strong> ${card.Power || 0}/${card.Health || 0}`;
  details.appendChild(stats);

  addLabelledTags(details, "Sigils", cleanSigilsOf(card), sigilDescriptions);
  addLabelledTags(details, "Traits", splitComma(card.Traits), traitDescriptions);
  addLabelledTags(details, "Tags", splitTags(card.Tags), null);

  if (!card.Draftable) {
    const draftNote = document.createElement("p");
    draftNote.textContent = "This card cannot be drawn in card events.";
    details.appendChild(draftNote);
  }

  if (card.Gemified) {
    const gemNote = document.createElement("p");
    gemNote.textContent = "This card is enhanced by gems.";
    details.appendChild(gemNote);
  }

  if (card.Evolution) {
    const evoNote = document.createElement("p");
    evoNote.textContent = `This card turns into ${card.Evolution} when it evolves.`;
    details.appendChild(evoNote);
  }

  content.appendChild(details);

  // RIGHT: tokens + evolved cards
  const extraCards = [];
  const rightGroup = document.createElement("div");
  rightGroup.className = "popup-right-group";

  const addCardImage = cardName => {
    const extraCard = allCards.find(c => c["Card Name"] === cardName);
    if (!extraCard || extraCards.includes(extraCard)) return;
    extraCards.push(extraCard);

    const wrapper = document.createElement("div");
    wrapper.className = "popup-image-wrapper";
    wrapper.appendChild(createCardImage(extraCard));

    const extraCredit = document.createElement("p");
    extraCredit.textContent = extraCard.Credit ? `by ${extraCard.Credit}` : "";
    extraCredit.style.textAlign = "center";
    extraCredit.style.fontStyle = "italic";
    extraCredit.style.marginTop = "0.5rem";
    wrapper.appendChild(extraCredit);

    rightGroup.appendChild(wrapper);
  };

  splitComma(card.Token).forEach(addCardImage);
  if (card.Evolution) addCardImage(card.Evolution);

  content.appendChild(rightGroup);
  popup.classList.remove("hidden");
}

const CardDisplay = {
  render(cards) {
    const container = document.getElementById("card-container");
    container.innerHTML = "";

    cards.forEach(card => {
      const div = document.createElement("div");
      div.className = "card";

      const name = card["Card Name"];
      const temple = card.Temple || "Unknown";
      const tier = card.Tier || "Unknown";

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `<strong></strong><br>${temple} — ${tier}`;
      info.querySelector("strong").textContent = name;

      div.appendChild(createCardImage(card));
      div.appendChild(info);
      div.addEventListener("click", () => openCardPopup(card));

      const addButton = document.createElement("button");
      addButton.textContent = "+";
      addButton.className = "add-to-deck-btn";
      addButton.style.display = deckVisible ? "block" : "none";
      addButton.addEventListener("click", e => {
        e.stopPropagation();
        addToDeck(card);
      });

      div.style.position = "relative";
      div.appendChild(addButton);
      container.appendChild(div);
    });

    document.getElementById("card-count").textContent = `${cards.length} card(s) found`;
  }
};

document.getElementById("popup-close").addEventListener("click", () => {
  popup.classList.add("hidden");
});
document.getElementById("card-popup-overlay").addEventListener("click", e => {
  if (e.target === e.currentTarget) popup.classList.add("hidden");
});

// ========== TOOLTIP ==========

const tooltip = document.getElementById("custom-tooltip");

document.addEventListener("mousemove", e => {
  if (!tooltip.classList.contains("hidden")) {
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY + 15}px`;
  }
});

function showTooltip(text) {
  tooltip.textContent = text;
  tooltip.classList.remove("hidden");
}

function hideTooltip() {
  tooltip.classList.add("hidden");
}

// ========== DECK BUILDER ==========

function addToDeck(card) {
  if (deck.length >= 40) return alert("Deck full (40 max)");
  deck.push(card);
  renderDeck();
}

function removeFromDeck(index) {
  deck.splice(index, 1);
  renderDeck();
}

function renderDeck() {
  const deckContainer = document.getElementById("deck-container");
  deckContainer.innerHTML = "";

  deck.forEach((card, i) => {
    const div = document.createElement("div");
    div.className = "deck-card";
    div.appendChild(createCardImage(card));

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "−";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", () => removeFromDeck(i));
    div.appendChild(removeBtn);

    deckContainer.appendChild(div);
  });

  document.getElementById("deck-count").textContent = deck.length;
}

document.getElementById("export-deck-btn").addEventListener("click", () => {
  const names = deck.map(card => card["Card Name"]);
  document.getElementById("export-textarea").value = JSON.stringify(names, null, 2);
  document.getElementById("export-popup").classList.remove("hidden");
});

document.getElementById("export-close").addEventListener("click", () => {
  document.getElementById("export-popup").classList.add("hidden");
});

document.getElementById("export-popup").addEventListener("click", e => {
  if (e.target === e.currentTarget) {
    document.getElementById("export-popup").classList.add("hidden");
  }
});

document.getElementById("copy-deck-btn").addEventListener("click", () => {
  const textarea = document.getElementById("export-textarea");
  textarea.select();
  textarea.setSelectionRange(0, 99999); // mobile support
  document.execCommand("copy");
});

document.getElementById("toggle-deck").addEventListener("click", () => {
  deckVisible = !deckVisible;
  document.getElementById("deck-body").style.display = deckVisible ? "block" : "none";
  document.getElementById("toggle-deck").textContent = deckVisible ? "−" : "+";
  document.querySelectorAll(".add-to-deck-btn").forEach(btn => {
    btn.style.display = deckVisible ? "block" : "none";
  });
});
