document.addEventListener("DOMContentLoaded", () => {
    fetch("experiences.json")
        .then(response => response.json())
        .then(data => loadGallery(data))
        .catch(error => console.error("Erreur lors du chargement des expériences :", error));
});

function loadGallery(experiences) {
    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";

    experiences.forEach(exp => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
            <img src="${exp.image}" alt="${exp.title}">
            <h2>${exp.title}</h2>
            <p>${exp.description}</p>
        `;
        card.addEventListener("click", () => {
            window.location.href = exp.link;
        });

        gallery.appendChild(card);
    });
}
