let boxes = [];
let allCards = [];
let remainingCards = 0;
let currentCardEventListener = null

fetch("../../cards.csv")
    .then(response => response.text())
    .then(parseCSV)
    .then(displayRandomCard)
    .catch(error => console.error("Erreur lors du chargement du CSV :", error));

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
    remainingCards = allCards.length;
}

function displayRandomCard() {
    const cardContainer = document.getElementById("card-container");
    const remainingCounter = document.getElementById("remaining-counter");

    if (remainingCards > 0) {
        let randomCard;
        let attempts = 0;
        do {
            const randomIndex = Math.floor(Math.random() * allCards.length);
            randomCard = allCards[randomIndex];
            attempts++;
            // Sécurité anti-boucle infinie (si toutes les cartes sont classées, on arrête)
            if (attempts > allCards.length) {
                cardContainer.innerHTML = "<p>Toutes les cartes ont été classées !</p>";
                return;
            }
        } while (boxes.some(box => box.cards.some(c => c["Card Name"] === randomCard["Card Name"])));

        const cardImage = document.getElementById("card-to-sort");
        cardImage.src = "../../cards/" + randomCard.Temple + "/" + randomCard.Tier + "/" + randomCard["Card Name"] + ".png";
        cardImage.alt = randomCard["Card Name"];
        cardImage.classList.add("draggable-card");
        cardImage.draggable = true;

        cardImage.removeEventListener("dragstart", currentCardEventListener);
        currentCardEventListener = (e) => {
            e.dataTransfer.setData("cardName", randomCard["Card Name"]);
            e.dataTransfer.setData("fromBoxIndex", "Random Card");
        };
        cardImage.addEventListener("dragstart", currentCardEventListener);

        remainingCards--;
        remainingCounter.textContent = "Remaining cards : " + remainingCards;
    } else {
        cardContainer.innerHTML = "<p>Toutes les cartes ont été classées !</p>";
    }
}


function displayBoxes() {
    const boxList = document.getElementById("box-list");
    boxList.innerHTML = '';

    boxes.forEach((box, index) => {
        const boxElement = document.createElement("div");
        boxElement.classList.add("box");

        const icon = document.createElement("img");
        icon.src = "../../site_images/box-icon.png"; // Chemin de l'icône
        icon.alt = "Box icon";
        icon.classList.add("box-icon");
        boxElement.appendChild(icon);

        const boxName = document.createElement("span");
        boxName.textContent = box.name;
        boxElement.appendChild(boxName);

        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("box-buttons");

        const colorPickerButton = document.createElement("div");
        colorPickerButton.classList.add("color-picker-button");
        colorPickerButton.style.backgroundColor = boxElement.style.backgroundColor;

        colorPickerButton.onclick = () => {
            const colorPickerContainer = boxElement.querySelector(".color-picker-container");
            colorPickerContainer.style.display = colorPickerContainer.style.display === "none" ? "flex" : "none";
        };

        buttonContainer.appendChild(colorPickerButton);

        const colorPickerContainer = document.createElement("div");
        colorPickerContainer.classList.add("color-picker-container");
        boxElement.appendChild(colorPickerContainer);

        const colorOptions = [
            "#E8E8E8", // Blanc
            "#C0C0C0", // Gris
            "#FF7F7F", // Rouge
            "#FFB67E", // Orange
            "#FFEB7F", // Jaune
            "#7CFC7C", // Vert
            "#40E0D0", // Turquoise
            "#7EC8FF", // Bleu
            "#D18CE1", // Violet
            "#FF99CC"  // Rose
        ];
        colorOptions.forEach(color => {
            const colorCircle = document.createElement("div");
            colorCircle.classList.add("color-circle");
            colorCircle.style.backgroundColor = color;

            // Lorsqu'un rond de couleur est cliqué, change la couleur de fond de la boîte
            colorCircle.onclick = () => {
                boxElement.style.backgroundColor = color;
                colorPickerContainer.style.display = "none";  // Cache la palette après sélection
            };

            colorPickerContainer.appendChild(colorCircle);
        });

        const renameButton = document.createElement("button");
        renameButton.textContent = "📝";
        renameButton.onclick = () => renameBox(index);
        buttonContainer.appendChild(renameButton);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "❌";
        deleteButton.onclick = () => deleteBox(index);
        buttonContainer.appendChild(deleteButton);

        boxElement.appendChild(buttonContainer);
        boxElement.addEventListener("dragover", (e) => {
            e.preventDefault();
        });
        boxElement.addEventListener("drop", (e) => {
            e.preventDefault();

            const cardName = e.dataTransfer.getData("cardName");
            const card = allCards.find(card => card["Card Name"] === cardName);

            if (card) {
                const box = boxes[index];
                if (e.dataTransfer.getData("fromBoxIndex") !== "Random Card"){
                    const originBoxIndex = e.dataTransfer.getData("fromBoxIndex");
                    const originBox = boxes[originBoxIndex];
                    originBox.cards.splice(originBox.cards.findIndex(c => c["Card Name"] === cardName), 1);
                    displayBoxCards(originBoxIndex);
                }
                if (!box.cards.includes(card)) {
                    box.cards.push(card);
                    displayBoxes();
                    displayRandomCard();
                    displayBoxCards(index);
                }
            }
        });

        boxElement.addEventListener("click", () => displayBoxCards(index));
        boxList.appendChild(boxElement);
    });

    const addBoxElement = document.createElement("div");
    addBoxElement.classList.add("box", "add-box");
    const addIcon = document.createElement("span");
    addIcon.textContent = "➕";
    addBoxElement.appendChild(addIcon);

    addBoxElement.onclick = () => {
        const boxName = prompt("Enter the name of the new Box");
        if (boxName) {
            boxes.push({ name: boxName, cards: [] });
            displayBoxes();
        }
    };
    boxList.appendChild(addBoxElement);
}

