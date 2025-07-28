// Classe pour convertir les chiffres occidentaux en chiffres arabes
class ArabicNumbers {
    constructor() {
        // Mapping des chiffres occidentaux vers les chiffres arabes
        this.arabicDigits = {
            '0': '٠',
            '1': '١',
            '2': '٢',
            '3': '٣',
            '4': '٤',
            '5': '٥',
            '6': '٦',
            '7': '٧',
            '8': '٨',
            '9': '٩'
        };
    }

    // Convertit un nombre occidental en chiffres arabes
    toArabic(number) {
        return number.toString().split('').map(digit => this.arabicDigits[digit] || digit).join('');
    }

    // Génère un nombre aléatoire selon la difficulté
    generateRandomNumber(difficulty) {
        let min, max;
        
        switch (difficulty) {
            case '1':
                min = 1;
                max = 9;
                break;
            case '2':
                min = 10;
                max = 99;
                break;
            case '3':
                min = 100;
                max = 999;
                break;
            case 'mixed':
                min = 1;
                max = 999;
                break;
            default:
                min = 10;
                max = 99;
        }
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Génère un ensemble de nombres pour l'entraînement
    generateNumberSet(difficulty, count) {
        const numbers = [];
        const usedNumbers = new Set();
        
        while (numbers.length < count) {
            const number = this.generateRandomNumber(difficulty);
            if (!usedNumbers.has(number)) {
                usedNumbers.add(number);
                numbers.push({
                    western: number,
                    arabic: this.toArabic(number)
                });
            }
        }
        
        return numbers;
    }
}

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
        
        // Réinitialiser toutes les propriétés des cartes de la session
        this.cards.forEach(card => {
            delete card.needsReview;
            delete card.countedInTotal;
        });
        
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

    // Obtient les cartes avec le plus haut taux d'échec pour la révision intensive
    getDifficultCards(cards, maxCards = 20) {
        // Filtre les cartes qui sont considérées comme difficiles (même critère que les statistiques)
        const difficultCards = cards.filter(card => {
            // Les cartes reçues ont déjà leurs données de progression attachées
            const progress = card.progress;
            if (!progress || progress.attempts === 0) return false;
            
            const failureRate = progress.failures / progress.attempts;
            return failureRate > 0.5; // Plus de 50% d'échec
        });

        // Trie par taux d'échec décroissant
        difficultCards.sort((a, b) => {
            const aProgress = a.progress;
            const bProgress = b.progress;
            
            const aFailureRate = aProgress.attempts > 0 ? aProgress.failures / aProgress.attempts : 0;
            const bFailureRate = bProgress.attempts > 0 ? bProgress.failures / bProgress.attempts : 0;
            
            // Si même taux d'échec, priorise les cartes avec plus d'échecs absolus
            if (Math.abs(aFailureRate - bFailureRate) < 0.01) {
                return bProgress.failures - aProgress.failures;
            }
            
            return bFailureRate - aFailureRate;
        });

        // Retourne au maximum maxCards cartes
        return difficultCards.slice(0, maxCards);
    }

    // Initialise une session de révision intensive avec les cartes difficiles
    initializeDifficultCardsSession(allCards) {
        const difficultCards = this.getDifficultCards(allCards);
        
        if (difficultCards.length === 0) {
            // Aucune carte difficile trouvée selon le critère strict (>50% échec)
            // Ne pas faire de fallback, retourner 0 pour indiquer qu'il n'y a pas de cartes difficiles
            this.remainingCards = [];
            this.currentSessionCards = [];
            this.currentCardIndex = 0;
            return 0;
        } else {
            this.remainingCards = [...difficultCards];
        }
        
        this.currentSessionCards = [];
        this.currentCardIndex = 0;
        
        // Mélanger les cartes difficiles
        this.shuffleArray(this.remainingCards);
        
        return this.remainingCards.length;
    }

    // Obtient les cartes non révisées depuis plus de 3 jours
    getOldCards(cards, maxCards = 50) {
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 jours en millisecondes
        
        // Filtre les cartes qui n'ont pas été révisées depuis plus de 3 jours
        const oldCards = cards.filter(card => {
            const progress = card.progress;
            if (!progress || progress.attempts === 0) return false;
            
            // Carte considérée comme "ancienne" si dernière révision > 3 jours
            return progress.lastReview && progress.lastReview < threeDaysAgo;
        });

        // Trie par ancienneté décroissante (les plus anciennes en premier)
        oldCards.sort((a, b) => {
            const aLastReview = a.progress.lastReview || 0;
            const bLastReview = b.progress.lastReview || 0;
            
            // Si même ancienneté, priorise par nombre de tentatives (pour réviser les mots connus)
            if (Math.abs(aLastReview - bLastReview) < (24 * 60 * 60 * 1000)) { // Même jour
                return b.progress.attempts - a.progress.attempts;
            }
            
            return aLastReview - bLastReview; // Plus ancien en premier
        });

        // Retourne au maximum maxCards cartes
        return oldCards.slice(0, maxCards);
    }

    // Initialise une session de révision des mots anciens
    initializeOldCardsSession(allCards) {
        const oldCards = this.getOldCards(allCards);
        
        if (oldCards.length === 0) {
            // Aucune carte ancienne trouvée
            this.remainingCards = [];
            this.currentSessionCards = [];
            this.currentCardIndex = 0;
            return 0;
        } else {
            this.remainingCards = [...oldCards];
        }
        
        this.currentSessionCards = [];
        this.currentCardIndex = 0;
        
        // Mélanger les cartes anciennes
        this.shuffleArray(this.remainingCards);
        
        return this.remainingCards.length;
    }

    // ==========================================
    // Méthodes pour les chiffres arabes
    // ==========================================

    // Convertit un nombre en chiffres arabes
    convertToArabicNumerals(number) {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return number.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    }

