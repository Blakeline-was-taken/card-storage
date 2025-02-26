document.addEventListener("DOMContentLoaded", () => {
    const templeSelect = document.getElementById("temple");
    const raritySelect = document.getElementById("rarity");
    const startButton = document.getElementById("start");

    const gameScreen = document.getElementById("game-screen");
    const selectionScreen = document.getElementById("selection-screen");
    const rankingScreen = document.getElementById("ranking-screen");

    const cardsContainer = document.getElementById("cards-container");
    const rankingList = document.getElementById("ranking-list");

    // Nouveaux éléments pour afficher les arrays de debug
    const availableCardsDebug = document.getElementById("availableCardsDebug");
    const seenCardsDebug = document.getElementById("seenCardsDebug");
    const ignoredCardsDebug = document.getElementById("ignoredCardsDebug");

    let allCards = [];
    let filteredCards = [];
    let remainingCards = [];
    let seenCards = new Set();
    let ignoredCards = {};
    let currentCards = [];
    let selectedTemple = "";
    let selectedRarity = "";
    let rounds = 1;

    // Charger et traiter le CSV
    fetch("cards.csv")
        .then(response => response.text())
        .then(parseCSV)
        .then(initSelectionScreen)
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
    }


    function initSelectionScreen() {
        const temples = [...new Set(allCards.map(c => c.Temple))].sort();
        const rarities = [...new Set(allCards.map(c => c.Tier))].sort();

        temples.forEach(t => {
            const option = document.createElement("option");
            option.value = t;
            option.textContent = t;
            templeSelect.appendChild(option);
        });

        rarities.forEach(r => {
            const option = document.createElement("option");
            option.value = r;
            option.textContent = r;
            raritySelect.appendChild(option);
        });

        startButton.addEventListener("click", () => {
            selectedTemple = templeSelect.value;
            selectedRarity = raritySelect.value;
            startSelection(selectedTemple, selectedRarity);
        });
    }

    function startSelection(selectedTemple, selectedRarity) {
        filteredCards = allCards
            .filter(c => c.Temple === selectedTemple && c.Tier === selectedRarity)
            .map(c => c["Card Name"]);
        remainingCards = filteredCards;

        seenCards.clear();
        ignoredCards = {};

        // document.body.style.backgroundImage = `url('background_site_images/${selectedTemple}.jpg')`;

        selectionScreen.style.display = "none";
        gameScreen.style.display = "block";

        showNextCards();
    }

    function showNextCards() {
        if (remainingCards.length - seenCards.size < 2) {
            let unchosen = [];
            for (let c of remainingCards){
                if (c in ignoredCards && ignoredCards[c] === rounds){
                    unchosen.push(c);
                }
            }
            rounds++;
            document.getElementById("roundNumber").textContent = `Round : ${rounds}`;
            while (unchosen.length < 3 && unchosen.length > 0){
                let c = unchosen.splice(0, 1);
                ignoredCards[c] = (ignoredCards[c] || 0) + 1;
            }
            if (unchosen.length === 0) {
                showRanking();
                return;
            }
            seenCards.clear();
            remainingCards = unchosen;
        }

        let availableCards = remainingCards.filter(c => !seenCards.has(c));
        currentCards = [];
        while (currentCards.length < 3 && availableCards.length > 0) {
            let index = Math.floor(Math.random() * availableCards.length);
            currentCards.push(availableCards.splice(index, 1)[0]);
        }

        currentCards.forEach(card => seenCards.add(card));
        renderCards(currentCards);

        // Mise à jour des sections de debug
        updateDebugInfo(availableCards, seenCards, ignoredCards);
    }

    function renderCards(cardNames) {
        cardsContainer.innerHTML = "";
        cardNames.forEach(name => {
            let img = document.createElement("img");
            img.src = `cards/${selectedTemple}/${selectedRarity}/${name}.png`; // Assumes images are named after Card Name
            img.classList.add("card");
            img.addEventListener("click", () => selectCard(name));
            cardsContainer.appendChild(img);
        });
    }

    function selectCard(card) {
        currentCards.forEach(c => {
            if (c !== card) {
                ignoredCards[c] = (ignoredCards[c] || 0) + 1;
            }
        });
        showNextCards();
    }

    function showRanking() {
        gameScreen.style.display = "none";
        rankingScreen.style.display = "block";

        filteredCards.forEach(card => {
            if (!(card in ignoredCards)) {
                ignoredCards[card] = 0;
            }
        });
        let sortedCards = Object.entries(ignoredCards)
            .sort((a, b) => b[1] - a[1]); // Trier par ordre décroissant

        const rankingTableBody = document.getElementById("ranking-table-body");
        rankingTableBody.innerHTML = "";

        sortedCards.forEach(([card, count]) => {
            const row = document.createElement("tr");

            const imageCell = document.createElement("td");
            const img = document.createElement("img");
            img.src = `cards/${selectedTemple}/${selectedRarity}/${card}.png`; // Image de la carte
            img.width = 50;
            imageCell.appendChild(img);
            const nameCell = document.createElement("td");
            nameCell.textContent = card;
            const ignoredCountCell = document.createElement("td");
            ignoredCountCell.textContent = count;

            row.appendChild(imageCell);
            row.appendChild(nameCell);
            row.appendChild(ignoredCountCell);
            rankingTableBody.appendChild(row);
        });
    }

    window.restart = function() {
        location.reload();
    }

    // Fonction pour mettre à jour les sections de debug
    function updateDebugInfo(availableCards, seenCards, ignoredCards) {
        availableCardsDebug.textContent = `Available Cards: ${availableCards.join(", ")}`;
        seenCardsDebug.textContent = `Seen Cards: ${Array.from(seenCards).join(", ")}`;
        ignoredCardsDebug.textContent = `Ignored Cards: ${JSON.stringify(ignoredCards, null, 2)}`;
    }
});
