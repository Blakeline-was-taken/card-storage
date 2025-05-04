let allCards = [];
let allSigils = [];
let allTraits = [];
let allTribes = [];
let allArtists = [];
let selectedCosts = [];
let selectedSigils = [];
let selectedTraits = [];
let selectedTribes = [];
let selectedArtists = [];

// ========== INIT ==========

fetch("../../cards.csv")
  .then(response => response.text())
  .then(parseCSV)
  .then(cards => {
    allCards = cards;
    allSigils = extractUniqueSigils(cards);
    allTraits = extractUniqueTraits(cards);
    allTribes = extractUniqueTribes(cards);
    allArtists = extractUniqueArtists(cards);
    
    FilterUI.setup(cards);
    FilterLogic.apply();
  })
  .catch(console.error);

// ========== PARSING ==========

function parseCSV(csvText) {
  const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    let values = [], current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && line[i - 1] !== '\\') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

// ========== EXTRACTION UTILS ==========

function extractUniqueSigils(cards) {
  const set = new Set();
  cards.forEach(card => {
    if (card.Sigils) {
      card.Sigils.split(",").forEach(sigil => {
        let clean = sigil.trim();
        if (clean === "TRIBAL" || clean === "RAINBOW") return;
        set.add(clean.includes("_") ? clean.split("_")[1] : clean);
      });
    }
  });
  return [...set].sort();
}

function extractUniqueTraits(cards) {
  const set = new Set();
  cards.forEach(card => {
    if (card.Traits) {
      card.Traits.split(",").forEach(trait => {
        if (trait.trim) set.add(trait.trim());
      });
    }
  });
  return [...set].sort();
}

function extractUniqueTribes(cards) {
  const set = new Set();
  cards.forEach(card => {
    if (card.Tribes) {
      card.Tribes.split(" ").forEach(tribe => {
        if (tribe.trim()) set.add(tribe.trim());
      });
    }
  });
  return [...set].sort();
}

function extractUniqueArtists(cards) {
  const set = new Set();
  cards.forEach(card => {
    if (card.Artist) {
      card.Artist.split(",").forEach(artist => {
        if (artist.trim) set.add(artist.trim());
      });
    }
  });
  return [...set].sort();
}

// ========== LOGIC ==========

