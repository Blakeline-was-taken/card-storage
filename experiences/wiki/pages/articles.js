export default function(container, bannerHtml) {
  container.innerHTML = `<article>
    <h1>All Articles</h1>
    <div id="articles-list"></div>
  </article>` + bannerHtml;

  const listContainer = container.querySelector("#articles-list");

  fetch("wikidata.json")
    .then(r => r.json())
    .then(data => {
      // Extract articles
      const articles = Object.entries(data)
        .map(([id, meta]) => ({
          id,
          title: meta.title || id,
          description: meta.description || ""
        }));

      // Sort articles by title
      articles.sort((a, b) => a.title.localeCompare(b.title));

      // Group by first letter (ignore "The ")
      const grouped = {};
      for (const art of articles) {
        let normalized = art.title.trim();
        if (normalized.toLowerCase().startsWith("the ")) {
          normalized = normalized.slice(4);
        }
        const letter = normalized[0].toUpperCase();
        if (!grouped[letter]) grouped[letter] = [];
        grouped[letter].push(art);
      }

      const letters = Object.keys(grouped).sort();

      // Generate invisible table
      let html = `<table class="layout-table">`;
      for (let i = 0; i < letters.length; i += 2) {
        html += `<tr>`;

        // Left column
        const leftLetter = letters[i];
        html += `<td style="width:50%;">`;
        html += `<h2>${leftLetter}</h2><ul>`;
        for (const art of grouped[leftLetter]) {
          html += `
            <li>
              <a href="wiki_index.html?page=${art.id}">${art.title}</a>
              ${art.description ? ` – <span class="desc">${art.description}</span>` : ""}
            </li>`;
        }
        html += `</ul>`;
        html += `</td>`;

        // Right column
        const rightLetter = letters[i + 1];
        if (rightLetter) {
          html += `<td style="width:50%;">`;
          html += `<h2>${rightLetter}</h2><ul>`;
          for (const art of grouped[rightLetter]) {
            html += `
              <li>
                <a href="wiki_index.html?page=${art.id}">${art.title}</a>
                ${art.description ? ` – <span class="desc">${art.description}</span>` : ""}
              </li>`;
          }
          html += `</ul>`;
          html += `</td>`;
        } else {
          html += `<td style="width:50%;"></td>`;
        }

        html += `</tr>`;
      }
      html += `</table>`;

      listContainer.innerHTML = html;
    })
    .catch(err => {
      listContainer.innerHTML = `<p>Error : ${err}</p>`;
    });
}
