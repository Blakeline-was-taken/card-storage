export default async function(container, bannerHtml) {
    container.innerHTML = `<article>
    <h1>Sigils</h1>

    <ul>
        <li><a href="#upgradable">Upgradable Sigils</a></li>
        <li><a href="#normal">Not Upgradable Sigils</a></li>
    </ul>

    <h2 id="upgradable">Upgradable Sigils</h2>
    <table class="wiki-table sigils-table">
        <thead>
        <tr>
            <th>Name</th>
            <th>Sigil</th>
            <th>Upgrade</th>
        </tr>
        </thead>
        <tbody id="sigils-upgradable"></tbody>
    </table>

    <h2 id="normal">Not Upgradable Sigils</h2>
    <table class="wiki-table sigils-table">
        <thead>
        <tr>
            <th>Name</th>
            <th>Sigil</th>
        </tr>
        </thead>
        <tbody id="sigils-normal"></tbody>
    </table>
    </article>` + bannerHtml;

  const upgradableBody = container.querySelector("#sigils-upgradable");
  const normalBody = container.querySelector("#sigils-normal");

  try {
    const response = await fetch("../../sigils.csv");
    const text = await response.text();

    const rows = parseCSV(text);

    // Stop at "Frozen Away"
    const frozenIndex = rows.findIndex(r => r.Name === "Frozen Away");
    const filteredRows = frozenIndex >= 0 ? rows.slice(0, frozenIndex) : rows;

    // Build upgrade target set
    const upgradeTargets = new Set();
    for (const row of filteredRows) {
      if (row.Upgraded_sigil) {
        upgradeTargets.add(row.Upgraded_sigil);
      }
    }

    for (const row of filteredRows) {

      // Exclude attack sigils from main rows
      if (row.Is_attack_sigil) continue;

      const hasUpgrade = !!row.Upgraded_sigil;
      const isUpgradeOfAnother = upgradeTargets.has(row.Name);

      // Determine folder
      function getFolder(sig) {
        if (sig.Is_attack_sigil) return "power/";
        if (sig.Description.includes("[")) return "active/";
        if (!sig.Upgraded_sigil && upgradeTargets.has(sig.Name)) return "upgraded/";
        return "";
      }

      function createImageCell(sig) {
        const folder = getFolder(sig);
        const img = document.createElement("img");
        img.src = `../../sigils_no_bg/${folder}${sig.Name}.png`;
        img.alt = sig.Name;
        img.onerror = () => {
          img.onerror = null;
          img.src = "../../sigils_no_bg/Sigil_Missing2.png";
        };
        img.style.width = "375px";
        return img;
      }

      if (hasUpgrade) {
        const tr = document.createElement("tr");

        const nameTd = document.createElement("td");
        nameTd.textContent = row.Name;

        const imgTd = document.createElement("td");
        imgTd.appendChild(createImageCell(row));

        const upgradeTd = document.createElement("td");
        const upgradeRow = filteredRows.find(r => r.Name === row.Upgraded_sigil);
        if (upgradeRow) {
          upgradeTd.appendChild(createImageCell(upgradeRow));
        }

        tr.appendChild(nameTd);
        tr.appendChild(imgTd);
        tr.appendChild(upgradeTd);

        upgradableBody.appendChild(tr);

      } else {
        // Skip if:
        // - It is an upgrade of another
        // - It is an attack sigil
        if (isUpgradeOfAnother) continue;

        const tr = document.createElement("tr");

        const nameTd = document.createElement("td");
        nameTd.textContent = row.Name;

        const imgTd = document.createElement("td");
        imgTd.appendChild(createImageCell(row));

        tr.appendChild(nameTd);
        tr.appendChild(imgTd);

        normalBody.appendChild(tr);
      }
    }

  } catch (err) {
    container.innerHTML += `<p>Error: ${err}</p>`;
  }

  // Simple CSV parser handling quoted commas
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    const headers = splitCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, index) => {
        obj[h.trim()] = values[index] ? values[index].trim() : "";
      });
      data.push(obj);
    }

    return data;
  }

  function splitCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result.map(v => v.replace(/^"|"$/g, ""));
  }
}