    // Génère un nombre aléatoire selon la difficulté
    generateRandomNumber(difficulty) {
        let min, max;
        switch(difficulty) {
            case '1': min = 1; max = 9; break;
            case '2': min = 10; max = 99; break;
            case '3': min = 100; max = 999; break;
            case '4': min = 1000; max = 9999; break;
            default: min = 10; max = 99;
        }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Génère les cartes de chiffres selon la configuration
    generateNumberCards(difficulty, count) {
        const cards = [];
        const usedNumbers = new Set();

        for (let i = 0; i < count; i++) {
            let number;
            do {
                number = this.generateRandomNumber(difficulty);
            } while (usedNumbers.has(number));
            
            usedNumbers.add(number);

            cards.push({
                type: 'numbers',
                niveau: `Difficulté ${difficulty}`,
                thematique: 'Chiffres arabes',
                partie: 'Lecture',
                number: number,
                arabic: this.convertToArabicNumerals(number),
                translation: number.toString(),
                id: `numbers_${difficulty}_${number}`
            });
        }

        return cards;
    }
}

// Classe principale de l'application
class VocabApp {
    constructor() {
        this.srs = new SpacedRepetitionSystem();
        this.arabicNumbers = new ArabicNumbers();
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
        this.isIntensiveReview = false; // Initialiser le mode révision intensive
        this.isOldWordsReview = false; // Initialiser le mode révision des mots anciens
        this.isNumbersReview = false; // Initialiser le mode révision des chiffres
        this.isOldWordsMainSession = false; // Distinguer session principale vs répétition
        this.customSelectedWords = new Set(); // Mots sélectionnés pour la révision personnalisée
        this.autoAudioMode = false; // Mode audio automatique
        this.numbersData = []; // Données des chiffres pour l'entraînement
        
        // Listes pour la gestion des mots anciens
        this.oldWordsList1 = []; // Tous les mots anciens disponibles
        this.oldWordsList2 = []; // 7 mots sélectionnés pour la session courante
        this.oldWordsList3 = []; // Mots ratés à répéter

        this.initializeElements();
        this.loadVocabularyData();
        this.setupEventListeners();
        this.updateStatsDisplay(); // Charger les statistiques au démarrage
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
            reviewDifficultBtn: document.getElementById('review-difficult-btn'),
            finalCorrect: document.getElementById('final-correct'),
            finalTotal: document.getElementById('final-total'),
            finalScore: document.getElementById('final-score'),
            // Éléments des statistiques
            toggleStatsBtn: document.getElementById('toggle-stats-btn'),
            statsContent: document.getElementById('stats-content'),
            resetStatsBtn: document.getElementById('reset-stats-btn'),
            totalAttempts: document.getElementById('total-attempts'),
            totalSuccesses: document.getElementById('total-successes'),
            totalFailures: document.getElementById('total-failures'),
            successRate: document.getElementById('success-rate'),
            difficultCards: document.getElementById('difficult-cards'),
            masteredCards: document.getElementById('mastered-cards'),
            // Éléments de la sélection personnalisée
            customSelection: document.getElementById('custom-selection'),
            customTypeSelect: document.getElementById('custom-type-select'),
            customThemeContainer: document.getElementById('custom-theme-container'),
            customThemeSelect: document.getElementById('custom-theme-select'),
            customWordsContainer: document.getElementById('custom-words-container'),
            customWordsGrid: document.getElementById('custom-words-grid'),
            customSelectionCount: document.getElementById('custom-selection-count'),
            startCustomBtn: document.getElementById('start-custom-btn'),
            // Éléments audio
            arabicAudioBtn: document.getElementById('arabic-audio-btn'),
            autoAudioToggle: document.getElementById('auto-audio-mode'),
            // Éléments des chiffres
            numbersSelection: document.getElementById('numbers-selection'),
            numbersDifficulty: document.getElementById('numbers-difficulty'),
            numbersCount: document.getElementById('numbers-count'),
            numbersPreview: document.getElementById('numbers-preview'),
            numbersSelectionCount: document.getElementById('numbers-selection-count'),
            startNumbersBtn: document.getElementById('start-numbers-btn')
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
تَفْكِيرٌ;;Réflexion
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
أَنْتَ;;Tu/Toi (Masculin)
كَذَلِكَ;;Aussi/Également
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
ثُمَّ;;Puis/Ensuite
عَشْرٌ;;10
آخَرُ;آخَرُونَ;Autre
عِشْرُونَ;;20
ثَلَاثُونَ;;30
Partie 4;;
كَيْفَ أَنْتَ؟;;Comment vas tu
أَرْجُو أَنَّكَ بِخَيْرٍ;;J'espère que tu vas bien
أَنَا بِخَيْرٍ وَالْحَمْدُ لِلهِ;;Je vais bien et Al Hamdoulillah
وَأَنْتَ؟;;Et toi
أَنَا كَذَلِكَ;;Moi aussi
مَرْحَبًا بِكَ;;Bienvenue à toi
شُكْرًا جَزِيلًا;;Merci beaucoup
أَنَا سَعِيدٌ جِدًّا لِرُؤْيَتِكَ;;Je suis très heureux de te voir
هَيَّا بِنَا;;Allons y
حَسَنًا;;D'accord
أَهْلًا وَسَهْلًا;;Bienvenue
صَبَاحُ الْخَيْرِ;;Bonjour
مَسَاءُ الْخَيْرِ;;Bonsoir
لَيْلَةٌ سَعِيدَةٌ;;Bonne nuit
تَصْبَحُ عَلَى خَيْرٍ;;Bonne nuit
إِلَى اللِّقَاءِ;;À la prochaine
أَرَاكَ غَدًا;;Je te vois demain
أَرَاكَ لَاحِقًا;;Je te vois plus tard
أَرَاكَ قَرِيبًا;;Je te vois bientôt
نَلْتَقِي فِيمَا بَعْدُ;;On se voit plus tard
مَعَ السَّلَامَةِ;;Au revoir
فِي أَمَانِ اللَّهِ;;Sous la protection d'Allah
وَدَاعًا;;À dieu
Partie 5;;
Thématique 2;;
Partie 1;;
تَعَارُفٌ;;Le fait de faire Connaissance
مَعَ;;Avec
حَافِلَةٌ;حَافِلَاتٌ;Bus
ذَهَابٌ;;Le fait d'aller
لَمَّا;;Lorsque
بَيْتٌ;بُيُوتٌ;Maison
جَدِيدٌ;جُدُدٌ;Nouveau
صَاحِبٌ;أَصْحَابٌ;Compagnon / Propriétaire / Celui qui a
سَكَنٌ;أَسْكَانٌ;Logement
شَايٌ;;Thé
كَعْكَةٌ;كَعْكٌ;Gateau
لِقَاءٌ;لِقَاءَاتٌ;Rencontre
حَيَاةٌ;حَيَوَاتٌ;Vie
أَهَمِّيَّةٌ;;Importance
Partie 2;;
هذا;;Ceci/Voici (Masculin)
مِفْتَاحٌ;مَفَاتِيحُ;Clé
فَرَنْسَا;;France
اِسْمٌ;أَسْمَاءُ;Nom
أَمْرِيكَا;;Amérique
بَلْجِيكَا;;Beglique
حَالٌ;أَحْوَالٌ;État
مَسْرُورٌ;مَسْرُورُونَ;Heureux
جِنْسِيَّةٌ;جِنْسِيَّاتٌ;Nationalité
جَزَائِرِيٌّ;جَزَائِرِيُّونَ;Algérien
هُنَا;;Ici
Partie 3;;
إِنْسَانٌ;نَاسٌ;Gens
ذَكَرٌ;ذُكُورٌ;Mâle / Homme
أُنْثَى;إِنَاثٌ;Femelle / Femme
شَعْبٌ;شُعُوبٌ;Peuple
قَبِيلَةٌ;قَبَائِلُ;Tribu
أَكْرَمُ;;Plus noble / Généreux
أَتْقَى;;Plus pieux
Partie 4;;
تَعَالَ يَا صَدِيقِي;;Viens Ô mon ami
مَا اسْمُكَ؟;;Quel est ton nom
اسْمِي أَنَس.;;Mon nom est Anas.
أَنَا بِلَال.;;Je suis Bilal.
أَنَا مَسْرُورٌ بِلِقَائِكَ.;;Je suis ravi de te rencontrer.
مَا جِنْسِيَّتُكَ؟;;Quelle est ta nationalité
أَنَا فَرَنْسِيٌّ.;;Je suis français.
أَنَا مِنْ فَرَنْسَا.;;Je viens de france.
أَبْشِرْ يَا أَنَس.;;Réjouis toi Ô Anas.
شَيْئًا فَشَيْئًا.;;Petit à petit.
أَيْنَ تَسْكُنُ؟ أَسْكُنُ فِي...;;Où habites tu ? J'habite...
أَيْنَ تَدْرُسُ؟ أَدْرُسُ فِي...;;Où étudies tu ? J'étudie...
أَيْنَ تَعْمَلُ؟ أَعْمَلُ فِي...;;Où travailles tu ? Je travaille...
مَا لُغَتُكَ؟ لُغَتِي الْفَرَنْسِيَّةُ;;Quelle est ta langue ? Ma langue est le français
هَلْ تَتَحَدَّثُ لُغَاتٍ أُخْرَى؟;;Est-ce que tu parles d'autres langues
هَلْ لَدَيْكَ إِخْوَةٌ وَأَخَوَاتٌ؟;;As tu des frères et soeurs ?
هَلْ سَافَرْتَ إِلَى الْخَارِجِ قَبْلَ ذَلِكَ؟;;As tu voyagé à l'étranger auparavant ?
هَلْ تَعِيشُ هُنَا مُنْذُ وَقْتٍ طَوِيلٍ؟;;Vis tu ici depuis longtemps
مَا هِيَ هِوَايَاتُكَ؟;;Quelles sont tes passions
هَلْ تُحِبُّ الرِّيَاضَةَ؟;;Aimes tu le sport ?
كَمْ سِنُّكَ؟ ثَلَاثُونَ سَنَةً. ;;Quelle âge as tu ? 30 ans ?
Partie 5;;
أَنَا;;Je
نَحْنُ;;Nous
أَنْتَ;;Tu (masculin)
أَنْتِ;;Tu (féminin)
أَنْتُمَا;;Vous (deux)
أَنْتُمْ;;Vous (pluriel masculin)
أَنْتُنَّ;;Vous (pluriel féminin)
هُوَ;;Il
هِيَ;;Elle
هُمَا;;Eux deux
هُمْ;;Ils
هُنَّ;;Elles
Thématique 3;;
Partie 1;;
كُلٌّ;;Tout
صَالَةٌ;صَالَاتٌ;Salon / Salle / Hall
بَيْنَ;;Entre
مَحَبَّةٌ;;Amour
عَلَاقَةٌ;عَلَاقَاتٌ;Relation
طَيِّبَةٌ;طَيِّبَةٌ;Bonne
تَفْصِيلٌ;تَفَاصِيلٌ;Détail
يَوْمِيَّةٌ;يَوْمِيَّةٌ;Quotidienne
فَرْقٌ;فُرُوقٌ;Différence
عَادَةٌ;عَادَاتٌ;Habitude
كَيْفِيَّةٌ;كَيْفِيَّاتٌ;Manière
تَعَلُّمٌ;;Apprentissage
سَنَةٌ;سَنَوَاتٌ;Année
دِرَاسِيَّةٌ;;Scolaire
وَاحِدَةٌ;;Une
Partie 2;;
الآن;الآن;Maintenant
أَخٌ;إِخْوَة/إِخْوَان;Frère (Religion/Sang)
;عِنْدِي;J'ai
أَسْئِلَة;سُؤَال;Question
à completer;;à compléter
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
رَجَا;يَرْجُو;أُرْجُ;رَجَاءٌ;Espérer
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
خَرَجَ;يَخْرُجُ;اُخْرُجْ;خُرُوجًا;Sortir
رَكِبَ;يَرْكَبُ;اِرْكَبْ;رُكُوبًا;Monter
دَخَلَ;يَدْخُلُ;اُدْخُلْ;دُخُولًا;Rentrer
تَعَرَّفَ;يَتَعَرَّفُ;تَعَرَّفْ;تَعَرُّفًا;Faire connaissance
رَحَّبَ;يُرَحِّبُ;رَحِّبْ;تَرْحِيبًا;accueillir (chaleureusement)
شَرِبَ;يَشْرَبُ;اِشْرَبْ;شُرْبًا;Boire
أَكَلَ;يَأْكُلُ;كُلْ;أَكْلًا;Manger
تَكَلَّمَ;يَتَكَلَّمُ;تَكَلَّمْ;تَكَلُّمًا;Parler
Partie 2;;;;
تَعَالَ (uniquement à l'impératif);Ø;تَعَالَ;Ø;Viens
دَرَسَ;يَدْرُسُ;ادْرُسْ;دِرَاسَةٌ;Étudier
أَكْمَلَ;يُكْمِلُ;أَكْمِلْ;إِكْمَالًا;Compléter/Terminer
أَبْشَرَ;يُبْشِرُ;أَبْشِرْ;إِبْشَارًا;Se réjouir
شَاءَ;يَشَاءُ;شَأْ;شَيْئًا;Vouloir
Partie 3;;;;
خَلَقَ;يَخْلُقُ;اخْلُقْ;خَلْقًا;Créer
جَعَلَ;يَجْعَلُ;اجْعَلْ;جَعْلاً;Rendre
Partie 4;;;;
Partie 5;;;;
Thématique 3;;;;
Partie 1;;;;
ذَهَبَ;يَذْهَبُ;اذْهَبْ;ذَهَابًا;Aller
ظَهَرَ;يَظْهَرُ;اِظْهَرْ;ظُهُورًا;Apparaître
اِطْمَأَنَّ;يَطْمَئِنُّ;اِطْمَئِنَّ;اِطْمِئْنَانًا;Être rassuré
تَعَوَّدَ;يَتَعَوَّدُ;تَعَوَّدْ;تَعَوُّدًا;Être habitué
تَعَجَّبَ;يَتَعَجَّبُ;تَعَجَّبْ;تَعَجُّبًا;Être surpris
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

        // Mode audio automatique
        this.elements.autoAudioToggle.addEventListener('change', () => {
            this.autoAudioMode = this.elements.autoAudioToggle.checked;
        });

        // Boutons de contrôle
        this.elements.startBtn.addEventListener('click', () => this.startRevision());
        this.elements.revealBtn.addEventListener('click', () => this.revealAnswer());
        this.elements.backBtn.addEventListener('click', () => this.showScreen('selection'));
        this.elements.restartBtn.addEventListener('click', () => this.restartCurrentSession());
        this.elements.newSelectionBtn.addEventListener('click', () => this.showScreen('selection'));
        this.elements.reviewDifficultBtn.addEventListener('click', () => this.startDifficultCardsReviewFromResults());

        // Statistiques
        this.elements.toggleStatsBtn.addEventListener('click', () => this.toggleStats());
        this.elements.resetStatsBtn.addEventListener('click', () => this.resetStats());

        // Sélection personnalisée
        this.elements.customTypeSelect.addEventListener('change', () => this.handleCustomTypeChange());
        this.elements.customThemeSelect.addEventListener('change', () => this.handleCustomThemeChange());
        this.elements.startCustomBtn.addEventListener('click', () => this.startCustomRevision());

        // Boutons audio
        this.elements.arabicAudioBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêcher la propagation vers la carte
            this.playArabicAudio();
        });

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