const FilterLogic = {
  getCurrentValues() {
    return {
      temple: document.getElementById("temple-filter").value,
      tier: document.getElementById("tier-filter").value,
      powerOp: document.getElementById("power-operator").value,
      powerVal: parseInt(document.getElementById("power-value").value),
      healthOp: document.getElementById("health-operator").value,
      healthVal: parseInt(document.getElementById("health-value").value),
      exclusiveSigils: document.getElementById("exclusive-sigils-checkbox").checked,
      exclusiveTraits: document.getElementById("exclusive-traits-checkbox").checked,
      exclusiveTribes: document.getElementById("exclusive-tribes-checkbox").checked,
      exclusiveCosts: document.getElementById("exclusive-cost-checkbox").checked,
      exclusiveArtists: document.getElementById("exclusive-artists-checkbox").checked,
      draftable: document.getElementById("draftable-filter").checked,
      evolved: !document.getElementById("evolved-filter").checked,
      gemified: !document.getElementById("gemified-filter").checked,
    };
  },

  apply() {
    const values = this.getCurrentValues();

    const result = allCards.filter(card => {
      const nameQuery = document.getElementById("name-filter").value.trim().toLowerCase();
      const name = (card["Card Name"] || "").toLowerCase();
      const nameOk = !nameQuery || name.includes(nameQuery);
      
      const templeOk = !values.temple || card.Temple === values.temple;
      const tierOk = !values.tier || card.Tier === values.tier;

      const power = parseInt(card.Power) || 0;
      const health = parseInt(card.Health) || 0;
      const statsOk =
        compare(power, values.powerOp, values.powerVal) &&
        compare(health, values.healthOp, values.healthVal);

      const sigils = (card.Sigils || "").split(",")
        .map(s => {
          let clean = s.trim();
          if (clean === "TRIBAL" || clean === "RAINBOW") return;
          return clean.includes("_") ? clean.split("_")[1] : clean;
        }).filter(Boolean);

      const sigilsOk = selectedSigils.length === 0 || (
        values.exclusiveSigils
          ? selectedSigils.every(s => sigils.includes(s))
          : selectedSigils.some(s => sigils.includes(s))
      );

      const traits = (card.Traits || "").split(",");
      const traitsOk = selectedTraits.length === 0 || (
        values.exclusiveTraits
          ? selectedTraits.every(t => traits.includes(t))
          : selectedTraits.some(t => traits.includes(t))
      );

      const tribes = (card.Tribes || "").split(" ");
      const tribesOk = selectedTribes.length === 0 || (
        values.exclusiveTribes
          ? selectedTribes.every(t => tribes.includes(t))
          : selectedTribes.some(t => tribes.includes(t))
      );

      const costs = (card.Cost || "").toLowerCase();
      const costsOk = selectedCosts.length === 0 || (
        values.exclusiveCosts
          ? selectedCosts.every(c => costs.includes(c))
          : selectedCosts.some(c => costs.includes(c))
      );

      const artist = card.Artist || "";
      const artistsOk = selectedArtists.length === 0 || (
        values.exclusiveArtists
          ? selectedArtists.every(a => artist.includes(a))
          : selectedArtists.some(a => artist.includes(a))
      );

      const isDraftable = card.Draftable !== "";
      const draftableOk = values.draftable || isDraftable;

      const hasEvolution = card.Evolution !== "";
      const evolvedOk = values.evolved || hasEvolution;

      const isGemified = card.Gemified !== "";
      const gemifiedOk = values.gemified || isGemified;

      return nameOk && templeOk && tierOk && statsOk && sigilsOk && traitsOk && tribesOk && costsOk && artistsOk && draftableOk && evolvedOk && gemifiedOk;
    });

    CardDisplay.render(result);
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
    this.initNameFilter();
    this.initCostSearch();
    this.initDropdowns(cards);
    this.initSigilSearch(allSigils);
    this.initTraitSearch(allTraits);
    this.initTribeSearch(allTribes);
    this.initArtistSearch(allArtists);
    this.initReset();
  },

  initNameFilter() {
    const nameInput = document.getElementById("name-filter");
    nameInput.addEventListener("input", () => {
      FilterLogic.apply();
    });
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

    ["temple-filter", "tier-filter", "draftable-filter", "evolved-filter", "gemified-filter",
     "power-operator", "power-value", "health-operator", "health-value",
     "exclusive-sigils-checkbox", "exclusive-traits-checkbox", "exclusive-tribes-checkbox",
     "exclusive-cost-checkbox", "exclusive-artists-checkbox"
    ].forEach(id => document.getElementById(id).addEventListener("input", () => FilterLogic.apply()));
  },

  initCostSearch() {
    const checkboxes = document.querySelectorAll(".cost-checkbox");

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        selectedCosts = Array.from(checkboxes)
          .filter(ch => ch.checked)
          .map(ch => ch.value);
        FilterLogic.apply();
      });
    });
  },

  initReset() {
    document.getElementById("reset-filters").addEventListener("click", () => {
      location.reload();
    });
  },

  initSigilSearch(sigils) {
    const search = document.getElementById("sigil-search");
    const suggestions = document.getElementById("sigil-suggestions");
    const selectedDiv = document.getElementById("selected-sigils");

    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;

      sigils.filter(s => s.toLowerCase().includes(query)).forEach(s => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = s;
        div.addEventListener("click", () => {
          if (!selectedSigils.includes(s)) {
            selectedSigils.push(s);
            renderTags(selectedSigils, selectedDiv, t => {
              selectedSigils = selectedSigils.filter(x => x !== t);
              FilterLogic.apply();
            });
            FilterLogic.apply();
          }
          search.value = "";
          suggestions.innerHTML = "";
        });
        suggestions.appendChild(div);
      });
    });
  },

  initTraitSearch(traits) {
    const search = document.getElementById("trait-search");
    const suggestions = document.getElementById("trait-suggestions");
    const selectedDiv = document.getElementById("selected-traits");

    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;

      traits.filter(t => t.toLowerCase().includes(query)).forEach(t => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = t;
        div.addEventListener("click", () => {
          if (!selectedTraits.includes(t)) {
            selectedTraits.push(t);
            renderTags(selectedTraits, selectedDiv, ta => {
              selectedTraits = selectedTraits.filter(x => x !== ta);
              FilterLogic.apply();
            });
            FilterLogic.apply();
          }
          search.value = "";
          suggestions.innerHTML = "";
        });
        suggestions.appendChild(div);
      });
    });
  },

  initTribeSearch(tribes) {
    const search = document.getElementById("tribe-search");
    const suggestions = document.getElementById("tribe-suggestions");
    const selectedDiv = document.getElementById("selected-tribes");

    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;

      tribes.filter(t => t.toLowerCase().includes(query)).forEach(t => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = t;
        div.addEventListener("click", () => {
          if (!selectedTribes.includes(t)) {
            selectedTribes.push(t);
            renderTags(selectedTribes, selectedDiv, r => {
              selectedTribes = selectedTribes.filter(x => x !== r);
              FilterLogic.apply();
            });
            FilterLogic.apply();
          }
          search.value = "";
          suggestions.innerHTML = "";
        });
        suggestions.appendChild(div);
      });
    });
  },

  initArtistSearch(artists) {
    const search = document.getElementById("artist-search");
    const suggestions = document.getElementById("artist-suggestions");
    const selectedDiv = document.getElementById("selected-artists");
  
    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;
  
      artists.filter(a => a.toLowerCase().includes(query)).forEach(a => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = a;
        div.addEventListener("click", () => {
          if (!selectedArtists.includes(a)) {
            selectedArtists.push(a);
            renderTags(selectedArtists, selectedDiv, r => {
              selectedArtists = selectedArtists.filter(x => x !== r);
              FilterLogic.apply();
            });
            FilterLogic.apply();
          }
          search.value = "";
          suggestions.innerHTML = "";
        });
        suggestions.appendChild(div);
      });
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
    remove.addEventListener("click", () => {
      onRemove(item);
      container.removeChild(tag);
    });
    tag.appendChild(remove);
    container.appendChild(tag);
  });
}