function displayBoxCards(index) {
    const box = boxes[index];
    const boxCardsContainer = document.getElementById("box-cards-container");
    boxCardsContainer.innerHTML = ''; // Vider le conteneur avant de l'afficher

    const boxTitle = document.createElement("h3");
    boxTitle.textContent = `Cards in the ${box.name} Box`;
    boxTitle.style.textAlign = "center";
    boxCardsContainer.appendChild(boxTitle);

    if (box.cards.length > 0) {
        // Grouper les cartes par Temple
        const cardsByTemple = {};
        box.cards.forEach(card => {
            if (!cardsByTemple[card.Temple]) {
                cardsByTemple[card.Temple] = [];
            }
            cardsByTemple[card.Temple].push(card);
        });

        // Trier les temples par ordre d'apparition dans le CSV
        const sortedTemples = Object.keys(cardsByTemple).sort((a, b) => {
            return allCards.findIndex(card => card.Temple === a) -
                allCards.findIndex(card => card.Temple === b);
        });

        sortedTemples.forEach(temple => {
            // Ajouter un titre pour chaque temple
            const templeTitle = document.createElement("h4");
            templeTitle.textContent = temple;
            templeTitle.classList.add("temple-title");
            boxCardsContainer.appendChild(templeTitle);

            // Trier les cartes de ce temple selon l'ordre du CSV
            cardsByTemple[temple].sort((a, b) => {
                return allCards.findIndex(card => card["Card Name"] === a["Card Name"]) -
                    allCards.findIndex(card => card["Card Name"] === b["Card Name"]);
            });

            // Afficher les cartes du temple
            const galleryContainer = document.createElement("div");
            galleryContainer.classList.add("card-gallery");

            cardsByTemple[temple].forEach(card => {
                const cardElement = document.createElement("img");
                cardElement.src = "../../cards/" + card.Temple + "/" + card.Tier + "/" + card["Card Name"] + ".png";
                cardElement.alt = card["Card Name"];
                cardElement.classList.add("card-in-box");
                cardElement.draggable = true;

                cardElement.addEventListener("dragstart", (e) => {
                    e.dataTransfer.setData("cardName", card["Card Name"]);
                    e.dataTransfer.setData("fromBoxIndex", index);
                });

                galleryContainer.appendChild(cardElement);
            });

            boxCardsContainer.appendChild(galleryContainer);
        });

    } else {
        boxCardsContainer.innerHTML += "<p>No card is in that box.</p>";
    }
}

function renameBox(index) {
    const newName = prompt("Rename the box", boxes[index].name);
    if (newName) {
        boxes[index].name = newName;
        displayBoxes();
    }
}

function deleteBox(index) {
    if (confirm("Do you really want to delete this box?")) {
        const boxToDelete = boxes[index];
        remainingCards += boxToDelete.cards.length;
        allCards = allCards.concat(boxToDelete.cards);
        boxes.splice(index, 1);
        displayBoxes();
    }
}

displayBoxes();

// Fonction d'exportation
function exportData() {
    const data = {
        boxes: boxes,
        remainingCards: remainingCards,
        allCards: allCards
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "meta_builder_save.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            boxes = importedData.boxes || [];
            remainingCards = importedData.remainingCards || 0;
            allCards = importedData.allCards || [];

            displayBoxes();
            displayRandomCard();
        } catch (error) {
            alert("There was an error when trying to import the file.");
            console.error("Erreur d'importation :", error);
        }
    };
    reader.readAsText(file);
}

document.getElementById("export-button").addEventListener("click", exportData);
document.getElementById("import-button").addEventListener("click", () => document.getElementById("import-input").click());
document.getElementById("import-input").addEventListener("change", importData);