        // Événements pour l'entraînement aux chiffres
        this.elements.numbersDifficulty.addEventListener('change', () => this.updateNumbersPreview());
        this.elements.numbersCount.addEventListener('change', () => this.updateNumbersPreview());
        this.elements.startNumbersBtn.addEventListener('click', () => this.startNumbersReview());
    }

    // Sélectionne le type de vocabulaire
    selectType(type) {
        this.currentType = type;
        
        // Réinitialiser les modes de révision
        this.isIntensiveReview = false;
        this.isOldWordsReview = false;
        this.isNumbersReview = false;
        
        // Met à jour les boutons
        this.elements.typeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Masquer tous les types de sélection
        this.elements.filters.classList.add('hidden');
        this.elements.customSelection.classList.add('hidden');
        this.elements.numbersSelection.classList.add('hidden');

        // Si c'est le mode révision intensive
        if (type === 'revision') {
            this.startDifficultCardsReview();
            return;
        }

        // Si c'est le mode révision des mots anciens
        if (type === 'old-words') {
            this.startOldWordsReview();
            return;
        }

        // Si c'est le mode révision personnalisée
        if (type === 'custom') {
            this.elements.customSelection.classList.remove('hidden');
            this.initializeCustomSelection();
            return;
        }

        // Si c'est le mode révision des chiffres
        if (type === 'numbers') {
            this.elements.numbersSelection.classList.remove('hidden');
            this.updateNumbersPreview();
            return;
        }

        // Mode normal : affiche les filtres et les remplit
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
        // Réinitialiser le mode révision intensive
        this.isIntensiveReview = false;
        
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
        
        // Texte différent selon le mode
        if (this.isIntensiveReview) {
            this.elements.progressText.textContent = `${cardsCompleted} / ${uniqueCardsTotal} cartes difficiles maîtrisées`;
        } else if (this.isOldWordsReview) {
            this.elements.progressText.textContent = `${cardsCompleted} / ${uniqueCardsTotal} mots anciens révisés`;
        } else if (this.isNumbersReview) {
            this.elements.progressText.textContent = `${cardsCompleted} / ${uniqueCardsTotal} chiffres maîtrisés`;
        } else {
            this.elements.progressText.textContent = `${cardsCompleted} / ${uniqueCardsTotal} cartes maîtrisées`;
        }

        // Afficher aussi le nombre total d'essais
        const totalAttempts = this.srs.sessionStats.totalAttempts;
        if (totalAttempts > uniqueCardsTotal) {
            this.elements.progressText.textContent += ` (${totalAttempts} essais)`;
        }

        // Mettre à jour les statistiques
        this.updateSessionStats();

        // Jouer l'audio automatiquement si le mode est activé
        if (this.autoAudioMode) {
            // Ajouter un petit délai pour que l'affichage soit complet
            setTimeout(() => {
                this.playArabicAudio();
            }, 500);
        }
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

        // Retirer l'indicateur de révision intensive existant s'il existe
        const existingIntensiveIndicator = this.elements.flashcard.querySelector('.card-intensive-indicator');
        if (existingIntensiveIndicator) {
            existingIntensiveIndicator.remove();
        }

        // Retirer l'indicateur de révision ancienne existant s'il existe
        const existingOldIndicator = this.elements.flashcard.querySelector('.card-old-indicator');
        if (existingOldIndicator) {
            existingOldIndicator.remove();
        }

        // Ajouter l'indicateur de mode
        const modeIndicator = document.createElement('div');
        modeIndicator.className = `card-mode-indicator ${this.reverseMode ? 'reverse' : ''}`;
        modeIndicator.textContent = this.reverseMode ? 'FR → AR' : 'AR → FR';
        this.elements.flashcard.appendChild(modeIndicator);

        // Ajouter l'indicateur de révision intensive si c'est le cas
        if (this.isIntensiveReview) {
            const intensiveIndicator = document.createElement('div');
            intensiveIndicator.className = 'card-intensive-indicator';
            intensiveIndicator.textContent = '🎯 Révision intensive';
            this.elements.flashcard.appendChild(intensiveIndicator);
        }

        // Ajouter l'indicateur de révision des chiffres si c'est le cas
        if (this.isNumbersReview) {
            const numbersIndicator = document.createElement('div');
            numbersIndicator.className = 'card-numbers-indicator';
            numbersIndicator.textContent = '� Entraînement chiffres';
            this.elements.flashcard.appendChild(numbersIndicator);
        }

        // Ajouter l'indicateur de répétition si la carte revient
        if (card.needsReview) {
            const repeatIndicator = document.createElement('div');
            repeatIndicator.className = 'card-repeat-indicator';
            repeatIndicator.textContent = '🔄 Répétition';
            this.elements.flashcard.appendChild(repeatIndicator);
        }

        if (this.reverseMode && !this.isNumbersReview) {
            // Mode inversé : afficher la traduction française (sauf pour les chiffres)
            this.elements.arabicText.textContent = card.translation;
            this.elements.arabicText.classList.add('reverse-mode');
        } else {
            // Mode normal : afficher l'arabe (ou le chiffre arabe)
            this.elements.arabicText.textContent = card.arabic;
            this.elements.arabicText.classList.remove('reverse-mode');
        }

        // Affichage spécial pour les chiffres
        if (this.isNumbersReview) {
            this.elements.arabicText.classList.add('arabic-number-display');
        } else {
            this.elements.arabicText.classList.remove('arabic-number-display');
        }

        this.elements.cardType.textContent = this.isNumbersReview ? 
            `${card.niveau} - ${card.partie}` : 
            `${card.type} - ${card.niveau}`;
        
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

        if (this.reverseMode && !this.isNumbersReview) {
            // Mode inversé : montrer l'arabe comme réponse (sauf pour les chiffres)
            this.elements.translationText.textContent = card.arabic;
            this.elements.translationText.classList.add('reverse-mode');
        } else {
            // Mode normal : montrer la traduction française (ou le chiffre occidental)
            this.elements.translationText.textContent = card.translation;
            this.elements.translationText.classList.remove('reverse-mode');
        }

        // Informations supplémentaires selon le type
        if (card.type === 'numbers') {
            this.elements.additionalInfo.innerHTML = `
                <div class="number-info">
                    <div><strong>Chiffre arabe :</strong> ${card.arabic}</div>
                    <div><strong>Chiffre occidental :</strong> ${card.translation}</div>
                    <div class="number-tip">💡 Astuce : Mémorisez la forme de chaque chiffre arabe</div>
                </div>
            `;
        } else if (card.type === 'mots') {
            if (this.reverseMode) {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>الكلمة :</strong> ${card.arabic}</div>
                    ${card.plural ? `<div><strong>الجمع :</strong> ${card.plural}</div>` : ''}
                    <div><strong>الترجمة :</strong> ${card.translation}</div>
                `;
            } else {
                this.elements.additionalInfo.innerHTML = `
                    <div><strong>الكلمة :</strong> ${card.arabic}</div>
                    ${card.plural ? `<div><strong>الجمع :</strong> ${card.plural}</div>` : ''}
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
            if (!card.needsReview) {
                this.srs.sessionStats.correct++;
            }
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
        
        // Mettre à jour les statistiques globales si on est sur l'écran de sélection et que les stats sont visibles
        if (!this.elements.statsContent.classList.contains('hidden')) {
            this.updateStatsDisplay();
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

        // Gestion spéciale pour la révision des mots anciens
        if (this.isOldWordsReview) {
            if (this.isOldWordsMainSession) {
                // Session principale : gérer la fin de série
                this.handleOldWordsSeriesEnd();
            } else {
                // Répétition : gérer la fin de répétition
                this.handleFailedWordsRepetitionEnd();
            }
        } else {
            this.showScreen('results');
        }
    }

    // Gère la fin d'une série de mots anciens
    handleOldWordsSeriesEnd() {
        // Parcourir les cartes pour identifier les réussies et les ratées
        this.srs.currentSessionCards.forEach(card => {
            const cardId = card.id || this.srs.generateCardId(card);
            const wasCorrect = this.srs.progress[cardId] && this.srs.progress[cardId].wasCorrect;
            
            if (!wasCorrect) {
                // Mot raté : l'ajouter à la liste 3
                this.oldWordsList3.push(card);
            }
            // Les mots réussis sont automatiquement retirés de la liste 1 
            // car ils ont été spliced lors de la préparation de la série
        });

        // Afficher les résultats avec un message spécial
        this.showScreen('results');
        
        // Ajouter un message indiquant la fin de série
        setTimeout(() => {
            if (this.oldWordsList3.length > 0) {
                const message = `Série terminée !\n\n${this.oldWordsList3.length} mot(s) à répéter avant de continuer.\n\nCliquez sur "Répéter les mots ratés" pour commencer la répétition.`;
                // alert(message);
                
                // Ajouter un bouton pour répéter les mots ratés
                this.addRepeatFailedWordsButton();
            } else {
                const message = `Série terminée avec succès !\n\nTous les mots ont été réussis.\n\nCliquez sur "Retour au menu" pour continuer ou réviser une nouvelle série.`;
                // alert(message);
            }
        }, 100);
    }

    // Ajoute un bouton pour répéter les mots ratés
    addRepeatFailedWordsButton() {
        // Vérifier si le bouton existe déjà
        if (document.getElementById('repeat-failed-btn')) {
            return;
        }

        const resultsActions = document.querySelector('.results-actions');
        if (resultsActions) {
            const repeatBtn = document.createElement('button');
            repeatBtn.id = 'repeat-failed-btn';
            repeatBtn.className = 'menu-btn';
            repeatBtn.textContent = `Répéter les mots ratés (${this.oldWordsList3.length})`;
            repeatBtn.onclick = () => this.startFailedWordsRepetition();
            
            // Insérer le bouton avant le bouton "Retour au menu"
            const returnBtn = resultsActions.querySelector('button:last-child');
            resultsActions.insertBefore(repeatBtn, returnBtn);
        }
    }

    // Démarre la répétition des mots ratés (liste 3)
    startFailedWordsRepetition() {
        if (this.oldWordsList3.length === 0) {
            alert('Aucun mot à répéter !');
            return;
        }

        // Préparer le SRS avec la liste 3
        this.srs.cards = [];
        this.srs.remainingCards = [...this.oldWordsList3];
        this.srs.currentSessionCards = [];
        this.srs.currentCardIndex = 0;
        
        this.oldWordsList3.forEach(card => {
            this.srs.addCard({...card});
        });

        // Préparer l'affichage
        this.filteredData = this.oldWordsList3;
        this.totalOldWordsAvailable = this.oldWordsList3.length;
        
        // Réinitialiser les statistiques de session
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        // Marquer que c'est une répétition (pas session principale)
        this.isOldWordsMainSession = false;

        this.showScreen('revision');
        this.showNextCard();
    }

    // Affiche un écran spécifique
    showScreen(screenName) {
        // Nettoyer les boutons temporaires
        this.cleanupTemporaryButtons();
        
        // Réinitialiser les modes de révision quand on revient à la sélection
        if (screenName === 'selection') {
            this.isIntensiveReview = false;
            this.isOldWordsReview = false;
            this.isNumbersReview = false;
            this.isOldWordsMainSession = false;
            // Réinitialiser aussi la sélection personnalisée
            this.customSelectedWords.clear();
            // Nettoyer les listes de mots anciens
            this.oldWordsList1 = [];
            this.oldWordsList2 = [];
            this.oldWordsList3 = [];
            // Mettre à jour les statistiques si elles sont visibles
            if (!this.elements.statsContent.classList.contains('hidden')) {
                this.updateStatsDisplay();
            }
        }
        
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    // Nettoie les boutons temporaires
    cleanupTemporaryButtons() {
        const tempButtons = ['repeat-failed-btn', 'continue-series-btn'];
        tempButtons.forEach(buttonId => {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.remove();
            }
        });
    }

    // Démarre la révision des cartes difficiles
    startDifficultCardsReview() {
        // Obtenir toutes les cartes de tous les types
        const allCards = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        // Créer d'abord les cartes avec leurs IDs pour avoir accès aux données de progression
        const cardsWithIds = [];
        allCards.forEach(card => {
            const cardId = this.srs.generateCardId(card);
            if (this.srs.progress[cardId]) {
                cardsWithIds.push({
                    ...card,
                    id: cardId,
                    progress: this.srs.progress[cardId]
                });
            }
        });

        // Initialiser la session avec les cartes difficiles
        const difficultCardsCount = this.srs.initializeDifficultCardsSession(cardsWithIds);
        
        // Debug: afficher des informations
        console.log('Cartes avec progression:', cardsWithIds.length);
        console.log('Cartes difficiles trouvées:', difficultCardsCount);
        if (cardsWithIds.length > 0) {
            console.log('Exemple de progression:', cardsWithIds[0].progress);
        }
        
        if (difficultCardsCount === 0) {
            alert('Aucune carte difficile trouvée !\n\nSeules les cartes avec plus de 50% d\'échec sont considérées comme difficiles.\nCommencez quelques révisions pour accumuler des données ou révisez des cartes que vous avez déjà ratées.');
            return;
        }

        // Ajouter les cartes difficiles au système SRS
        this.srs.cards = [];
        this.srs.remainingCards.forEach(card => {
            this.srs.addCard({...card});
        });

        // Préparer l'affichage
        this.filteredData = this.srs.remainingCards;
        
        // Réinitialiser les statistiques de session
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        // Marquer que c'est une session de révision intensive
        this.isIntensiveReview = true;

        this.showScreen('revision');
        this.showNextCard();
    }

    // Méthode appelée depuis les résultats pour réviser les cartes difficiles
    startDifficultCardsReviewFromResults() {
        this.startDifficultCardsReview();
    }

    // Initialise le système de gestion des trois listes pour les mots anciens
    initializeOldWordsListSystem() {
        // Obtenir toutes les cartes de tous les types
        const allCards = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        // Créer les cartes avec leurs IDs pour avoir accès aux données de progression
        const cardsWithIds = [];
        allCards.forEach(card => {
            const cardId = this.srs.generateCardId(card);
            if (this.srs.progress[cardId]) {
                cardsWithIds.push({
                    ...card,
                    id: cardId,
                    progress: this.srs.progress[cardId]
                });
            }
        });

        // Liste 1 : tous les mots anciens (filtrés selon les critères)
        this.oldWordsList1 = this.srs.getOldCards(cardsWithIds, 1000); // Pas de limite pour la liste 1
        
        // Liste 2 : 7 mots sélectionnés pour la session (vide au début)
        this.oldWordsList2 = [];
        
        // Liste 3 : mots ratés à répéter (vide au début)
        this.oldWordsList3 = [];
        
        return this.oldWordsList1.length;
    }

    // Démarre la révision des mots anciens
    startOldWordsReview() {
        // Initialiser le système des trois listes
        const totalOldWords = this.initializeOldWordsListSystem();
        
        if (totalOldWords === 0) {
            const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000));
            alert(`Aucun mot ancien trouvé !\n\nSeuls les mots non révisés depuis plus de 3 jours (avant le ${threeDaysAgo.toLocaleDateString('fr-FR')}) sont considérés comme anciens.\n\nContinuez vos révisions pour que certains mots deviennent "anciens" et nécessitent une révision de mémorisation à long terme.`);
            return;
        }

        // Préparer la première série de 7 mots
        this.prepareNextOldWordsSeries();
    }

    // Prépare la prochaine série de 7 mots depuis la liste 1
    prepareNextOldWordsSeries() {
        if (this.oldWordsList1.length === 0) {
            // Plus de mots anciens à réviser
            alert('Tous les mots anciens ont été révisés ! Retour au menu.');
            this.showScreen('selection');
            return;
        }

        // Prendre les 7 premiers mots de la liste 1 (ou moins s'il en reste moins)
        const wordsToTake = Math.min(7, this.oldWordsList1.length);
        this.oldWordsList2 = this.oldWordsList1.splice(0, wordsToTake);
        
        // Mélanger la liste 2
        this.oldWordsList2 = this.srs.shuffleArray(this.oldWordsList2);
        
        // Vider la liste 3 pour cette nouvelle série
        this.oldWordsList3 = [];
        
        // Préparer le SRS avec la liste 2
        this.srs.cards = [];
        this.srs.remainingCards = [...this.oldWordsList2];
        this.srs.currentSessionCards = [];
        this.srs.currentCardIndex = 0;
        
        this.oldWordsList2.forEach(card => {
            this.srs.addCard({...card});
        });

        // Préparer l'affichage
        this.filteredData = this.oldWordsList2;
        this.totalOldWordsAvailable = this.oldWordsList2.length;
        
        // Réinitialiser les statistiques de session
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        // Marquer que c'est une session de révision des mots anciens
        this.isOldWordsReview = true;
        this.isOldWordsMainSession = true; // Session principale (pas répétition)

        this.showScreen('revision');
        this.showNextCard();
    }

    // Méthode appelée depuis les résultats pour réviser les mots anciens
    startOldWordsReviewFromResults() {
        this.startOldWordsReview();
    }

    // Bascule l'affichage des statistiques
    toggleStats() {
        const isHidden = this.elements.statsContent.classList.contains('hidden');
        
        if (isHidden) {
            this.elements.statsContent.classList.remove('hidden');
            this.elements.toggleStatsBtn.textContent = '📊 Masquer';
            this.updateStatsDisplay();
        } else {
            this.elements.statsContent.classList.add('hidden');
            this.elements.toggleStatsBtn.textContent = '📈 Afficher';
        }
    }

    // Met à jour l'affichage des statistiques
    updateStatsDisplay() {
        const progress = this.srs.progress;
        let totalAttempts = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;
        let difficultCards = 0;
        let masteredCards = 0;

        // Parcourir toutes les cartes dans les données de progression
        Object.values(progress).forEach(cardProgress => {
            totalAttempts += cardProgress.attempts;
            totalSuccesses += cardProgress.successes;
            totalFailures += cardProgress.failures;

            // Carte difficile si taux d'échec > 50%
            if (cardProgress.attempts > 0) {
                const failureRate = cardProgress.failures / cardProgress.attempts;
                if (failureRate > 0.5) {
                    difficultCards++;
                }
            }

            // Carte maîtrisée si taux de réussite > 80% et au moins 5 tentatives
            if (cardProgress.attempts >= 5) {
                const successRate = cardProgress.successes / cardProgress.attempts;
                if (successRate > 0.8) {
                    masteredCards++;
                }
            }
        });

        // Calculer le taux de réussite global
        const successRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

        // Mettre à jour l'affichage
        this.elements.totalAttempts.textContent = totalAttempts;
        this.elements.totalSuccesses.textContent = totalSuccesses;
        this.elements.totalFailures.textContent = totalFailures;
        this.elements.successRate.textContent = `${successRate}%`;
        this.elements.difficultCards.textContent = difficultCards;
        this.elements.masteredCards.textContent = masteredCards;
    }

    // Réinitialise les statistiques
    resetStats() {
        const confirmReset = confirm(
            '⚠️ Attention !\n\n' +
            'Cette action va effacer toutes vos statistiques de progression :\n' +
            '• Toutes les tentatives et résultats\n' +
            '• L\'historique des révisions\n' +
            '• Les données de répétition espacée\n\n' +
            'Cette action est irréversible.\n\n' +
            'Êtes-vous sûr de vouloir continuer ?'
        );

        if (confirmReset) {
            // Effacer les données de progression
            this.srs.progress = {};
            this.srs.saveProgress();
            
            // Recharger toutes les cartes pour réinitialiser leurs données de progression
            if (this.vocabularyData.mots.length > 0 || this.vocabularyData.verbes.length > 0) {
                this.srs.cards = [];
                [...this.vocabularyData.mots, ...this.vocabularyData.verbes].forEach(card => {
                    this.srs.addCard({...card});
                });
            }

            // Mettre à jour l'affichage des statistiques
            this.updateStatsDisplay();

            alert('✅ Statistiques réinitialisées avec succès !');
        }
    }

    // ==========================================
    // Méthodes pour l'audio (ResponsiveVoice)
    // ==========================================

    // Joue l'audio du texte arabe uniquement
    playArabicAudio() {
        const card = this.srs.getCurrentCard();
        if (!card) return;

        // Toujours lire le texte arabe, peu importe le mode
        const textToSpeak = card.arabic;
        const voiceName = 'Arabic Male';
        const language = 'ar-SA';

        this.playAudio(textToSpeak, voiceName, language, this.elements.arabicAudioBtn);
    }

    // Méthode utilitaire pour jouer l'audio avec ResponsiveVoice
    playAudio(text, voiceName, language, buttonElement) {
        // Vérifier si ResponsiveVoice est disponible
        if (typeof responsiveVoice === 'undefined') {
            console.warn('ResponsiveVoice n\'est pas chargé. Utilisez votre propre clé API.');
            alert('🔊 Fonctionnalité audio non disponible.\nVeuillez obtenir une clé API ResponsiveVoice et la configurer.');
            return;
        }

        // Arrêter tout audio en cours
        responsiveVoice.cancel();

        // Ajouter l'animation au bouton
        buttonElement.classList.add('playing');

        // Jouer l'audio
        responsiveVoice.speak(text, voiceName, {
            rate: 0.8, // Vitesse de lecture (0.1 à 1.5)
            pitch: 1, // Hauteur de la voix (0 à 2)
            volume: 1, // Volume (0 à 1)
            onstart: () => {
                console.log(`🔊 Lecture audio démarrée: ${text}`);
            },
            onend: () => {
                console.log('🔊 Lecture audio terminée');
                buttonElement.classList.remove('playing');
            },
            onerror: (error) => {
                console.error('Erreur audio:', error);
                buttonElement.classList.remove('playing');
                // Fallback vers d'autres voix disponibles
                this.playAudioFallback(text, language, buttonElement);
            }
        });
    }

    // Méthode de fallback avec des voix alternatives
    playAudioFallback(text, language, buttonElement) {
        let fallbackVoice;
        
        if (language.startsWith('ar')) {
            // Voix arabes alternatives
            fallbackVoice = 'Arabic Female';
        }

        if (fallbackVoice) {
            responsiveVoice.speak(text, fallbackVoice, {
                rate: 0.8,
                pitch: 1,
                volume: 1,
                onend: () => {
                    buttonElement.classList.remove('playing');
                },
                onerror: () => {
                    buttonElement.classList.remove('playing');
                    console.warn('Aucune voix arabe disponible pour ce texte');
                }
            });
        }
    }

    // ==========================================
    // Méthodes pour la révision personnalisée
    // ==========================================

    // Initialise l'interface de sélection personnalisée
    initializeCustomSelection() {
        // Réinitialiser les sélections
        this.customSelectedWords.clear();
        this.elements.customTypeSelect.value = '';
        this.elements.customThemeSelect.value = '';
        this.elements.customThemeContainer.classList.add('hidden');
        this.elements.customWordsContainer.classList.add('hidden');
        this.elements.startCustomBtn.disabled = true;
        this.updateCustomSelectionCount();
    }

    // Gère le changement de type dans la sélection personnalisée
    handleCustomTypeChange() {
        const selectedType = this.elements.customTypeSelect.value;
        
        if (!selectedType) {
            this.elements.customThemeContainer.classList.add('hidden');
            this.elements.customWordsContainer.classList.add('hidden');
            return;
        }

        // Afficher le sélecteur de thématique
        this.elements.customThemeContainer.classList.remove('hidden');
        this.populateCustomThemes(selectedType);
        
        // Masquer les mots et réinitialiser
        this.elements.customWordsContainer.classList.add('hidden');
        this.customSelectedWords.clear();
        this.updateCustomSelectionCount();
    }

    // Remplit les thématiques pour le type sélectionné
    populateCustomThemes(type) {
        const data = this.vocabularyData[type];
        const themes = new Set();
        
        data.forEach(item => {
            const themeKey = `${item.niveau} - ${item.thematique}`;
            themes.add(themeKey);
        });

        // Vider et remplir le sélecteur de thématiques
        this.elements.customThemeSelect.innerHTML = '<option value="">-- Choisir une thématique --</option>';
        
        Array.from(themes).sort().forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme;
            this.elements.customThemeSelect.appendChild(option);
        });
    }

    // Gère le changement de thématique
    handleCustomThemeChange() {
        const selectedType = this.elements.customTypeSelect.value;
        const selectedTheme = this.elements.customThemeSelect.value;
        
        if (!selectedType || !selectedTheme) {
            this.elements.customWordsContainer.classList.add('hidden');
            return;
        }

        // Afficher les mots
        this.elements.customWordsContainer.classList.remove('hidden');
        this.populateCustomWords(selectedType, selectedTheme);
        
        // Réinitialiser les sélections
        this.customSelectedWords.clear();
        this.updateCustomSelectionCount();
    }

    // Remplit les mots pour le type et la thématique sélectionnés
    populateCustomWords(type, theme) {
        const [niveau, thematique] = theme.split(' - ');
        const data = this.vocabularyData[type].filter(item => 
            item.niveau === niveau && item.thematique === thematique
        );

        // Vider la grille
        this.elements.customWordsGrid.innerHTML = '';

        // Créer les cases à cocher pour chaque mot
        data.forEach(word => {
            const wordCheckbox = this.createCustomWordCheckbox(word);
            this.elements.customWordsGrid.appendChild(wordCheckbox);
        });
    }

    // Crée une case à cocher pour un mot personnalisé
    createCustomWordCheckbox(word) {
        const label = document.createElement('label');
        label.className = 'word-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = this.srs.generateCardId(word);
        checkbox.addEventListener('change', () => this.handleCustomWordChange(word, checkbox.checked));

        const checkmark = document.createElement('span');
        checkmark.className = 'word-checkmark';

        const wordInfo = document.createElement('div');
        wordInfo.className = 'word-info';

        const arabicDiv = document.createElement('div');
        arabicDiv.className = 'word-arabic';
        arabicDiv.textContent = word.arabic;

        const translationDiv = document.createElement('div');
        translationDiv.className = 'word-translation';
        translationDiv.textContent = word.translation;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'word-details';
        
        if (word.type === 'mots') {
            detailsDiv.textContent = word.plural ? `Pluriel: ${word.plural}` : 'Mot (nom/adjectif)';
        } else if (word.type === 'verbes') {
            detailsDiv.textContent = `Présent: ${word.present} | Impératif: ${word.imperative}`;
        }

        wordInfo.appendChild(arabicDiv);
        wordInfo.appendChild(translationDiv);
        wordInfo.appendChild(detailsDiv);

        label.appendChild(checkbox);
        label.appendChild(checkmark);
        label.appendChild(wordInfo);

        return label;
    }

    // Gère le changement d'un mot personnalisé
    handleCustomWordChange(word, checked) {
        const wordId = this.srs.generateCardId(word);
        
        if (checked) {
            this.customSelectedWords.add(wordId);
        } else {
            this.customSelectedWords.delete(wordId);
        }
        
        this.updateCustomSelectionCount();
    }

    // Met à jour le compteur de sélection personnalisée
    updateCustomSelectionCount() {
        const count = this.customSelectedWords.size;
        
        if (count === 0) {
            this.elements.customSelectionCount.textContent = 'Aucun mot sélectionné';
            this.elements.startCustomBtn.disabled = true;
        } else {
            this.elements.customSelectionCount.textContent = `${count} mot${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
            this.elements.startCustomBtn.disabled = false;
        }
    }

    // Démarre la révision personnalisée
    startCustomRevision() {
        if (this.customSelectedWords.size === 0) {
            alert('Veuillez sélectionner au moins un mot !');
            return;
        }

        // Obtenir tous les mots de tous les types
        const allWords = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        // Filtrer pour ne garder que les mots sélectionnés
        this.filteredData = allWords.filter(word => {
            const wordId = this.srs.generateCardId(word);
            return this.customSelectedWords.has(wordId);
        });

        console.log('Mots sélectionnés pour révision personnalisée:', this.filteredData.length);

        // Initialiser le système de révision
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        // Démarrer une session avec ordre aléatoire
        this.srs.resetSession();

        // Marquer que ce n'est pas une révision intensive
        this.isIntensiveReview = false;

        this.showScreen('revision');
        this.showNextCard();
    }

    // Redémarre la session actuelle en gardant le même type et les mêmes filtres
    restartCurrentSession() {
        // Déterminer le type de session à redémarrer
        if (this.isIntensiveReview) {
            // Redémarrer une révision intensive
            this.startDifficultCardsReview();
        } else if (this.isOldWordsReview) {
            // Redémarrer une révision des mots anciens
            this.startOldWordsReview();
        } else if (this.isNumbersReview) {
            // Redémarrer l'entraînement aux chiffres
            this.startNumbersReview();
        } else if (this.customSelectedWords && this.customSelectedWords.size > 0) {
            // Redémarrer une révision personnalisée
            this.startCustomRevision();
        } else {
            // Redémarrer une révision normale
            this.startRevision();
        }
    }

    // ==========================================
    // Méthodes pour l'entraînement aux chiffres
    // ==========================================

    // Met à jour l'aperçu des chiffres
    updateNumbersPreview() {
        const difficulty = this.elements.numbersDifficulty.value;
        const count = this.elements.numbersCount.value;
        
        // Générer un exemple de chiffre
        const exampleNumber = this.arabicNumbers.generateRandomNumber(difficulty);
        const arabicDisplay = this.arabicNumbers.toArabic(exampleNumber);
        
        // Mettre à jour l'aperçu
        document.getElementById('preview-number').textContent = arabicDisplay;
        document.querySelector('.french-number').textContent = exampleNumber;
        
        // Mettre à jour le texte de sélection
        let difficultyText = '';
        switch (difficulty) {
            case '1':
                difficultyText = '1 chiffre (1-9)';
                break;
            case '2':
                difficultyText = '2 chiffres (10-99)';
                break;
            case '3':
                difficultyText = '3 chiffres (100-999)';
                break;
            case 'mixed':
                difficultyText = 'Mélange (1-999)';
                break;
        }
        
        this.elements.numbersSelectionCount.textContent = `${count} chiffres - ${difficultyText}`;
    }

    // Démarre l'entraînement aux chiffres
    startNumbersReview() {
        const difficulty = this.elements.numbersDifficulty.value;
        const count = parseInt(this.elements.numbersCount.value);
        
        // Générer les données des chiffres
        this.numbersData = this.arabicNumbers.generateNumberSet(difficulty, count);
        
        // Convertir en format compatible avec le système SRS
        this.filteredData = this.numbersData.map(item => ({
            id: `number_${item.western}`,
            type: 'numbers',
            arabic: item.arabic,
            translation: item.western.toString(),
            niveau: 'Chiffres',
            thematique: 'Nombres arabes',
            partie: difficulty === 'mixed' ? 'Mélange' : `${difficulty} chiffre${difficulty > 1 ? 's' : ''}`
        }));

        // Initialiser le système de révision
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        // Démarrer une session avec ordre aléatoire
        this.srs.resetSession();

        // Marquer que c'est une révision des chiffres
        this.isNumbersReview = true;

        console.log('Démarrage de l\'entraînement aux chiffres:', this.filteredData.length, 'chiffres');

        this.showScreen('revision');
        this.showNextCard();
    }

    // Gère la fin de répétition des mots ratés
    handleFailedWordsRepetitionEnd() {
        // Vider la liste 3 après la répétition
        this.oldWordsList3 = [];
        
        // Afficher les résultats normalement
        this.showScreen('results');
        
        // Proposer de continuer avec une nouvelle série
        setTimeout(() => {
            if (this.oldWordsList1.length > 0) {
                const message = `Répétition terminée !\n\nIl reste ${this.oldWordsList1.length} mot(s) ancien(s) à réviser.\n\nVoulez-vous continuer avec une nouvelle série de 7 mots ?`;
                if (confirm(message)) {
                    this.prepareNextOldWordsSeries();
                } else {
                    // Ajouter un bouton pour continuer plus tard
                    this.addContinueSeriesButton();
                }
            } else {
                alert('Félicitations ! Tous les mots anciens ont été révisés.\n\nRetour au menu principal.');
            }
        }, 100);
    }

    // Ajoute un bouton pour continuer une nouvelle série
    addContinueSeriesButton() {
        // Vérifier si le bouton existe déjà
        if (document.getElementById('continue-series-btn')) {
            return;
        }

        const resultsActions = document.querySelector('.results-actions');
        if (resultsActions && this.oldWordsList1.length > 0) {
            const continueBtn = document.createElement('button');
            continueBtn.id = 'continue-series-btn';
            continueBtn.className = 'menu-btn';
            continueBtn.textContent = `Continuer (${this.oldWordsList1.length} mots restants)`;
            continueBtn.onclick = () => this.prepareNextOldWordsSeries();
            
            // Insérer le bouton avant le bouton "Retour au menu"
            const returnBtn = resultsActions.querySelector('button:last-child');
            resultsActions.insertBefore(continueBtn, returnBtn);
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new VocabApp();
});