// ========== DISPLAY ==========

const popup = document.getElementById("card-popup-overlay");

const CardDisplay = {
  render(cards) {
    const container = document.getElementById("card-container");
    container.innerHTML = "";

    cards.forEach(card => {
      const div = document.createElement("div");
      div.className = "card";
      div.dataset.card = JSON.stringify(card);

      const img = document.createElement("img");
      const name = card["Card Name"];
      const temple = card.Temple || "Unknown";
      const tier = card.Tier || "Unknown";
      const isDraftable = card.Draftable !== "";
      const folder = (!isDraftable && tier !== "Side Deck" && tier !== "Talking" && temple !== "Terrain") ? "Not Draftable" : tier;

      img.src = `../../cards/${temple}/${folder}/${name}.png`;
      img.alt = name;

      const info = document.createElement("div");
      info.className = "info";
      info.innerHTML = `<strong>${name}</strong><br>${temple} — ${folder}`;

      div.appendChild(img);
      div.appendChild(info);
      container.appendChild(div);

      // === Gestion du clic sur la carte ===
      div.addEventListener("click", () => {
        const tribes = card.Tribes.length > 0 ? "- " + card.Tribes : "";
        document.getElementById("popup-card-image").src = img.src;
        document.getElementById("popup-card-name").textContent = name;
        document.getElementById("popup-card-subtitle").textContent = `${tier} ${temple} ${tribes}`;
        document.getElementById("popup-card-flavor").textContent = card["Flavor Text"] || "";
      
        document.getElementById("popup-card-draftable").textContent =
          card.Draftable ? "" : "This card is not draftable in regular card events.";
      
        document.getElementById("popup-card-evolution").textContent =
          card.Evolution ? `This card turns into ${card.Evolution} when it evolves.` : "";
      
        // === Gestion de l'éventuelle carte alternative ===
        const altName = name + "_t";
        let altCard = cards.find(c => c["Card Name"] === altName);
      
        if (!altCard && card.Evolution) {
          altCard = cards.find(c => c["Card Name"] === card.Evolution);
        }
      
        if (altCard) {
          const rightImgDiv = document.createElement("div");
          rightImgDiv.className = "popup-images";
          const rightImg = document.createElement("img");
          rightImg.id = "popup-alt-card-image";
          const altName = altCard["Card Name"];
          const altTemple = altCard.Temple || "Unknown";
          const altTier = altCard.Tier || "Unknown";
          const altIsDraftable = altCard.Draftable !== "";
          const altFolder = (!altIsDraftable && altTier !== "Side Deck" && altTier !== "Talking" && altTemple !== "Terrain")
            ? "Not Draftable"
            : altTier;
          rightImg.src = `../../cards/${altTemple}/${altFolder}/${altName}.png`;
          rightImg.alt = altName;
          
          rightImg.style.marginRight = "20px";
          rightImgDiv.appendChild(rightImg);
          document.getElementById("popup-content").appendChild(rightImgDiv);
        }
      
        popup.classList.remove("hidden");
      });      
    });

    document.getElementById("card-count").textContent = `${cards.length} card(s) found`;
  }
};

document.getElementById("popup-close").addEventListener("click", () => {
  popup.classList.add("hidden");
  const altCardImage = document.getElementById("popup-alt-card-image");
  if (altCardImage) altCardImage.remove(); // Remove the alt card image if it exists
});
document.getElementById("card-popup-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    popup.classList.add("hidden");
    const altCardImage = document.getElementById("popup-alt-card-image");
    if (altCardImage) altCardImage.remove(); // Remove the alt card image if it exists
  }
});
