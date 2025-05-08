let allCards = [];
let sigilDescriptions = {};
let traitDescriptions = {};
let allSigils = [];
let allTraits = [];
let allTribes = [];
let allRoles = [];
let allArtists = [];
let selectedCosts = [];
let selectedSigils = [];
let selectedTraits = [];
let selectedTribes = [];
let selectedRoles = [];
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
    allRoles = extractUniqueRoles(cards);
    allArtists = extractUniqueArtists(cards);
    
    FilterUI.setup(cards);
    FilterLogic.apply();
  })
  .catch(console.error);

fetch("../../sigils.csv")
.then(response => response.text())
.then(csv => {
  const rows = parseCSV(csv);
  rows.forEach(row => {
    if (row.Name && row.Description) {
      sigilDescriptions[row.Name.trim()] = row.Description.trim();
    }
  });
})
.catch(console.error);

fetch("../../traits.csv")
.then(response => response.text())
.then(csv => {
  const rows = parseCSV(csv);
  rows.forEach(row => {
    if (row.Name && row.Description) {
      traitDescriptions[row.Name.trim()] = row.Description.trim();
    }
  });
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

function extractUniqueRoles(cards) {
  const set = new Set();
  cards.forEach(card => {
    if (card.Role) {
      card.Role.split(",").forEach(role => {
        if (role.trim()) set.add(role.trim());
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
      latcherSigil: document.getElementById("latcher-sigil-checkbox").checked,
      cellSigil: document.getElementById("cell-sigil-checkbox").checked,
      rainbowSigil: document.getElementById("rainbow-sigil-checkbox").checked,
      tribalSigil: document.getElementById("tribal-sigil-checkbox").checked,
      exclusiveTraits: document.getElementById("exclusive-traits-checkbox").checked,
      exclusiveTribes: document.getElementById("exclusive-tribes-checkbox").checked,
      exclusiveCosts: document.getElementById("exclusive-cost-checkbox").checked,
      exclusiveRoles: document.getElementById("exclusive-roles-checkbox").checked,
      exclusiveArtists: document.getElementById("exclusive-artists-checkbox").checked,
      draftable: !document.getElementById("draftable-filter").checked,
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

      const rawSigils = (card.Sigils || "").split(",").map(s => s.trim());

      const latcherOk = !values.latcherSigil || rawSigils.some(s => s.startsWith("LATCHER_"));
      const cellOk = !values.cellSigil || rawSigils.some(s => s.startsWith("CELL_"));
      const rainbowOk = !values.rainbowSigil || rawSigils.includes("RAINBOW");
      const tribalOk = !values.tribalSigil || rawSigils.includes("TRIBAL");

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

      const roles = (card.Role || "").split(",");
      const rolesOk = selectedRoles.length === 0 || (
        values.exclusiveRoles
          ? selectedRoles.every(r => roles.includes(r))
          : selectedRoles.some(r => roles.includes(r))
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

      return nameOk && templeOk && tierOk && statsOk && sigilsOk && latcherOk && cellOk && rainbowOk && tribalOk && traitsOk && tribesOk && costsOk && rolesOk && artistsOk && draftableOk && evolvedOk && gemifiedOk;
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
    this.initDropdowns(cards);
    this.initNameFilter();
    this.initCostSearch();
    this.initSigilSearch(allSigils);
    this.initTraitSearch(allTraits);
    this.initTribeSearch(allTribes);
    this.initRoleSearch(allRoles);
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
     "exclusive-cost-checkbox", "exclusive-roles-checkbox", "exclusive-artists-checkbox",
     "latcher-sigil-checkbox", "cell-sigil-checkbox", "rainbow-sigil-checkbox", "tribal-sigil-checkbox"
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

  initRoleSearch(roles) {
    const search = document.getElementById("role-search");
    const suggestions = document.getElementById("role-suggestions");
    const selectedDiv = document.getElementById("selected-roles");
  
    search.addEventListener("input", () => {
      const query = search.value.toLowerCase();
      suggestions.innerHTML = "";
      if (!query) return;
  
      roles.filter(r => r.toLowerCase().includes(query)).forEach(r => {
        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = r;
        div.addEventListener("click", () => {
          if (!selectedRoles.includes(r)) {
            selectedRoles.push(r);
            renderTags(selectedRoles, selectedDiv, ro => {
              selectedRoles = selectedRoles.filter(x => x !== ro);
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
        const content = document.getElementById("popup-content");
        content.innerHTML = "";
      
        const popupImagesLeft = document.createElement("div");
        popupImagesLeft.className = "popup-images";
      
        const mainImg = document.createElement("img");
        mainImg.src = img.src;
        mainImg.alt = name;
        popupImagesLeft.appendChild(mainImg);
      
        const artistLabel = document.createElement("p");
        artistLabel.style.textAlign = "center";
        artistLabel.style.fontStyle = "italic";
        artistLabel.style.marginTop = "0.5rem";
        artistLabel.textContent = card.Artist ? `by ${card.Artist}` : "";
        popupImagesLeft.appendChild(artistLabel);
      
        content.appendChild(popupImagesLeft);
      
        const details = document.createElement("div");
        details.className = "popup-details";
      
        const title = document.createElement("h2");
        title.textContent = name;
        details.appendChild(title);
      
        const subtitle = document.createElement("h3");
        const subtitleTemple = card.Temple || "Unknown"
        const subtitleTier = card.Tier || "Unknown";
        const subtitleParts = [subtitleTier + " " + subtitleTemple];
        if (card.Tribes?.trim()) subtitleParts.push(card.Tribes);
        if (card.Role?.trim()) subtitleParts.push(card.Role);
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
      
        const sigils = (card.Sigils || "")
          .split(",")
          .map(s => s.trim())
          .filter(s => s && s !== "TRIBAL" && s !== "RAINBOW")
          .map(s => s.includes("_") ? s.split("_")[1] : s);
        if (sigils.length > 0) {
          const p = document.createElement("p");
          p.innerHTML = `<strong>Sigils:</strong> `;
          sigils.forEach(s => {
            const tag = document.createElement("span");
            tag.className = "tribe-tag";
            tag.textContent = s;
          
            tag.addEventListener("mouseenter", () => {
              const desc = sigilDescriptions[s] || "";
              if (desc) showTooltip(desc);
            });
          
            tag.addEventListener("mouseleave", hideTooltip);
          
            p.appendChild(tag);
          });
          details.appendChild(p);
        }
      
        const traits = (card.Traits || "")
          .split(",")
          .map(t => t.trim())
          .filter(Boolean);
        if (traits.length > 0) {
          const p = document.createElement("p");
          p.innerHTML = `<strong>Traits:</strong> `;
          traits.forEach(t => {
            const tag = document.createElement("span");
            tag.className = "tribe-tag";
            tag.textContent = t;
          
            tag.addEventListener("mouseenter", () => {
              const desc = traitDescriptions[t] || "";
              if (desc) showTooltip(desc);
            });
          
            tag.addEventListener("mouseleave", hideTooltip);
          
            p.appendChild(tag);
          });          
          details.appendChild(p);
        }
      
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
      
        // === RIGHT: tokens + evolved cards ===
        const extraCards = [];
        const popupImagesRightGroup = document.createElement("div");
        popupImagesRightGroup.className = "popup-right-group";

        const addCardImage = (cardName) => {
          const extraCard = allCards.find(c => c["Card Name"] === cardName);
          if (!extraCard) return;
          if (extraCards.includes(extraCard)) return;
          extraCards.push(extraCard);

          const wrapper = document.createElement("div");
          wrapper.className = "popup-image-wrapper";

          const extraImg = document.createElement("img");
          const temple = extraCard.Temple || "Unknown";
          const tier = extraCard.Tier || "Unknown";
          const draftable = extraCard.Draftable !== "";
          const folder = (!draftable && tier !== "Side Deck" && tier !== "Talking" && temple !== "Terrain")
            ? "Not Draftable" : tier;

          extraImg.src = `../../cards/${temple}/${folder}/${cardName}.png`;
          extraImg.alt = cardName;

          const extraArtist = document.createElement("p");
          extraArtist.textContent = extraCard.Artist ? `by ${extraCard.Artist}` : "";
          extraArtist.style.textAlign = "center";
          extraArtist.style.fontStyle = "italic";
          extraArtist.style.marginTop = "0.5rem";

          wrapper.appendChild(extraImg);
          wrapper.appendChild(extraArtist);
          popupImagesRightGroup.appendChild(wrapper);
        };

        if (card.Token?.trim()) {
          card.Token.split(",").map(t => t.trim()).filter(Boolean).forEach(addCardImage);
        }
        if (card.Evolution?.trim()) {
          addCardImage(card.Evolution);
        }

        content.appendChild(popupImagesRightGroup);
      
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

const tooltip = document.getElementById("custom-tooltip");

document.addEventListener("mousemove", (e) => {
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
