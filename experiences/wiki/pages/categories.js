export default function(container, bannerHtml) {
  container.innerHTML = `<article>
    <h1 id="page-title">All Categories</h1>
    <div class="page-gallery" id="categories-container"></div>
  </article>` + bannerHtml;

  const categoriesContainer = container.querySelector("#categories-container");

  // Fetch URL parameters to check if a specific category is requested
  const params = new URLSearchParams(window.location.search);
  const categoryParam = [...params.keys()].find(key => key !== "page");

  fetch("wikidata.json")
    .then(r => r.json())
    .then(data => {
      if (!categoryParam) {
        // --- Print all categories ---
        const allCategories = new Set();
        for (const key in data) {
          if (data[key].categories) {
            data[key].categories.forEach(c => allCategories.add(c));
          }
        }

        const sortedCategories = Array.from(allCategories).sort((a, b) =>
          a.localeCompare(b, undefined, {sensitivity: 'base'})
        );

        sortedCategories.forEach(col => {
          const page = document.createElement("div");
          page.className = "page";
          page.innerHTML = `<h3><a href="wiki_index.html?page=categories&${col}">${col}</a></h3>
                            <p>Check out all articls linked to "${col}".</p>`;
          categoriesContainer.appendChild(page);
        });
      } else {
        // --- Print all articles from selected category ---
        document.getElementById("page-title").textContent = `Category:${categoryParam}`;
        const articles = [];

        for (const key in data) {
          const article = data[key];
          if (article.categories && article.categories.includes(categoryParam)) {
            articles.push({ key, ...article });
          }
        }

        if (articles.length === 0) {
          categoriesContainer.innerHTML = `<p>Aucun article trouvé pour cette category.</p>`;
          return;
        }

        articles.sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base'}));

        articles.forEach(article => {
          const page = document.createElement("div");
          page.className = "page";
          page.innerHTML = `
            <a href="wiki_index.html?page=${article.key}">
              ${article.image ? `<img src="${article.image}" alt="${article.title}">` : ""}
            </a>
            <h4><a href="wiki_index.html?page=${article.key}">${article.title}</a></h4>
            <p>${article.description || ""}</p>
          `;
          categoriesContainer.appendChild(page);
        });
      }
    })
    .catch(err => {
      categoriesContainer.innerHTML = `<p>Error : ${err}</p>`;
    });
}
