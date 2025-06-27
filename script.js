// Classe pour gérer le système de révision avec répétition espacée
class SpacedRepetitionSystem {
    constructor() {
        this.cards = [];
        this.currentCardIndex = 0;
        this.currentSessionCards = []; // Cartes de la vague actuelle
        this.remainingCards = []; // Cartes qui doivent être redemandées
        this.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0 // Nombre total de tentatives (avec répétitions)
        };
        this.loadProgress();
    }

    // Charge les données de progression depuis le localStorage
    loadProgress() {
        const saved = localStorage.getItem('arabicVocabProgress');
        this.progress = saved ? JSON.parse(saved) : {};
    }

    // Sauvegarde la progression
    saveProgress() {
        localStorage.setItem('arabicVocabProgress', JSON.stringify(this.progress));
    }

    // Ajoute une carte au système
    addCard(card) {
        const cardId = this.generateCardId(card);
        if (!this.progress[cardId]) {
            this.progress[cardId] = {
                attempts: 0,
                successes: 0,
                failures: 0,
                lastReview: null,
                difficulty: 1.3,
                interval: 1,
                nextReview: Date.now()
            };
        }
        
        card.id = cardId;
        card.progress = this.progress[cardId];
        this.cards.push(card);
    }

    // Génère un ID unique pour une carte
    generateCardId(card) {
        return `${card.type}_${card.niveau}_${card.thematique}_${card.partie}_${card.arabic}`;
    }

    // Trie les cartes selon l'algorithme de répétition espacée
    sortCards() {
        this.cards.sort((a, b) => {
            const now = Date.now();
            const aReady = a.progress.nextReview <= now;
            const bReady = b.progress.nextReview <= now;
            
            if (aReady && !bReady) return -1;
            if (!aReady && bReady) return 1;
            
            // Priorise les cartes avec plus d'échecs
            const aFailureRate = a.progress.attempts > 0 ? a.progress.failures / a.progress.attempts : 0;
            const bFailureRate = b.progress.attempts > 0 ? b.progress.failures / b.progress.attempts : 0;
            
            if (aFailureRate !== bFailureRate) return bFailureRate - aFailureRate;
            
            // Ensuite par temps de révision
            return a.progress.nextReview - b.progress.nextReview;
        });
    }

    // Met à jour la progression d'une carte
    updateCardProgress(cardId, score) {
        const progress = this.progress[cardId];
        progress.attempts++;
        progress.lastReview = Date.now();

        // Score: 0=incorrect, 1=difficult, 2=correct, 3=easy
        if (score >= 2) {
            progress.successes++;
            
            if (score === 3) { // Facile
                progress.difficulty = Math.max(1.3, progress.difficulty - 0.15);
                progress.interval = Math.ceil(progress.interval * 2.5);
            } else { // Correct
                progress.difficulty = Math.max(1.3, progress.difficulty - 0.1);
                progress.interval = Math.ceil(progress.interval * progress.difficulty);
            }
        } else {
            progress.failures++;
            
            if (score === 0) { // Incorrect
                progress.difficulty = Math.min(2.5, progress.difficulty + 0.2);
                progress.interval = 1;
            } else { // Difficult
                progress.difficulty = Math.min(2.5, progress.difficulty + 0.15);
                progress.interval = Math.max(1, Math.ceil(progress.interval * 0.6));
            }
        }

        // Calcule la prochaine révision (en millisecondes)
        const dayInMs = 24 * 60 * 60 * 1000;
        progress.nextReview = Date.now() + (progress.interval * dayInMs);

        this.saveProgress();
    }

    // Obtient la carte actuelle
    getCurrentCard() {
        return this.getNextSessionCard();
    }

    // Passe à la carte suivante
    nextCard() {
        this.currentCardIndex++;
        return !this.isSessionComplete();
    }

    // Remet à zéro la session
    resetSession() {
        this.currentCardIndex = 0;
        this.currentSessionCards = [];
        this.remainingCards = [];
        this.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };
        // Initialiser la session avec un ordre aléatoire
        this.initializeRandomSession();
    }

    // Mélange aléatoirement un tableau (algorithme Fisher-Yates)
    shuffleArray(array) {
        const shuffled = [...array]; // Créer une copie pour ne pas modifier l'original
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Mélange aléatoirement les cartes
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Initialise une session avec un ordre complètement aléatoire
    initializeRandomSession() {
        // Mélanger complètement les cartes
        this.shuffleCards();
        // Initialiser les cartes restantes à réviser
        this.remainingCards = [...this.cards];
        this.currentSessionCards = [];
    }

    // Ajoute une carte ratée à la fin de la session
    addFailedCardToEnd(card) {
        // Marquer la carte comme à revoir
        card.needsReview = true;
        // L'ajouter à la fin des cartes restantes
        this.remainingCards.push(card);
    }

    // Obtient la prochaine carte de la session
    getNextSessionCard() {
        if (this.currentCardIndex < this.currentSessionCards.length) {
            return this.currentSessionCards[this.currentCardIndex];
        }
        
        // Si on a fini les cartes actuelles, préparer la prochaine vague
        if (this.remainingCards.length > 0) {
            // Prendre toutes les cartes restantes pour cette vague
            this.currentSessionCards = [...this.remainingCards];
            this.remainingCards = [];
            this.currentCardIndex = 0;
            
            // Mélanger cette nouvelle vague
            for (let i = this.currentSessionCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.currentSessionCards[i], this.currentSessionCards[j]] = 
                [this.currentSessionCards[j], this.currentSessionCards[i]];
            }
            
            return this.currentSessionCards[this.currentCardIndex];
        }
        
        return null; // Session terminée
    }

    // Vérifie si la session est terminée
    isSessionComplete() {
        return this.currentCardIndex >= this.currentSessionCards.length && 
               this.remainingCards.length === 0;
    }
}

