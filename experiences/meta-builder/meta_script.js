let cards = [];
let remainingCards = [];

// Fonction pour charger le CSV
function loadCards() {
    fetch("../../cards.csv")
        .then(response => response.text())
        .then(data => {
            const rows = data.split("\n").slice(1); // Ignorer l'en-tête
            rows.forEach(row => {
                const columns = row.split(",");
                if (columns.length >= 4 && columns[3].trim() === "T") { // Vérifie si Draftable = "T"
                    cards.push({
                        name: columns[0].trim(),
                        temple: columns[1].trim(),
                        tier: columns[2].trim(),
                        image: `../../cards/${columns[1].trim()}/${columns[2].trim()}/${columns[0].trim()}.png`
                    });
                }
            });

            if (cards.length > 0) {
                remainingCards = [...cards]; // Copie des cartes filtrées
                displayRandomCard();
            } else {
                document.getElementById("card-display").innerHTML = "<p>No cards available.</p>";
            }
        })
        .catch(error => console.error("Erreur lors du chargement du CSV :", error));
}

// Fonction pour afficher une carte aléatoire
function displayRandomCard() {
    if (remainingCards.length === 0) {
        document.getElementById("card-display").innerHTML = "<p>You have attributed a role to every card !</p>";
        return;
    }

    const randomIndex = Math.floor(Math.random() * remainingCards.length);
    const selectedCard = remainingCards[randomIndex];

    document.getElementById("card-image").src = selectedCard.image;
    document.getElementById("remaining-count").textContent = remainingCards.length;
}

// Charger les cartes au démarrage
loadCards();
