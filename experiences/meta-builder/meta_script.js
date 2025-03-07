let boxes = []; // Tableau pour stocker les boîtes
let allCards = []; // Tableau pour stocker toutes les cartes filtrées
let remainingCards = 0; // Nombre de cartes restantes à classer
let currentCardEventListener = null // Event Listener actuel utilisé sur la carte à classer

// Charger et traiter le CSV
fetch("../../cards.csv")
    .then(response => response.text())
    .then(parseCSV)
    .then(displayRandomCard)
    .catch(error => console.error("Erreur lors du chargement du CSV :", error));

// Fonction pour analyser le CSV
function parseCSV(csvText) {
    const lines = csvText.split("\n").map(line => line.trim()).filter(line => line);
    const headers = lines[0].split(",").map(header => header.trim());
    const rows = lines.slice(1).map(line => {
        let values = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });

    allCards = rows.filter(row => row.Draftable === "T");
    remainingCards = allCards.length; // Initialiser le nombre de cartes restantes
}

// Fonction pour afficher une carte aléatoire et le nombre de cartes restantes
function displayRandomCard() {
    const cardContainer = document.getElementById("card-container");
    const remainingCounter = document.getElementById("remaining-counter");

    if (remainingCards > 0) {
        // Tirer une carte aléatoire
        const randomIndex = Math.floor(Math.random() * allCards.length);
        const randomCard = allCards[randomIndex];

        // Créer l'élément pour afficher la carte
        const cardImage = document.getElementById("card-to-sort");
        cardImage.src = "../../cards/" + randomCard.Temple + "/" + randomCard.Tier + "/" + randomCard["Card Name"] + ".png";
        cardImage.alt = randomCard["Card Name"];
        cardImage.classList.add("draggable-card"); // Ajout d'une classe pour la carte
        cardImage.draggable = true; // Rendre l'image déplaçable

        // Ajouter l'événement dragstart
        cardImage.removeEventListener("dragstart", currentCardEventListener);
        currentCardEventListener = (e) => {
            e.dataTransfer.setData("cardName", randomCard["Card Name"]); // On stocke le nom de la carte
        };
        cardImage.addEventListener("dragstart", currentCardEventListener);

        // Mettre à jour le nombre de cartes restantes
        remainingCards--;
        remainingCounter.textContent = "Cartes restantes : " + remainingCards;
    } else {
        cardContainer.innerHTML = "<p>Toutes les cartes ont été classées !</p>";
    }
}

// Fonction pour afficher les boîtes avec icône et bouton ➕
function displayBoxes() {
    const boxList = document.getElementById("box-list");
    boxList.innerHTML = ''; // Efface le contenu actuel

    // Afficher toutes les boîtes existantes
    boxes.forEach((box, index) => {
        const boxElement = document.createElement("div");
        boxElement.classList.add("box");

        // Icône de la boîte
        const icon = document.createElement("img");
        icon.src = "../../site_images/box-icon.png"; // Chemin de l'icône
        icon.alt = "Icône de boîte";
        icon.classList.add("box-icon");
        boxElement.appendChild(icon);

        // Nom de la boîte
        const boxName = document.createElement("span");
        boxName.textContent = box.name;
        boxElement.appendChild(boxName);

        // Conteneur pour les boutons (renommer et supprimer)
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("box-buttons");

        // Bouton pour renommer la boîte
        const renameButton = document.createElement("button");
        renameButton.textContent = "📝"; // Emoji 📝 pour renommer
        renameButton.onclick = () => renameBox(index);
        buttonContainer.appendChild(renameButton);

        // Bouton pour supprimer la boîte
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "❌"; // Emoji ❌ pour supprimer
        deleteButton.onclick = () => deleteBox(index);
        buttonContainer.appendChild(deleteButton);

        // Ajouter les boutons sous la boîte
        boxElement.appendChild(buttonContainer);

        // Ajouter l'événement dragover pour chaque boîte
        boxElement.addEventListener("dragover", (e) => {
            e.preventDefault(); // Important pour permettre le drop
        });

        // Ajouter l'événement drop pour chaque boîte
        boxElement.addEventListener("drop", (e) => {
            e.preventDefault(); // Empêcher le comportement par défaut du drop

            // Récupérer le nom de la carte
            const cardName = e.dataTransfer.getData("cardName");

            // Ajouter la carte à la boîte correspondante
            const box = boxes[index];
            const card = allCards.find(card => card["Card Name"] === cardName);
            if (card && !box.cards.includes(card)) {
                box.cards.push(card); // Ajouter la carte à la boîte
                displayBoxes(); // Mettre à jour l'affichage des boîtes
                displayRandomCard(); // Afficher une nouvelle carte aléatoire
            }
        });

        // Ajouter la boîte à la liste
        boxList.appendChild(boxElement);
    });

    // Ajouter la boîte verte ➕ pour créer une nouvelle boîte à la fin
    const addBoxElement = document.createElement("div");
    addBoxElement.classList.add("box", "add-box");

    const addIcon = document.createElement("span");
    addIcon.textContent = "➕";
    addBoxElement.appendChild(addIcon);

    addBoxElement.onclick = () => {
        const boxName = prompt("Entrez le nom de la nouvelle boîte");
        if (boxName) {
            boxes.push({ name: boxName, cards: [] }); // Ajouter la nouvelle boîte
            displayBoxes(); // Mettre à jour l'affichage des boîtes
        }
    };

    // Ajouter la boîte verte à la fin de la liste
    boxList.appendChild(addBoxElement);
}

// Fonction pour renommer une boîte
function renameBox(index) {
    const newName = prompt("Renommer la boîte", boxes[index].name);
    if (newName) {
        boxes[index].name = newName; // Mettre à jour le nom de la boîte
        displayBoxes(); // Mettre à jour l'affichage
    }
}

// Fonction pour supprimer une boîte
function deleteBox(index) {
    if (confirm("Voulez-vous vraiment supprimer cette boîte ?")) {
        boxes.splice(index, 1); // Supprimer la boîte
        displayBoxes(); // Mettre à jour l'affichage
    }
}

// Initialiser l'affichage des boîtes
displayBoxes();
