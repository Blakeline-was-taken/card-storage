export default function(container, bannerHtml) {
  container.innerHTML = `<article>
    <h1 id="page-title">All Collections</h1>
    <div class="card-gallery" id="collections-container"></div>
  </article>` + bannerHtml;

  const collectionsContainer = container.querySelector("#collections-container");

  // Récupérer les paramètres de l'URL
  const params = new URLSearchParams(window.location.search);
  const collectionParam = [...params.keys()].find(key => key !== "page");

  fetch("wikidata.json")
    .then(r => r.json())
    .then(data => {
      if (!collectionParam) {
        // --- Affichage de toutes les collections ---
        const allCollections = new Set();
        for (const key in data) {
          if (data[key].collections) {
            data[key].collections.forEach(c => allCollections.add(c));
          }
        }

        const sortedCollections = Array.from(allCollections).sort((a, b) =>
          a.localeCompare(b, undefined, {sensitivity: 'base'})
        );

        sortedCollections.forEach(col => {
          const card = document.createElement("div");
          card.className = "card";
          card.innerHTML = `<h3><a href="wiki_index.html?page=collections&${col}">${col}</a></h3>
                            <p>Check out all articls linked to "${col}".</p>`;
          collectionsContainer.appendChild(card);
        });
      } else {
        // --- Affichage des articles d'une collection donnée ---
        document.getElementById("page-title").textContent = `Collection:${collectionParam}`;
        const articles = [];

        for (const key in data) {
          const article = data[key];
          if (article.collections && article.collections.includes(collectionParam)) {
            articles.push({ key, ...article });
          }
        }

        if (articles.length === 0) {
          collectionsContainer.innerHTML = `<p>Aucun article trouvé pour cette collection.</p>`;
          return;
        }

        articles.sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base'}));

        articles.forEach(article => {
          const card = document.createElement("div");
          card.className = "card";
          card.innerHTML = `
            <a href="wiki_index.html?page=${article.key}">
              ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ""}
            </a>
            <h4><a href="wiki_index.html?page=${article.key}">${article.title}</a></h4>
            <p>${article.description || ""}</p>
          `;
          collectionsContainer.appendChild(card);
        });
      }
    })
    .catch(err => {
      collectionsContainer.innerHTML = `<p>Error : ${err}</p>`;
    });
}