// Classe principale de l'application
class VocabApp {
    constructor() {
        this.srs = new SpacedRepetitionSystem();
        this.currentType = null;
        this.vocabularyData = {
            mots: [],
            verbes: []
        };
        this.filteredData = [];
        this.selectedFilters = {
            parties: new Set() // Format: "niveau|thematique|partie"
        };
        this.reverseMode = false;

        this.initializeElements();
        this.loadVocabularyData();
        this.setupEventListeners();
    }

    // Initialise les éléments DOM
    initializeElements() {
        this.screens = {
            selection: document.getElementById('selection-screen'),
            revision: document.getElementById('revision-screen'),
            results: document.getElementById('results-screen')
        };

        this.elements = {
            typeButtons: document.querySelectorAll('.type-btn'),
            filters: document.getElementById('filters'),
            hierarchicalSelection: document.getElementById('hierarchical-selection'),
            selectionCount: document.getElementById('selection-count'),
            startBtn: document.getElementById('start-btn'),
            reverseModeToggle: document.getElementById('reverse-mode'),
            flashcard: document.getElementById('flashcard'),
            arabicText: document.getElementById('arabic-text'),
            cardType: document.getElementById('card-type'),
            difficultyIndicator: document.getElementById('difficulty-indicator'),
            translationText: document.getElementById('translation-text'),
            additionalInfo: document.getElementById('additional-info'),
            revealBtn: document.getElementById('reveal-btn'),
            answerButtons: document.getElementById('answer-buttons'),
            progressFill: document.querySelector('.progress-fill'),
            progressText: document.getElementById('progress-text'),
            correctCount: document.getElementById('correct-count'),
            difficultCount: document.getElementById('difficult-count'),
            incorrectCount: document.getElementById('incorrect-count'),
            backBtn: document.getElementById('back-btn'),
            restartBtn: document.getElementById('restart-btn'),
            newSelectionBtn: document.getElementById('new-selection-btn'),
            finalCorrect: document.getElementById('final-correct'),
            finalTotal: document.getElementById('final-total'),
            finalScore: document.getElementById('final-score')
        };
    }

    // Charge les données de vocabulaire depuis les CSV intégrés
    async loadVocabularyData() {
        try {
            // Données des mots intégrées directement
            const motsText = `Niveau 1;;
Thématique 1;;
Partie 1;;
تَحِيَّةٌ;تَحِيَّاتٌ;Salutation
طَالِبٌ;طُلَّابٌ / طَلَبَةٌ;Étudiant
فَرَنْسِيٌّ;فَرَنْسِيُّونَ;Français
لُغَةٌ;لُغَاتٌ;Langue
عَرَبِيَّةٌ;;Arabe
بَعْدَ;;Après
تَفْكِيرٍ;;Réflexion
مِصْرُ;;Égypte
حُلْمٌ;أَحْلَامٌ;Rêve
هُوَ;;Il
دِرَاسَةٌ;دِرَاسَاتٌ;Étude
جَمِيلَةٌ;جَمِيلَاتٌ;Belle
عِنْدَ;;Auprès de
وُصُولٌ;;Arrivée
مَطَارٌ;مَطَارَاتٌ;Aéroport
الْقَاهِرَةُ;;Le Caire
صَدِيقٌ;أَصْدِقَاءُ;Ami
حِوَارٌ;حِوَارَاتٌ;Dialogue
Partie 2;;
سَلَامٌ;;Paix
رَحْمَةٌ;رَحَمَاتٌ;Miséricorde
بَرَكَةٌ;بَرَكَاتٌ;Bénédiction
يَا;;Ô
كَيْفَ;;Comment
خَيْرٌ;;Bien
أَنَا;;Je
أَنْتَ;;Tu
كَذَلِكَ;;De même
مَرْحَبًا;;Bienvenue
حَمْدٌ;;Louange
سَعِيدٌ;سُعَدَاءُ;Heureux
جِدًّا;;Très
رُؤْيَةٌ;رُؤًى;Vision/Vue
شَقَّةٌ;شُقَقٌ;Appartement
الَّتِي;;Que
مَعًا;;Ensemble
Partie 3;;
حَدِيثٌ;أَحَادِيثُ;Hadith
نَبَوِيٌّ;;Prophétique
رَجُلٌ;رِجَالٌ;Homme
إِلَى;;Vers
نَبِيٌّ;أَنْبِيَاءُ;Prophète
ثُمَّ;;Ensuite
عَشْرٌ;;10
آخَرُ;آخَرُونَ;Autre
عِشْرُونَ;;20
ثَلَاثُونَ;;30
Partie 4;;
Partie 5;;
Thématique 2;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 3;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 4;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 5;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Niveau 3;;
Thématique 1;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 2;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 3;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 4;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 5;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Niveau 2;;
Thématique 1;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 2;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 3;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 4;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;
Thématique 5;;
Partie 1;;
Partie 2;;
Partie 3;;
Partie 4;;
Partie 5;;`;

            // Données des verbes intégrées directement
            const verbesText = `Niveau 1;;;;
Thématique 1;;;;
Partie 1;;;;
أَرَادَ;يُرِيدُ;أَرِدْ;إِرَادَةٌ;Vouloir
تَعَلَّمَ;يَتَعَلَّمُ;تَعَلَّمْ;تَعَلُّمًا;Apprendre
قَرَّرَ;يُقَرِّرُ;قَرِّرْ;تَقْرِيرًا;Décider
سَافَرَ;يُسَافِرُ;سَافِرْ;مُسَافَرَةً;Voyager
حَقَّقَ;يُحَقِّقُ;حَقِّقْ;تَحْقِيقًا;Réaliser
اِسْتَقْبَلَ;يَسْتَقْبِلُ;اِسْتَقْبِلْ;اِسْتِقْبَالًا;Accueillir
Partie 2;;;;
رَجَا;يَرْجُو;أَرْجُ;رَجَاءٌ;Espérer
رَأَى;يَرَى;رَ;رُؤْيَةٌ;Voir
سَكَنَ;يَسْكُنُ;اُسْكُنْ;سَكَنًا;Habiter
Partie 3;;;;
جاءَ;يَجِيءُ;جِئْ;جِيئًا;Venir
صَلَّى;يُصَلِّي;صَلِّ;صَلَاة;Prier
سَلَّمَ;يُسَلِّمُ;سَلِّمْ;تَسْلِيمًا;Saluer
رَدَّ;يَرُدُّ;رُدَّ;رَدًّا;Répondre
جَلَسَ;يَجْلِسُ;اِجْلِسْ;جُلُوسًا;S'asseoir
قَالَ;يَقُولُ;قُلْ;قَوْلًا;Dire
Partie 4;;;;
Partie 5;;;;
Thématique 2;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 3;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 4;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 5;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Niveau 3;;;;
Thématique 1;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 2;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 3;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 4;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 5;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Niveau 2;;;;
Thématique 1;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 2;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 3;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 4;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;
Thématique 5;;;;
Partie 1;;;;
Partie 2;;;;
Partie 3;;;;
Partie 4;;;;
Partie 5;;;;`;

            this.vocabularyData.mots = this.parseCSV(motsText, 'mots');
            this.vocabularyData.verbes = this.parseCSV(verbesText, 'verbes');

            console.log('Vocabulaire chargé:', this.vocabularyData);
        } catch (error) {
            console.error('Erreur lors du chargement du vocabulaire:', error);
        }
    }

    // Parse le contenu CSV
    parseCSV(csvText, type) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const data = [];
        let currentNiveau = null;
        let currentThematique = null;
        let currentPartie = null;

        for (const line of lines) {
            const columns = line.split(';');
            
            if (line.includes('Niveau ')) {
                currentNiveau = columns[0].trim();
                continue;
            }
            
            if (line.includes('Thématique ')) {
                currentThematique = columns[0].trim();
                continue;
            }
            
            if (line.includes('Partie ')) {
                currentPartie = columns[0].trim();
                continue;
            }

            // Données de vocabulaire
            if (columns.length >= 3 && columns[0].trim() && currentNiveau && currentThematique && currentPartie) {
                const item = {
                    type: type,
                    niveau: currentNiveau,
                    thematique: currentThematique,
                    partie: currentPartie
                };

                if (type === 'mots') {
                    item.arabic = columns[0].trim();
                    item.plural = columns[1].trim();
                    item.translation = columns[2].trim();
                } else if (type === 'verbes') {
                    item.arabic = columns[0].trim(); // Passé
                    item.present = columns[1].trim();
                    item.imperative = columns[2].trim();
                    item.masdar = columns[3].trim();
                    item.translation = columns[4].trim();
                }

                data.push(item);
            }
        }

        return data;
    }

    // Configure les écouteurs d'événements
    setupEventListeners() {
        // Sélection du type
        this.elements.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectType(btn.dataset.type));
        });

        // Filtres - plus d'événements nécessaires car tout sera dynamique
        
        // Mode inversé
        this.elements.reverseModeToggle.addEventListener('change', () => {
            this.reverseMode = this.elements.reverseModeToggle.checked;
            // Si on est en cours de révision, mettre à jour la carte actuelle
            if (this.screens.revision.classList.contains('active') && this.srs.getCurrentCard()) {
                this.updateCurrentCardDisplay();
            }
        });

        // Boutons de contrôle
        this.elements.startBtn.addEventListener('click', () => this.startRevision());
        this.elements.revealBtn.addEventListener('click', () => this.revealAnswer());
        this.elements.backBtn.addEventListener('click', () => this.showScreen('selection'));
        this.elements.restartBtn.addEventListener('click', () => this.startRevision());
        this.elements.newSelectionBtn.addEventListener('click', () => this.showScreen('selection'));

        // Boutons de réponse
        this.elements.answerButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                this.answerCard(parseInt(e.target.dataset.score));
            }
        });

        // Clic sur la carte pour révéler
        this.elements.flashcard.addEventListener('click', () => {
            if (!this.elements.revealBtn.classList.contains('hidden')) {
                this.revealAnswer();
            }
        });
    }

    // Sélectionne le type de vocabulaire
    selectType(type) {
        this.currentType = type;
        
        // Met à jour les boutons
        this.elements.typeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Affiche les filtres et les remplit
        this.elements.filters.classList.remove('hidden');
        this.populateFilters();
    }

    // Remplit les filtres selon le type sélectionné avec interface hiérarchique
    populateFilters() {
        const data = this.vocabularyData[this.currentType];
        
        // Organiser les données par niveau > thématique > partie
        const hierarchy = {};
        
        data.forEach(item => {
            if (!hierarchy[item.niveau]) {
                hierarchy[item.niveau] = {};
            }
            if (!hierarchy[item.niveau][item.thematique]) {
                hierarchy[item.niveau][item.thematique] = new Set();
            }
            hierarchy[item.niveau][item.thematique].add(item.partie);
        });

        // Créer l'interface hiérarchique
        this.createHierarchicalInterface(hierarchy);

        // Réinitialiser les sélections
        this.selectedFilters.parties.clear();
        this.updateSelectionSummary();
    }

    // Crée l'interface hiérarchique
    createHierarchicalInterface(hierarchy) {
        const container = this.elements.hierarchicalSelection;
        container.innerHTML = '';

        // Bouton pour tout développer/réduire
        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-all-btn';
        expandBtn.textContent = '📂 Tout développer';
        expandBtn.onclick = () => this.toggleAllSections(expandBtn);
        container.appendChild(expandBtn);

        // Créer les sections par niveau
        Object.keys(hierarchy).sort().forEach(niveau => {
            const niveauSection = this.createNiveauSection(niveau, hierarchy[niveau]);
            container.appendChild(niveauSection);
        });
    }

    // Crée une section de niveau
    createNiveauSection(niveau, thematiques) {
        const section = document.createElement('div');
        section.className = 'niveau-section';
        section.dataset.niveau = niveau;

        // En-tête du niveau
        const header = document.createElement('div');
        header.className = 'niveau-header';
        header.onclick = () => this.toggleNiveauSection(section);

        const title = document.createElement('div');
        title.className = 'niveau-title';
        title.innerHTML = `📊 ${niveau}`;

        const arrow = document.createElement('div');
        arrow.className = 'niveau-arrow';
        arrow.textContent = '▶';

        header.appendChild(title);
        header.appendChild(arrow);

        // Contenu du niveau
        const content = document.createElement('div');
        content.className = 'niveau-content';

        // Créer les sections thématiques
        Object.keys(thematiques).sort().forEach(thematique => {
            const thematiqueSection = this.createThematiqueSection(niveau, thematique, thematiques[thematique]);
            content.appendChild(thematiqueSection);
        });

        section.appendChild(header);
        section.appendChild(content);

        return section;
    }

    // Crée une section de thématique
    createThematiqueSection(niveau, thematique, parties) {
        const section = document.createElement('div');
        section.className = 'thematique-section';
        section.dataset.thematique = thematique;

        // En-tête de la thématique
        const header = document.createElement('div');
        header.className = 'thematique-header';
        header.onclick = () => this.toggleThematiqueSection(section);

        const title = document.createElement('div');
        title.className = 'thematique-title';
        title.innerHTML = `🎯 ${thematique}`;

        const arrow = document.createElement('div');
        arrow.className = 'thematique-arrow';
        arrow.textContent = '▶';

        header.appendChild(title);
        header.appendChild(arrow);

        // Contenu de la thématique (cases à cocher des parties)
        const content = document.createElement('div');
        content.className = 'thematique-content';

        const partiesGrid = document.createElement('div');
        partiesGrid.className = 'parties-grid';

        // Créer les cases à cocher pour les parties
        Array.from(parties).sort().forEach(partie => {
            const checkbox = this.createPartieCheckbox(niveau, thematique, partie);
            partiesGrid.appendChild(checkbox);
        });

        content.appendChild(partiesGrid);
        section.appendChild(header);
        section.appendChild(content);

        return section;
    }

    // Crée une case à cocher pour une partie
    createPartieCheckbox(niveau, thematique, partie) {
        const label = document.createElement('label');
        label.className = 'partie-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = `${niveau}|${thematique}|${partie}`;
        checkbox.addEventListener('change', () => this.handlePartieChange(checkbox.value, checkbox.checked));

        const checkmark = document.createElement('span');
        checkmark.className = 'partie-checkmark';

        const text = document.createTextNode(partie);

        label.appendChild(checkbox);
        label.appendChild(checkmark);
        label.appendChild(text);

        return label;
    }

    // Gère le changement d'une case partie
    handlePartieChange(partieKey, checked) {
        if (checked) {
            this.selectedFilters.parties.add(partieKey);
        } else {
            this.selectedFilters.parties.delete(partieKey);
        }
        this.updateSelectionSummary();
    }

    // Bascule l'état d'une section niveau
    toggleNiveauSection(section) {
        section.classList.toggle('expanded');
    }

    // Bascule l'état d'une section thématique
    toggleThematiqueSection(section) {
        section.classList.toggle('expanded');
    }

    // Bascule toutes les sections
    toggleAllSections(button) {
        const allSections = this.elements.hierarchicalSelection.querySelectorAll('.niveau-section, .thematique-section');
        const expandedSections = this.elements.hierarchicalSelection.querySelectorAll('.niveau-section.expanded, .thematique-section.expanded');
        
        if (expandedSections.length === 0) {
            // Tout développer
            allSections.forEach(section => section.classList.add('expanded'));
            button.textContent = '📁 Tout réduire';
        } else {
            // Tout réduire
            allSections.forEach(section => section.classList.remove('expanded'));
            button.textContent = '📂 Tout développer';
        }
    }

    // Met à jour le résumé de sélection
    updateSelectionSummary() {
        const totalSelected = this.selectedFilters.parties.size;
        
        if (totalSelected === 0) {
            this.elements.selectionCount.textContent = 'Aucune sélection';
            this.elements.startBtn.disabled = true;
        } else {
            // Analyser les sélections
            const niveaux = new Set();
            const thematiques = new Set();
            
            this.selectedFilters.parties.forEach(partieKey => {
                const [niveau, thematique] = partieKey.split('|');
                niveaux.add(niveau);
                thematiques.add(thematique);
            });
            
            const parts = [];
            if (niveaux.size > 0) {
                parts.push(`${niveaux.size} niveau(x)`);
            }
            if (thematiques.size > 0) {
                parts.push`${thematiques.size} thématique(s)`;
            }
            parts.push(`${totalSelected} partie(s)`);
            
            this.elements.selectionCount.textContent = `Sélectionné: ${parts.join(', ')}`;
            this.elements.startBtn.disabled = false;
        }
    }

    // Démarre la révision
    startRevision() {
        // Filtrer les données selon les parties sélectionnées
        this.filteredData = this.vocabularyData[this.currentType].filter(item => {
            const partieKey = `${item.niveau}|${item.thematique}|${item.partie}`;
            return this.selectedFilters.parties.has(partieKey);
        });

        if (this.filteredData.length === 0) {
            alert('Aucun vocabulaire trouvé avec ces critères !');
            return;
        }

        // Initialiser le système de révision
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        // Démarrer une session avec ordre aléatoire et répétition des cartes ratées
        this.srs.resetSession();

        this.showScreen('revision');
        this.showNextCard();
    }

    // Affiche la carte suivante
    showNextCard() {
        const card = this.srs.getCurrentCard();
        if (!card) {
            this.showResults();
            return;
        }

        // Masquer la réponse
        document.querySelector('.card-front').style.display = 'block';
        document.querySelector('.card-back').classList.add('hidden');
        this.elements.revealBtn.classList.remove('hidden');
        this.elements.answerButtons.classList.add('hidden');

        this.updateCurrentCardDisplay();

        // Mettre à jour la progression (basée sur les cartes uniques terminées)
        const uniqueCardsTotal = this.filteredData.length;
        const cardsCompleted = this.srs.sessionStats.total;
        const progress = (cardsCompleted / uniqueCardsTotal) * 100;
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.progressText.textContent = `${cardsCompleted} / ${uniqueCardsTotal} cartes maîtrisées`;

        // Afficher aussi le nombre total d'essais
        const totalAttempts = this.srs.sessionStats.totalAttempts;
        if (totalAttempts > uniqueCardsTotal) {
            this.elements.progressText.textContent += ` (${totalAttempts} essais)`;
        }

        // Mettre à jour les statistiques
        this.updateSessionStats();
    }

    // Met à jour l'affichage de la carte actuelle selon le mode
    updateCurrentCardDisplay() {
        const card = this.srs.getCurrentCard();
        if (!card) return;

        // Retirer l'indicateur de mode existant s'il existe
        const existingIndicator = this.elements.flashcard.querySelector('.card-mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Retirer l'indicateur de répétition existant s'il existe
        const existingRepeatIndicator = this.elements.flashcard.querySelector('.card-repeat-indicator');
        if (existingRepeatIndicator) {
            existingRepeatIndicator.remove();
        }

        // Ajouter l'indicateur de mode
        const modeIndicator = document.createElement('div');
        modeIndicator.className = `card-mode-indicator ${this.reverseMode ? 'reverse' : ''}`;
        modeIndicator.textContent = this.reverseMode ? 'FR → AR' : 'AR → FR';
        this.elements.flashcard.appendChild(modeIndicator);

        // Ajouter l'indicateur de répétition si la carte revient
        if (card.needsReview) {
            const repeatIndicator = document.createElement('div');
            repeatIndicator.className = 'card-repeat-indicator';
            repeatIndicator.textContent = '🔄 Répétition';
            this.elements.flashcard.appendChild(repeatIndicator);
        }

        if (this.reverseMode) {
            // Mode inversé : afficher la traduction française
            this.elements.arabicText.textContent = card.translation;
            this.elements.arabicText.classList.add('reverse-mode');
        } else {
            // Mode normal : afficher l'arabe
            this.elements.arabicText.textContent = card.arabic;
            this.elements.arabicText.classList.remove('reverse-mode');
        }

        this.elements.cardType.textContent = `${card.type} - ${card.niveau}`;
        
        // Indicateur de difficulté
        const failureRate = card.progress.attempts > 0 ? 
            Math.round((card.progress.failures / card.progress.attempts) * 100) : 0;
        this.elements.difficultyIndicator.textContent = `Échecs: ${failureRate}%`;
    }

    // Révèle la réponse
    revealAnswer() {
        const card = this.srs.getCurrentCard();
        
        document.querySelector('.card-front').style.display = 'none';
        document.querySelector('.card-back').classList.remove('hidden');

        if (this.reverseMode) {
            // Mode inversé : montrer l'arabe comme réponse
            this.elements.translationText.textContent = card.arabic;
            this.elements.translationText.classList.add('reverse-mode');
        } else {
            // Mode normal : montrer la traduction française
            this.elements.translationText.textContent = card.translation;
            this.elements.translationText.classList.remove('reverse-mode');
        }

        // Informations supplémentaires selon le type
        if (card.type === 'mots') {
            if (this.reverseMode) {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>Singulier:</strong> ${card.arabic}</div>
                    ${card.plural ? `<div><strong>Pluriel:</strong> ${card.plural}</div>` : ''}
                    <div><strong>Traduction:</strong> ${card.translation}</div>
                `;
            } else {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>Singulier:</strong> ${card.arabic}</div>
                    ${card.plural ? `<div><strong>Pluriel:</strong> ${card.plural}</div>` : ''}
                `;
            }
        } else if (card.type === 'verbes') {
            if (this.reverseMode) {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>الماضي :</strong> ${card.arabic}</div>
                    <div><strong>المضارع :</strong> ${card.present}</div>
                    <div><strong>الأمر :</strong> ${card.imperative}</div>
                    <div><strong>المصدر :</strong> ${card.masdar}</div>
                    <div><strong>الترجمة :</strong> ${card.translation}</div>
                `;
            } else {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>الماضي :</strong> ${card.arabic}</div>
                    <div><strong>المضارع :</strong> ${card.present}</div>
                    <div><strong>الأمر :</strong> ${card.imperative}</div>
                    <div><strong>المصدر :</strong> ${card.masdar}</div>
                `;
            }
        }

        this.elements.revealBtn.classList.add('hidden');
        this.elements.answerButtons.classList.remove('hidden');
    }

    // Répond à une carte
    answerCard(score) {
        const card = this.srs.getCurrentCard();
        
        // Mettre à jour la progression
        this.srs.updateCardProgress(card.id, score);

        // Mettre à jour les statistiques de session
        this.srs.sessionStats.totalAttempts++;
        
        if (score === 0) {
            this.srs.sessionStats.incorrect++;
            // Carte incorrecte : la remettre en fin de pile
            this.srs.addFailedCardToEnd(card);
        } else if (score === 1) {
            this.srs.sessionStats.difficult++;
            // Carte difficile : la remettre en fin de pile aussi
            this.srs.addFailedCardToEnd(card);
        } else {
            this.srs.sessionStats.correct++;
            // Carte réussie : ne pas la remettre
        }

        // Ne compter chaque carte unique qu'une fois dans le total
        if (!card.countedInTotal) {
            this.srs.sessionStats.total++;
            card.countedInTotal = true;
        }

        // Passer à la carte suivante
        if (this.srs.nextCard()) {
            setTimeout(() => this.showNextCard(), 300);
        } else {
            this.showResults();
        }
    }

    // Met à jour les statistiques de session
    updateSessionStats() {
        this.elements.correctCount.textContent = this.srs.sessionStats.correct;
        this.elements.difficultCount.textContent = this.srs.sessionStats.difficult;
        this.elements.incorrectCount.textContent = this.srs.sessionStats.incorrect;
    }

    // Affiche les résultats
    showResults() {
        const stats = this.srs.sessionStats;
        const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

        this.elements.finalCorrect.textContent = stats.correct;
        this.elements.finalTotal.textContent = stats.total;
        this.elements.finalScore.textContent = `${score}%`;

        this.showScreen('results');
    }

    // Affiche un écran spécifique
    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new VocabApp();
});
