
class ArabicNumbers {
    constructor() {
        
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

    
    toArabic(number) {
        return number.toString().split('').map(digit => this.arabicDigits[digit] || digit).join('');
    }

    
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


class SpacedRepetitionSystem {
    constructor() {
        this.cards = [];
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
        this.isCardRevealed = false; 
        this.loadProgress();
    }

    
    loadProgress() {
        const saved = localStorage.getItem('arabicVocabProgress');
        this.progress = saved ? JSON.parse(saved) : {};
    }

    
    saveProgress() {
        localStorage.setItem('arabicVocabProgress', JSON.stringify(this.progress));
    }

    
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

    
    generateCardId(card) {
        return `${card.type}_${card.niveau}_${card.thematique}_${card.partie}_${card.arabic}`;
    }

    
    sortCards() {
        this.cards.sort((a, b) => {
            const now = Date.now();
            const aReady = a.progress.nextReview <= now;
            const bReady = b.progress.nextReview <= now;
            
            if (aReady && !bReady) return -1;
            if (!aReady && bReady) return 1;
            
            
            const aFailureRate = a.progress.attempts > 0 ? a.progress.failures / a.progress.attempts : 0;
            const bFailureRate = b.progress.attempts > 0 ? b.progress.failures / b.progress.attempts : 0;
            
            if (aFailureRate !== bFailureRate) return bFailureRate - aFailureRate;
            
            
            return a.progress.nextReview - b.progress.nextReview;
        });
    }

    
    updateCardProgress(cardId, score) {
        const progress = this.progress[cardId];
        progress.attempts++;
        progress.lastReview = Date.now();

        
        if (score >= 2) {
            progress.successes++;
            
            if (score === 3) { 
                progress.difficulty = Math.max(1.3, progress.difficulty - 0.15);
                progress.interval = Math.ceil(progress.interval * 2.5);
            } else { 
                progress.difficulty = Math.max(1.3, progress.difficulty - 0.1);
                progress.interval = Math.ceil(progress.interval * progress.difficulty);
            }
        } else {
            progress.failures++;
            
            if (score === 0) { 
                progress.difficulty = Math.min(2.5, progress.difficulty + 0.2);
                progress.interval = 1;
            } else { 
                progress.difficulty = Math.min(2.5, progress.difficulty + 0.15);
                progress.interval = Math.max(1, Math.ceil(progress.interval * 0.6));
            }
        }

        
        const dayInMs = 24 * 60 * 60 * 1000;
        progress.nextReview = Date.now() + (progress.interval * dayInMs);

        this.saveProgress();
    }

    
    getCurrentCard() {
        return this.getNextSessionCard();
    }

    
    nextCard() {
        this.currentCardIndex++;
        return !this.isSessionComplete();
    }

    
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
        
        
        this.cards.forEach(card => {
            delete card.needsReview;
            delete card.countedInTotal;
        });
        
        
        this.initializeRandomSession();
    }

    
    shuffleArray(array) {
        const shuffled = [...array]; 
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    
    initializeRandomSession() {
        
        this.shuffleCards();
        
        this.remainingCards = [...this.cards];
        this.currentSessionCards = [];
    }

    
    addFailedCardToEnd(card) {
        
        card.needsReview = true;
        
        this.remainingCards.push(card);
    }

    
    getNextSessionCard() {
        if (this.currentCardIndex < this.currentSessionCards.length) {
            return this.currentSessionCards[this.currentCardIndex];
        }
        
        
        if (this.remainingCards.length > 0) {
            
            this.currentSessionCards = [...this.remainingCards];
            this.remainingCards = [];
            this.currentCardIndex = 0;
            
            
            for (let i = this.currentSessionCards.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.currentSessionCards[i], this.currentSessionCards[j]] = 
                [this.currentSessionCards[j], this.currentSessionCards[i]];
            }
            
            return this.currentSessionCards[this.currentCardIndex];
        }
        
        return null; 
    }

    
    isSessionComplete() {
        return this.currentCardIndex >= this.currentSessionCards.length && 
               this.remainingCards.length === 0;
    }

    
    getDifficultCards(cards, maxCards = 20) {
        
        const difficultCards = cards.filter(card => {
            
            const progress = card.progress;
            if (!progress || progress.attempts === 0) return false;
            
            const failureRate = progress.failures / progress.attempts;
            return failureRate > 0.5; 
        });

        
        difficultCards.sort((a, b) => {
            const aProgress = a.progress;
            const bProgress = b.progress;
            
            const aFailureRate = aProgress.attempts > 0 ? aProgress.failures / aProgress.attempts : 0;
            const bFailureRate = bProgress.attempts > 0 ? bProgress.failures / bProgress.attempts : 0;
            
            
            if (Math.abs(aFailureRate - bFailureRate) < 0.01) {
                return bProgress.failures - aProgress.failures;
            }
            
            return bFailureRate - aFailureRate;
        });

        
        return difficultCards.slice(0, maxCards);
    }

    
    initializeDifficultCardsSession(allCards) {
        const difficultCards = this.getDifficultCards(allCards);
        
        if (difficultCards.length === 0) {
            
            
            this.remainingCards = [];
            this.currentSessionCards = [];
            this.currentCardIndex = 0;
            return 0;
        } else {
            this.remainingCards = [...difficultCards];
        }
        
        this.currentSessionCards = [];
        this.currentCardIndex = 0;
        
        
        this.shuffleArray(this.remainingCards);
        
        return this.remainingCards.length;
    }

    
    getOldCards(cards, maxCards = 50) {
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000); 
        
        
        const oldCards = cards.filter(card => {
            const progress = card.progress;
            if (!progress || progress.attempts === 0) return false;
            
            
            return progress.lastReview && progress.lastReview < threeDaysAgo;
        });

        
        oldCards.sort((a, b) => {
            const aLastReview = a.progress.lastReview || 0;
            const bLastReview = b.progress.lastReview || 0;
            
            
            if (Math.abs(aLastReview - bLastReview) < (24 * 60 * 60 * 1000)) { 
                return b.progress.attempts - a.progress.attempts;
            }
            
            return aLastReview - bLastReview; 
        });

        
        return oldCards.slice(0, maxCards);
    }

    
    initializeOldCardsSession(allCards) {
        const oldCards = this.getOldCards(allCards);
        
        if (oldCards.length === 0) {
            
            this.remainingCards = [];
            this.currentSessionCards = [];
            this.currentCardIndex = 0;
            return 0;
        } else {
            this.remainingCards = [...oldCards];
        }
        
        this.currentSessionCards = [];
        this.currentCardIndex = 0;
        
        
        this.shuffleArray(this.remainingCards);
        
        return this.remainingCards.length;
    }

    
    
    

    
    convertToArabicNumerals(number) {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return number.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    }

    
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
            parties: new Set() 
        };
        this.reverseMode = false;
        this.isIntensiveReview = false; 
        this.isOldWordsReview = false; 
        this.isNumbersReview = false; 
        this.isOldWordsMainSession = false; 
        this.customSelectedWords = new Set(); 
        this.autoAudioMode = false; 
        this.numbersData = []; 
        
        
        this.oldWordsList1 = []; 
        this.oldWordsList2 = []; 
        this.oldWordsList3 = []; 

        this.initializeElements();
        this.loadVocabularyData();
        this.setupEventListeners();
        this.updateStatsDisplay(); 
        this.setupAutoSave(); 
        this.restoreSession(); 
    }

    
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
            
            toggleStatsBtn: document.getElementById('toggle-stats-btn'),
            statsContent: document.getElementById('stats-content'),
            resetStatsBtn: document.getElementById('reset-stats-btn'),
            totalAttempts: document.getElementById('total-attempts'),
            totalSuccesses: document.getElementById('total-successes'),
            totalFailures: document.getElementById('total-failures'),
            successRate: document.getElementById('success-rate'),
            difficultCards: document.getElementById('difficult-cards'),
            masteredCards: document.getElementById('mastered-cards'),
            
            customSelection: document.getElementById('custom-selection'),
            customTypeSelect: document.getElementById('custom-type-select'),
            customThemeContainer: document.getElementById('custom-theme-container'),
            customThemeSelect: document.getElementById('custom-theme-select'),
            customWordsContainer: document.getElementById('custom-words-container'),
            customWordsGrid: document.getElementById('custom-words-grid'),
            customSelectionCount: document.getElementById('custom-selection-count'),
            startCustomBtn: document.getElementById('start-custom-btn'),
            
            arabicAudioBtn: document.getElementById('arabic-audio-btn'),
            autoAudioToggle: document.getElementById('auto-audio-mode'),
            
            numbersSelection: document.getElementById('numbers-selection'),
            numbersDifficulty: document.getElementById('numbers-difficulty'),
            numbersCount: document.getElementById('numbers-count'),
            numbersPreview: document.getElementById('numbers-preview'),
            numbersSelectionCount: document.getElementById('numbers-selection-count'),
            startNumbersBtn: document.getElementById('start-numbers-btn')
        };
    }

    
    async loadVocabularyData() {
        try {
            
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
تُصْبِحُ عَلَى خَيْرٍ;;Bonne nuit
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
جَمِيعٌ;;Tout
صَالَةٌ;صَالَاتٌ;Salon / Salle / Hall
بَيْنَ;;Entre
مَحَبَّةٌ;;Amour
عَلَاقَةٌ;عَلَاقَاتٌ;Relation
طَيِّبَةٌ;;Bonne
تَفْصِيلٌ;تَفَاصِيلٌ;Détail
يَوْمِيَّةٌ;;Quotidienne
فَرْقٌ;فُرُوقٌ;Différence
عَادَةٌ;عَادَاتٌ;Habitude
كَيْفِيَّةٌ;كَيْفِيَّاتٌ;Manière
تَعَلُّمٌ;;Apprentissage
سَنَةٌ;سَنَوَاتٌ;Année
دِرَاسِيَّةٌ;;Scolaire
وَاحِدَةٌ;;Une
Partie 2;;
الآنَ;;Maintenant
أَخٌ;إِخْوَةٌ/إِخْوَانٌ;Frère (Religion/Sang)
عِنْدِي;;J'ai
سُؤَالٌ;أَسْئِلَةٌ;Question 
لَوْ;;Si
قَبْلَ;;Avant
بَلَدٌ;بِلَادٌ/بُلْدَانٌ;Pays
نَعَمْ;;Oui
زِيَارَةٌ;زِيَارَاتٌ;Visite
أُمٌّ;أُمَّهَاتٌ;Mère
كَبِيرٌ;;Grand
هُنَاكَ;;Là bas
بَعْضٌ;;Quelques / Certains
مَرْكَزٌ;مَرَاكِزُ;Centre
الَّذِي;;Celui qui
مَسْجِدٌ;مَسَاجِدُ;Mosquée
خَلْفَ;;Derrière
غُرْفَةٌ;غُرَفٌ;Chambre
Partie 3;;
أَهْلٌ;أَهْلُونَ;Gens
ذِكْرٌ;أَذْكَارٌ;Évocation/Rappel
Partie 4;;
هَلْ;;Est-ce que
أَ;;Est-ce que
مَا / مَاذَا;;Quoi
لِمَ / لِمَاذَا;;Pourquoi
مَنْ;;Qui
كَيْفَ;;Comment
مَتَى;;Quand
أَيَّانَ;;Quand
أَيْنَ;;Où
أَنَّى;;D'où / Quand / Comment / Où
أَيُّ;;Qui / Quelle / Quoi
كَمْ / بِكُمْ;;Combien
هَلْ كَتَبْتَ الدَّرْسَ؟;;As tu écris le cours ?
أَ زَيْدٌ فِي الْفَصْلِ؟;;Est-ce que Zaid est dans la classe ?
مَنِ الْأُسْتَاذُ؟;;Qui est le professeur ?
كَيْفَ وَجَدْتَنِي؟;;Comment m'as-tu trouvé ?
مَتَى دَرَسْتَ الْعَرَبِيَّةَ؟;;Quand as-tu étudié l'arabe ?
أَيَّانَ يَوْمُ سَفَرِكَ؟;;Quand est le jour de ton voyage ?
أَيْنَ الْجَامِعَةُ؟;;Où est l'université ?
أَيَّ كِتَابٍ تَقْرَأُ؟;;Quel livre lis-tu ?
كَمْ طَالِبًا فِي الْفَصْلِ؟;;Combien d'étudiants sont dans la classe ?
بِكَمْ هَذَا؟;;Combien coûte ceci ?
عِندِي سُؤَالٌ لَوْ سَمَحْتَ;;J'ai une question si tu le permets
تَفَضَّلْ;;Je t'en prie !
طَبْعًا;;Bien sûr
مَا مَعْنَى ...؟;;Quel est le sens de ... ?
كَيْفَ نَقُولُ ... بِالْعَرَبِيَّةِ؟;;Comment dit-on ... en arabe ?
مَا رَأْيَكَ ؟;;Quel est ton avis ?
لَدَيَّ سُؤَالٌ;;J'ai une question
أُرِيدُ أَنْ أَسْأَلَكَ لَوْ سَمَحْتَ.;;Je veux te questionner si tu le permets.
عِنْدِي سُؤَالٌ بِخُصُوصِ ...;;J'ai une question au sujet de ...
Partie 5;;
Thématique 4;;
Partie 1;;
آدَابٌ;أَدَبٌ;Politesse / Comportement
بَيْنَمَا;;Pendant que / Tandis que
جُلُوسٌ;;Assise / Le fait de s'asseoir
غَدَاءٌ;;Déjeuner
حَوْلَ;;Autour de
طَاوِلَةٌ;طَاوِلَاتٌ;Table
فُرْصَةٌ;فُرَصٌ;Occasion
صَبَاحًا;;Matin
طَرِيقٌ;طُرُقٌ;Route / Voie / Chemin
مُبْتَدِئٌ;مُبْتَدِئُونَ;Débutant
تَطْبِيقٌ;;Application
سَهْلَةٌ;;Facile
سُرْعَةٌ;;Vitesse
إِذَا;;Si
Partie 2;;
مَعْذِرَةً;;Désolé
تَأْخِيرُ;;Retard
جَوْعَانُ;جِيَاعٌ;Affamé
طَبَّاخٌ;طَبَّاخُونَ;Cuisinier
يَوْمٌ;أَيَّامٌ;Jour
مَاهِرٌ;مَاهِرُونَ;Habile
طَعَامٌ;أَطْعِمَةٌ;Nourriture / Plat
طَاجِنٌ;طَوَاجِنُ;Tajine
دَجَاجَةٌ;دَجَاجٌ;Poulet
زَيْتُونَةٌ;زَيْتُونٌ;Olive
لَذِيذٌ;;Délicieux
خُبْزَةٌ;خُبْزٌ;Pain
هَناءٌ;;Bonheur
شِفَاءٌ;;Guérison
سَلَطَةٌ;سَلَطَاتٌ;Salade
رَأْيٌ;آرَاءٌ;Opinion / Avis
وَاسِعَةٌ;;Spacieuse
نَظِيفَةٌ;;Propre
حَرِيصٌ;حَرِيصُونَ;Soucieux
نَظَافَةٌ;;Propreté
قَلِيلٌ;;Peu
عَصِيرٌ;عَصَائِرُ;Jus
جَاهِزٌ;;Prêt
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
قَعَدَ;يَقْعُدُ;اُقْعُدْ;قُعُودًا;S’asseoir
بَارَكَ;يُبَارِكُ;بَارِكْ;مُبَارَكَةً;Bénir
سَمَحَ;يَسْمَحُ;اِسْمَحْ;سَمْحًا;Permettre
رَجَعَ;يَرْجِعُ;اِرْجِعْ;رُجُوعًا;Revenir
أَرَى;يُرِي;أَرِ;إِرَاءَةً;Faire voir
Partie 3;;;;
سَأَلَ;يَسْأَلُ;اِسَأَلْ/سَلْ;سُؤَالًا;Questionner/Demander
يَكُونُ;كُنْ;كَوْنًا;كَانَ;Être
عَلِمَ;يَعْلَمُ;اِعْلَمْ;عِلْمًا;Savoir
Partie 4;;;;
Partie 5;;;;
Thématique 4;;;;
Partie 1;;;;
أَحْضَرَ;يُحْضِرُ;أَحْضِرْ;إِحْضَارًا;Apporter
طَبَخَ;يَطْبُخُ;اُطْبُخْ;طَبْخًا;Cuisiner
أَخَذَ;يَأْخُذُ;خُذْ;أَخْذًا;Prendre / Saisir
اِسْتَعْمَلَ;يَسْتَعْمِلُ;اِسْتَعْمِلْ;اِسْتِعْمَالًا;Utiliser
عَلَّمَ;يُعَلِّمُ;عَلِّمْ;تَعْلِيمًا;Enseigner
أَمْكَنَ;يُمْكِنُ;أَمْكِنْ;إِمْكَانًا;Pouvoir
اِجْتَهَدَ;يَجْتَهِدُ;اِجْتَهِدْ;اِجْتِهَادًا;S'efforcer
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
                    item.arabic = columns[0].trim(); 
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

    
    setupEventListeners() {
        
        this.elements.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectType(btn.dataset.type));
        });

        
        
        
        this.elements.reverseModeToggle.addEventListener('change', () => {
            this.reverseMode = this.elements.reverseModeToggle.checked;
            
            if (this.screens.revision.classList.contains('active') && this.srs.getCurrentCard()) {
                this.updateCurrentCardDisplay();
            }
        });

        
        this.elements.autoAudioToggle.addEventListener('change', () => {
            this.autoAudioMode = this.elements.autoAudioToggle.checked;
        });

        
        this.elements.startBtn.addEventListener('click', () => this.startRevision());
        this.elements.revealBtn.addEventListener('click', () => this.revealAnswer());
        this.elements.backBtn.addEventListener('click', () => this.showScreen('selection'));
        this.elements.restartBtn.addEventListener('click', () => this.restartCurrentSession());
        this.elements.newSelectionBtn.addEventListener('click', () => this.showScreen('selection'));
        this.elements.reviewDifficultBtn.addEventListener('click', () => this.startDifficultCardsReviewFromResults());

        
        this.elements.toggleStatsBtn.addEventListener('click', () => this.toggleStats());
        this.elements.resetStatsBtn.addEventListener('click', () => this.resetStats());

        
        this.elements.customTypeSelect.addEventListener('change', () => this.handleCustomTypeChange());
        this.elements.customThemeSelect.addEventListener('change', () => this.handleCustomThemeChange());
        this.elements.startCustomBtn.addEventListener('click', () => this.startCustomRevision());

        
        this.elements.arabicAudioBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            this.playArabicAudio();
        });

        
        this.elements.answerButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                this.answerCard(parseInt(e.target.dataset.score));
            }
        });

        
        this.elements.flashcard.addEventListener('click', () => {
            if (!this.elements.revealBtn.classList.contains('hidden')) {
                this.revealAnswer();
            }
        });

        
        this.elements.numbersDifficulty.addEventListener('change', () => this.updateNumbersPreview());
        this.elements.numbersCount.addEventListener('change', () => this.updateNumbersPreview());
        this.elements.startNumbersBtn.addEventListener('click', () => this.startNumbersReview());
    }

    
    selectType(type) {
        this.currentType = type;
        
        
        this.isIntensiveReview = false;
        this.isOldWordsReview = false;
        this.isNumbersReview = false;
        
        
        this.elements.typeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        
        this.elements.filters.classList.add('hidden');
        this.elements.customSelection.classList.add('hidden');
        this.elements.numbersSelection.classList.add('hidden');

        
        if (type === 'revision') {
            this.startDifficultCardsReview();
            return;
        }

        
        if (type === 'old-words') {
            this.startOldWordsReview();
            return;
        }

        
        if (type === 'custom') {
            this.elements.customSelection.classList.remove('hidden');
            this.initializeCustomSelection();
            return;
        }

        
        if (type === 'numbers') {
            this.elements.numbersSelection.classList.remove('hidden');
            this.updateNumbersPreview();
            return;
        }

        
        this.elements.filters.classList.remove('hidden');
        this.populateFilters();
    }

    
    populateFilters() {
        const data = this.vocabularyData[this.currentType];
        
        
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

        
        this.createHierarchicalInterface(hierarchy);

        
        this.selectedFilters.parties.clear();
        this.updateSelectionSummary();
    }

    
    createHierarchicalInterface(hierarchy) {
        const container = this.elements.hierarchicalSelection;
        container.innerHTML = '';

        
        const expandBtn = document.createElement('button');
        expandBtn.className = 'expand-all-btn';
        expandBtn.textContent = '📂 Tout développer';
        expandBtn.onclick = () => this.toggleAllSections(expandBtn);
        container.appendChild(expandBtn);

        
        Object.keys(hierarchy).sort().forEach(niveau => {
            const niveauSection = this.createNiveauSection(niveau, hierarchy[niveau]);
            container.appendChild(niveauSection);
        });
    }

    
    createNiveauSection(niveau, thematiques) {
        const section = document.createElement('div');
        section.className = 'niveau-section';
        section.dataset.niveau = niveau;

        
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

        
        const content = document.createElement('div');
        content.className = 'niveau-content';

        
        Object.keys(thematiques).sort().forEach(thematique => {
            const thematiqueSection = this.createThematiqueSection(niveau, thematique, thematiques[thematique]);
            content.appendChild(thematiqueSection);
        });

        section.appendChild(header);
        section.appendChild(content);

        return section;
    }

    
    createThematiqueSection(niveau, thematique, parties) {
        const section = document.createElement('div');
        section.className = 'thematique-section';
        section.dataset.thematique = thematique;

        
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

        
        const content = document.createElement('div');
        content.className = 'thematique-content';

        const partiesGrid = document.createElement('div');
        partiesGrid.className = 'parties-grid';

        
        Array.from(parties).sort().forEach(partie => {
            const checkbox = this.createPartieCheckbox(niveau, thematique, partie);
            partiesGrid.appendChild(checkbox);
        });

        content.appendChild(partiesGrid);
        section.appendChild(header);
        section.appendChild(content);

        return section;
    }

    
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

    
    handlePartieChange(partieKey, checked) {
        if (checked) {
            this.selectedFilters.parties.add(partieKey);
        } else {
            this.selectedFilters.parties.delete(partieKey);
        }
        this.updateSelectionSummary();
    }

    
    toggleNiveauSection(section) {
        section.classList.toggle('expanded');
    }

    
    toggleThematiqueSection(section) {
        section.classList.toggle('expanded');
    }

    
    toggleAllSections(button) {
        const allSections = this.elements.hierarchicalSelection.querySelectorAll('.niveau-section, .thematique-section');
        const expandedSections = this.elements.hierarchicalSelection.querySelectorAll('.niveau-section.expanded, .thematique-section.expanded');
        
        if (expandedSections.length === 0) {
            
            allSections.forEach(section => section.classList.add('expanded'));
            button.textContent = '📁 Tout réduire';
        } else {
            
            allSections.forEach(section => section.classList.remove('expanded'));
            button.textContent = '📂 Tout développer';
        }
    }

    
    updateSelectionSummary() {
        const totalSelected = this.selectedFilters.parties.size;
        
        if (totalSelected === 0) {
            this.elements.selectionCount.textContent = 'Aucune sélection';
            this.elements.startBtn.disabled = true;
        } else {
            
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

    
    startRevision() {
        
        this.isIntensiveReview = false;
        
        
        this.filteredData = this.vocabularyData[this.currentType].filter(item => {
            const partieKey = `${item.niveau}|${item.thematique}|${item.partie}`;
            return this.selectedFilters.parties.has(partieKey);
        });

        if (this.filteredData.length === 0) {
            alert('Aucun vocabulaire trouvé avec ces critères !');
            return;
        }

        
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        
        this.srs.resetSession();

        this.showScreen('revision');
        this.showNextCard();
    }

    
    showNextCard() {
        const card = this.srs.getCurrentCard();
        if (!card) {
            this.showResults();
            return;
        }

        
        document.querySelector('.card-front').style.display = 'block';
        document.querySelector('.card-back').classList.add('hidden');
        this.elements.revealBtn.classList.remove('hidden');
        this.elements.answerButtons.classList.add('hidden');

        this.updateCurrentCardDisplay();

        
        this.updateProgressBar();

        
        this.updateSessionStats();

        
        this.saveCurrentSession();

        
        if (this.autoAudioMode) {
            
            setTimeout(() => {
                this.playArabicAudio();
            }, 500);
        }
    }

    
    updateCurrentCardDisplay() {
        const card = this.srs.getCurrentCard();
        if (!card) return;

        
        const existingIndicator = this.elements.flashcard.querySelector('.card-mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        
        const existingRepeatIndicator = this.elements.flashcard.querySelector('.card-repeat-indicator');
        if (existingRepeatIndicator) {
            existingRepeatIndicator.remove();
        }

        
        const existingIntensiveIndicator = this.elements.flashcard.querySelector('.card-intensive-indicator');
        if (existingIntensiveIndicator) {
            existingIntensiveIndicator.remove();
        }

        
        const existingOldIndicator = this.elements.flashcard.querySelector('.card-old-indicator');
        if (existingOldIndicator) {
            existingOldIndicator.remove();
        }

        
        const modeIndicator = document.createElement('div');
        modeIndicator.className = `card-mode-indicator ${this.reverseMode ? 'reverse' : ''}`;
        modeIndicator.textContent = this.reverseMode ? 'FR → AR' : 'AR → FR';
        this.elements.flashcard.appendChild(modeIndicator);

        
        if (this.isIntensiveReview) {
            const intensiveIndicator = document.createElement('div');
            intensiveIndicator.className = 'card-intensive-indicator';
            intensiveIndicator.textContent = '🎯 Révision intensive';
            this.elements.flashcard.appendChild(intensiveIndicator);
        }

        
        if (this.isNumbersReview) {
            const numbersIndicator = document.createElement('div');
            numbersIndicator.className = 'card-numbers-indicator';
            numbersIndicator.textContent = '� Entraînement chiffres';
            this.elements.flashcard.appendChild(numbersIndicator);
        }

        
        if (card.needsReview) {
            const repeatIndicator = document.createElement('div');
            repeatIndicator.className = 'card-repeat-indicator';
            repeatIndicator.textContent = '🔄 Répétition';
            this.elements.flashcard.appendChild(repeatIndicator);
        }

        if (this.reverseMode && !this.isNumbersReview) {
            
            this.elements.arabicText.textContent = card.translation;
            this.elements.arabicText.classList.add('reverse-mode');
        } else {
            
            this.elements.arabicText.textContent = card.arabic;
            this.elements.arabicText.classList.remove('reverse-mode');
        }

        
        if (this.isNumbersReview) {
            this.elements.arabicText.classList.add('arabic-number-display');
        } else {
            this.elements.arabicText.classList.remove('arabic-number-display');
        }

        this.elements.cardType.textContent = this.isNumbersReview ? 
            `${card.niveau} - ${card.partie}` : 
            `${card.type} - ${card.niveau}`;
        
        
        const failureRate = card.progress.attempts > 0 ? 
            Math.round((card.progress.failures / card.progress.attempts) * 100) : 0;
        this.elements.difficultyIndicator.textContent = `Échecs: ${failureRate}%`;
    }

    
    revealAnswer() {
        const card = this.srs.getCurrentCard();
        
        document.querySelector('.card-front').style.display = 'none';
        document.querySelector('.card-back').classList.remove('hidden');

        if (this.reverseMode && !this.isNumbersReview) {
            
            this.elements.translationText.textContent = card.arabic;
            this.elements.translationText.classList.add('reverse-mode');
        } else {
            
            this.elements.translationText.textContent = card.translation;
            this.elements.translationText.classList.remove('reverse-mode');
        }

        
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
        
        
        this.srs.isCardRevealed = true;
        this.saveCurrentSession();
    }

    
    answerCard(score) {
        const card = this.srs.getCurrentCard();
        
        
        this.srs.updateCardProgress(card.id, score);

        
        this.srs.sessionStats.totalAttempts++;
        
        if (score === 0) {
            this.srs.sessionStats.incorrect++;
            
            this.srs.addFailedCardToEnd(card);
        } else if (score === 1) {
            this.srs.sessionStats.difficult++;
            
            this.srs.addFailedCardToEnd(card);
        } else {
            
            if (!card.needsReview) {
                this.srs.sessionStats.correct++;
            }
            
            
            
            if (!card.countedInTotal) {
                this.srs.sessionStats.total++;
                card.countedInTotal = true;
            }
            
        }

        
        this.srs.isCardRevealed = false;

        
        if (this.srs.nextCard()) {
            setTimeout(() => this.showNextCard(), 300);
        } else {
            this.showResults();
        }
        
        
        if (!this.elements.statsContent.classList.contains('hidden')) {
            this.updateStatsDisplay();
        }
    }

    
    updateProgressBar() {
        const uniqueCardsTotal = this.filteredData.length;
        
        
        
        let completedCards;
        if (this.isOldWordsReview && !this.isOldWordsMainSession) {
            
            completedCards = this.srs.sessionStats.correct;
        } else {
            
            completedCards = this.srs.sessionStats.total;
        }
        
        const progress = uniqueCardsTotal > 0 ? (completedCards / uniqueCardsTotal) * 100 : 0;
        
        this.elements.progressFill.style.width = `${progress}%`;
        
        
        if (this.isIntensiveReview) {
            this.elements.progressText.textContent = `${completedCards} / ${uniqueCardsTotal} cartes difficiles maîtrisées`;
        } else if (this.isOldWordsReview) {
            if (this.isOldWordsMainSession) {
                this.elements.progressText.textContent = `${completedCards} / ${uniqueCardsTotal} mots anciens maîtrisés`;
            } else {
                this.elements.progressText.textContent = `${completedCards} / ${uniqueCardsTotal} mots ratés maîtrisés`;
            }
        } else if (this.isNumbersReview) {
            this.elements.progressText.textContent = `${completedCards} / ${uniqueCardsTotal} chiffres maîtrisés`;
        } else {
            this.elements.progressText.textContent = `${completedCards} / ${uniqueCardsTotal} cartes maîtrisées`;
        }

        
        const totalAttempts = this.srs.sessionStats.totalAttempts;
        if (totalAttempts > completedCards) {
            this.elements.progressText.textContent += ` (${totalAttempts} essais)`;
        }
    }

    
    updateSessionStats() {
        this.elements.correctCount.textContent = this.srs.sessionStats.correct;
        this.elements.difficultCount.textContent = this.srs.sessionStats.difficult;
        this.elements.incorrectCount.textContent = this.srs.sessionStats.incorrect;
    }

    
    showResults() {
        const stats = this.srs.sessionStats;
        const score = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

        this.elements.finalCorrect.textContent = stats.correct;
        this.elements.finalTotal.textContent = stats.total;
        this.elements.finalScore.textContent = `${score}%`;

        
        if (this.isOldWordsReview) {
            if (this.isOldWordsMainSession) {
                
                this.handleOldWordsSeriesEnd();
            } else {
                
                this.handleFailedWordsRepetitionEnd();
            }
        } else {
            this.showScreen('results');
        }
    }

    
    handleOldWordsSeriesEnd() {
        
        this.srs.currentSessionCards.forEach(card => {
            const cardId = card.id || this.srs.generateCardId(card);
            const wasCorrect = this.srs.progress[cardId] && this.srs.progress[cardId].wasCorrect;
            
            if (!wasCorrect) {
                
                this.oldWordsList3.push(card);
            }
            
            
        });

        
        this.showScreen('results');
        
        
        setTimeout(() => {
            if (this.oldWordsList3.length > 0) {
                const message = `Série terminée !\n\n${this.oldWordsList3.length} mot(s) à répéter avant de continuer.\n\nCliquez sur "Répéter les mots ratés" pour commencer la répétition.`;
                
                
                
                this.addRepeatFailedWordsButton();
            } else {
                const message = `Série terminée avec succès !\n\nTous les mots ont été réussis.\n\nCliquez sur "Retour au menu" pour continuer ou réviser une nouvelle série.`;
                
            }
        }, 100);
    }

    
    addRepeatFailedWordsButton() {
        
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
            
            
            const returnBtn = resultsActions.querySelector('button:last-child');
            resultsActions.insertBefore(repeatBtn, returnBtn);
        }
    }

    
    startFailedWordsRepetition() {
        if (this.oldWordsList3.length === 0) {
            alert('Aucun mot à répéter !');
            return;
        }

        
        this.srs.cards = [];
        this.srs.remainingCards = [...this.oldWordsList3];
        this.srs.currentSessionCards = [];
        this.srs.currentCardIndex = 0;
        
        this.oldWordsList3.forEach(card => {
            this.srs.addCard({...card});
        });

        
        this.filteredData = this.oldWordsList3;
        this.totalOldWordsAvailable = this.oldWordsList3.length;
        
        
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        
        this.isOldWordsMainSession = false;

        this.showScreen('revision');
        this.showNextCard();
    }

    
    showScreen(screenName) {
        
        this.cleanupTemporaryButtons();
        
        
        if (screenName === 'selection') {
            this.isIntensiveReview = false;
            this.isOldWordsReview = false;
            this.isNumbersReview = false;
            this.isOldWordsMainSession = false;
            
            this.customSelectedWords.clear();
            
            this.oldWordsList1 = [];
            this.oldWordsList2 = [];
            this.oldWordsList3 = [];
            
            localStorage.removeItem('arabicVocabSession');
            
            if (!this.elements.statsContent.classList.contains('hidden')) {
                this.updateStatsDisplay();
            }
        }
        
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    
    cleanupTemporaryButtons() {
        const tempButtons = ['repeat-failed-btn', 'continue-series-btn'];
        tempButtons.forEach(buttonId => {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.remove();
            }
        });
    }

    
    setupAutoSave() {
        
        window.addEventListener('beforeunload', () => {
            this.saveCurrentSession();
        });
        
        
        window.addEventListener('blur', () => {
            this.saveCurrentSession();
        });
        
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveCurrentSession();
            }
        });
        
        
        setInterval(() => {
            if (this.isInSession()) {
                this.saveCurrentSession();
            }
        }, 30000);
    }

    
    isInSession() {
        return this.screens.revision.classList.contains('active') || 
               this.screens.results.classList.contains('active');
    }

    
    saveCurrentSession() {
        if (!this.isInSession()) {
            
            localStorage.removeItem('arabicVocabSession');
            return;
        }

        const sessionData = {
            timestamp: Date.now(),
            currentScreen: this.getCurrentScreen(),
            
            
            currentType: this.currentType,
            reverseMode: this.reverseMode,
            autoAudioMode: this.autoAudioMode,
            
            
            isIntensiveReview: this.isIntensiveReview,
            isOldWordsReview: this.isOldWordsReview,
            isNumbersReview: this.isNumbersReview,
            isOldWordsMainSession: this.isOldWordsMainSession,
            
            
            filteredData: this.filteredData,
            selectedFilters: {
                parties: Array.from(this.selectedFilters.parties)
            },
            customSelectedWords: Array.from(this.customSelectedWords),
            numbersData: this.numbersData,
            
            
            oldWordsList1: this.oldWordsList1,
            oldWordsList2: this.oldWordsList2,
            oldWordsList3: this.oldWordsList3,
            
            
            srsState: {
                cards: this.srs.cards,
                remainingCards: this.srs.remainingCards,
                currentSessionCards: this.srs.currentSessionCards,
                currentCardIndex: this.srs.currentCardIndex,
                sessionStats: this.srs.sessionStats,
                isCardRevealed: this.srs.isCardRevealed
            },
            
            
            currentCardData: this.getCurrentCardDisplayData()
        };

        localStorage.setItem('arabicVocabSession', JSON.stringify(sessionData));
        console.log('Session sauvegardée automatiquement');
    }

    
    getCurrentScreen() {
        for (const [name, screen] of Object.entries(this.screens)) {
            if (screen.classList.contains('active')) {
                return name;
            }
        }
        return 'selection';
    }

    
    getCurrentCardDisplayData() {
        if (!this.isInSession()) return null;
        
        const arabicText = this.elements.arabicText.textContent;
        const translationText = this.elements.translationText.textContent;
        const cardType = this.elements.cardType.textContent;
        const additionalInfo = this.elements.additionalInfo.textContent;
        const progressText = this.elements.progressText.textContent;
        const isRevealed = !this.elements.cardBack.classList.contains('hidden');
        
        return {
            arabicText,
            translationText,
            cardType,
            additionalInfo,
            progressText,
            isRevealed
        };
    }

    
    restoreSession() {
        const savedSession = localStorage.getItem('arabicVocabSession');
        if (!savedSession) return;

        try {
            const sessionData = JSON.parse(savedSession);
            
            
            const sessionAge = Date.now() - sessionData.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; 
            
            if (sessionAge > maxAge) {
                localStorage.removeItem('arabicVocabSession');
                return;
            }

            
            const shouldRestore = confirm(
                'Une session de révision interrompue a été détectée.\n\n' +
                'Voulez-vous reprendre où vous vous êtes arrêté(e) ?'
            );

            if (!shouldRestore) {
                localStorage.removeItem('arabicVocabSession');
                return;
            }

            this.doRestoreSession(sessionData);
        } catch (error) {
            console.error('Erreur lors de la restauration de session:', error);
            localStorage.removeItem('arabicVocabSession');
        }
    }

    
    doRestoreSession(sessionData) {
        console.log('Restauration de la session...');

        
        this.currentType = sessionData.currentType;
        this.reverseMode = sessionData.reverseMode;
        this.autoAudioMode = sessionData.autoAudioMode;
        
        
        this.isIntensiveReview = sessionData.isIntensiveReview;
        this.isOldWordsReview = sessionData.isOldWordsReview;
        this.isNumbersReview = sessionData.isNumbersReview;
        this.isOldWordsMainSession = sessionData.isOldWordsMainSession;
        
        
        this.filteredData = sessionData.filteredData || [];
        this.selectedFilters.parties = new Set(sessionData.selectedFilters?.parties || []);
        this.customSelectedWords = new Set(sessionData.customSelectedWords || []);
        this.numbersData = sessionData.numbersData || [];
        
        
        this.oldWordsList1 = sessionData.oldWordsList1 || [];
        this.oldWordsList2 = sessionData.oldWordsList2 || [];
        this.oldWordsList3 = sessionData.oldWordsList3 || [];
        
        
        if (sessionData.srsState) {
            this.srs.cards = sessionData.srsState.cards || [];
            this.srs.remainingCards = sessionData.srsState.remainingCards || [];
            this.srs.currentSessionCards = sessionData.srsState.currentSessionCards || [];
            this.srs.currentCardIndex = sessionData.srsState.currentCardIndex || 0;
            this.srs.sessionStats = sessionData.srsState.sessionStats || {
                correct: 0, difficult: 0, incorrect: 0, total: 0, totalAttempts: 0
            };
            this.srs.isCardRevealed = sessionData.srsState.isCardRevealed || false;
        }

        
        this.restoreInterface(sessionData);
        
        
        this.showScreen(sessionData.currentScreen || 'revision');
        
        console.log('Session restaurée avec succès');
    }

    
    restoreInterface(sessionData) {
        
        if (this.elements.reverseModeToggle) {
            this.elements.reverseModeToggle.checked = this.reverseMode;
        }
        if (this.elements.autoAudioToggle) {
            this.elements.autoAudioToggle.checked = this.autoAudioMode;
        }

        
        if (sessionData.currentCardData && sessionData.currentScreen === 'revision') {
            this.restoreCardDisplay(sessionData.currentCardData);
        }

        
        this.updateSessionStats();
    }

    
    restoreCardDisplay(cardData) {
        if (!cardData) return;

        this.elements.arabicText.textContent = cardData.arabicText || '';
        this.elements.translationText.textContent = cardData.translationText || '';
        this.elements.cardType.textContent = cardData.cardType || '';
        this.elements.additionalInfo.textContent = cardData.additionalInfo || '';
        this.elements.progressText.textContent = cardData.progressText || '';

        
        if (cardData.isRevealed) {
            this.elements.cardBack.classList.remove('hidden');
            this.elements.revealBtn.classList.add('hidden');
            this.elements.answerButtons.classList.remove('hidden');
        } else {
            this.elements.cardBack.classList.add('hidden');
            this.elements.revealBtn.classList.remove('hidden');
            this.elements.answerButtons.classList.add('hidden');
        }

        
        this.updateProgressBar();
    }

    
    startDifficultCardsReview() {
        
        const allCards = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        
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

        
        const difficultCardsCount = this.srs.initializeDifficultCardsSession(cardsWithIds);
        
        
        console.log('Cartes avec progression:', cardsWithIds.length);
        console.log('Cartes difficiles trouvées:', difficultCardsCount);
        if (cardsWithIds.length > 0) {
            console.log('Exemple de progression:', cardsWithIds[0].progress);
        }
        
        if (difficultCardsCount === 0) {
            alert('Aucune carte difficile trouvée !\n\nSeules les cartes avec plus de 50% d\'échec sont considérées comme difficiles.\nCommencez quelques révisions pour accumuler des données ou révisez des cartes que vous avez déjà ratées.');
            return;
        }

        
        this.srs.cards = [];
        this.srs.remainingCards.forEach(card => {
            this.srs.addCard({...card});
        });

        
        this.filteredData = this.srs.remainingCards;
        
        
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        
        this.isIntensiveReview = true;

        this.showScreen('revision');
        this.showNextCard();
    }

    
    startDifficultCardsReviewFromResults() {
        this.startDifficultCardsReview();
    }

    
    initializeOldWordsListSystem() {
        
        const allCards = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        
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

        
        this.oldWordsList1 = this.srs.getOldCards(cardsWithIds, 1000); 
        
        
        this.oldWordsList2 = [];
        
        
        this.oldWordsList3 = [];
        
        return this.oldWordsList1.length;
    }

    
    startOldWordsReview() {
        
        const totalOldWords = this.initializeOldWordsListSystem();
        
        if (totalOldWords === 0) {
            const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000));
            alert(`Aucun mot ancien trouvé !\n\nSeuls les mots non révisés depuis plus de 3 jours (avant le ${threeDaysAgo.toLocaleDateString('fr-FR')}) sont considérés comme anciens.\n\nContinuez vos révisions pour que certains mots deviennent "anciens" et nécessitent une révision de mémorisation à long terme.`);
            return;
        }

        
        this.prepareNextOldWordsSeries();
    }

    
    prepareNextOldWordsSeries() {
        if (this.oldWordsList1.length === 0) {
            
            alert('Tous les mots anciens ont été révisés ! Retour au menu.');
            this.showScreen('selection');
            return;
        }

        
        const wordsToTake = Math.min(7, this.oldWordsList1.length);
        this.oldWordsList2 = this.oldWordsList1.splice(0, wordsToTake);
        
        
        this.oldWordsList2 = this.srs.shuffleArray(this.oldWordsList2);
        
        
        this.oldWordsList3 = [];
        
        
        this.srs.cards = [];
        this.srs.remainingCards = [...this.oldWordsList2];
        this.srs.currentSessionCards = [];
        this.srs.currentCardIndex = 0;
        
        this.oldWordsList2.forEach(card => {
            this.srs.addCard({...card});
        });

        
        this.filteredData = this.oldWordsList2;
        this.totalOldWordsAvailable = this.oldWordsList2.length;
        
        
        this.srs.sessionStats = {
            correct: 0,
            difficult: 0,
            incorrect: 0,
            total: 0,
            totalAttempts: 0
        };

        
        this.isOldWordsReview = true;
        this.isOldWordsMainSession = true; 

        this.showScreen('revision');
        this.showNextCard();
    }

    
    startOldWordsReviewFromResults() {
        this.startOldWordsReview();
    }

    
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

    
    updateStatsDisplay() {
        const progress = this.srs.progress;
        let totalAttempts = 0;
        let totalSuccesses = 0;
        let totalFailures = 0;
        let difficultCards = 0;
        let masteredCards = 0;

        
        Object.values(progress).forEach(cardProgress => {
            totalAttempts += cardProgress.attempts;
            totalSuccesses += cardProgress.successes;
            totalFailures += cardProgress.failures;

            
            if (cardProgress.attempts > 0) {
                const failureRate = cardProgress.failures / cardProgress.attempts;
                if (failureRate > 0.5) {
                    difficultCards++;
                }
            }

            
            if (cardProgress.attempts >= 5) {
                const successRate = cardProgress.successes / cardProgress.attempts;
                if (successRate > 0.8) {
                    masteredCards++;
                }
            }
        });

        
        const successRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;

        
        this.elements.totalAttempts.textContent = totalAttempts;
        this.elements.totalSuccesses.textContent = totalSuccesses;
        this.elements.totalFailures.textContent = totalFailures;
        this.elements.successRate.textContent = `${successRate}%`;
        this.elements.difficultCards.textContent = difficultCards;
        this.elements.masteredCards.textContent = masteredCards;
    }

    
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
            
            this.srs.progress = {};
            this.srs.saveProgress();
            
            
            if (this.vocabularyData.mots.length > 0 || this.vocabularyData.verbes.length > 0) {
                this.srs.cards = [];
                [...this.vocabularyData.mots, ...this.vocabularyData.verbes].forEach(card => {
                    this.srs.addCard({...card});
                });
            }

            
            this.updateStatsDisplay();

            alert('✅ Statistiques réinitialisées avec succès !');
        }
    }

    
    
    

    
    playArabicAudio() {
        const card = this.srs.getCurrentCard();
        if (!card) return;

        
        const textToSpeak = card.arabic;
        const voiceName = 'Arabic Male';
        const language = 'ar-SA';

        this.playAudio(textToSpeak, voiceName, language, this.elements.arabicAudioBtn);
    }

    
    playAudio(text, voiceName, language, buttonElement) {
        
        if (typeof responsiveVoice === 'undefined') {
            console.warn('ResponsiveVoice n\'est pas chargé. Utilisez votre propre clé API.');
            alert('🔊 Fonctionnalité audio non disponible.\nVeuillez obtenir une clé API ResponsiveVoice et la configurer.');
            return;
        }

        
        responsiveVoice.cancel();

        
        buttonElement.classList.add('playing');

        
        responsiveVoice.speak(text, voiceName, {
            rate: 0.8, 
            pitch: 1, 
            volume: 1, 
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
                
                this.playAudioFallback(text, language, buttonElement);
            }
        });
    }

    
    playAudioFallback(text, language, buttonElement) {
        let fallbackVoice;
        
        if (language.startsWith('ar')) {
            
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

    
    
    

    
    initializeCustomSelection() {
        
        this.customSelectedWords.clear();
        this.elements.customTypeSelect.value = '';
        this.elements.customThemeSelect.value = '';
        this.elements.customThemeContainer.classList.add('hidden');
        this.elements.customWordsContainer.classList.add('hidden');
        this.elements.startCustomBtn.disabled = true;
        this.updateCustomSelectionCount();
    }

    
    handleCustomTypeChange() {
        const selectedType = this.elements.customTypeSelect.value;
        
        if (!selectedType) {
            this.elements.customThemeContainer.classList.add('hidden');
            this.elements.customWordsContainer.classList.add('hidden');
            return;
        }

        
        this.elements.customThemeContainer.classList.remove('hidden');
        this.populateCustomThemes(selectedType);
        
        
        this.elements.customWordsContainer.classList.add('hidden');
        this.customSelectedWords.clear();
        this.updateCustomSelectionCount();
    }

    
    populateCustomThemes(type) {
        const data = this.vocabularyData[type];
        const themes = new Set();
        
        data.forEach(item => {
            const themeKey = `${item.niveau} - ${item.thematique}`;
            themes.add(themeKey);
        });

        
        this.elements.customThemeSelect.innerHTML = '<option value="">-- Choisir une thématique --</option>';
        
        Array.from(themes).sort().forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme;
            this.elements.customThemeSelect.appendChild(option);
        });
    }

    
    handleCustomThemeChange() {
        const selectedType = this.elements.customTypeSelect.value;
        const selectedTheme = this.elements.customThemeSelect.value;
        
        if (!selectedType || !selectedTheme) {
            this.elements.customWordsContainer.classList.add('hidden');
            return;
        }

        
        this.elements.customWordsContainer.classList.remove('hidden');
        this.populateCustomWords(selectedType, selectedTheme);
        
        
        this.customSelectedWords.clear();
        this.updateCustomSelectionCount();
    }

    
    populateCustomWords(type, theme) {
        const [niveau, thematique] = theme.split(' - ');
        const data = this.vocabularyData[type].filter(item => 
            item.niveau === niveau && item.thematique === thematique
        );

        
        this.elements.customWordsGrid.innerHTML = '';

        
        data.forEach(word => {
            const wordCheckbox = this.createCustomWordCheckbox(word);
            this.elements.customWordsGrid.appendChild(wordCheckbox);
        });
    }

    
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

    
    handleCustomWordChange(word, checked) {
        const wordId = this.srs.generateCardId(word);
        
        if (checked) {
            this.customSelectedWords.add(wordId);
        } else {
            this.customSelectedWords.delete(wordId);
        }
        
        this.updateCustomSelectionCount();
    }

    
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

    
    startCustomRevision() {
        if (this.customSelectedWords.size === 0) {
            alert('Veuillez sélectionner au moins un mot !');
            return;
        }

        
        const allWords = [...this.vocabularyData.mots, ...this.vocabularyData.verbes];
        
        
        this.filteredData = allWords.filter(word => {
            const wordId = this.srs.generateCardId(word);
            return this.customSelectedWords.has(wordId);
        });

        console.log('Mots sélectionnés pour révision personnalisée:', this.filteredData.length);

        
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        
        this.srs.resetSession();

        
        this.isIntensiveReview = false;

        this.showScreen('revision');
        this.showNextCard();
    }

    
    restartCurrentSession() {
        
        if (this.isIntensiveReview) {
            
            this.startDifficultCardsReview();
        } else if (this.isOldWordsReview) {
            
            this.startOldWordsReview();
        } else if (this.isNumbersReview) {
            
            this.startNumbersReview();
        } else if (this.customSelectedWords && this.customSelectedWords.size > 0) {
            
            this.startCustomRevision();
        } else {
            
            this.startRevision();
        }
    }

    
    
    

    
    updateNumbersPreview() {
        const difficulty = this.elements.numbersDifficulty.value;
        const count = this.elements.numbersCount.value;
        
        
        const exampleNumber = this.arabicNumbers.generateRandomNumber(difficulty);
        const arabicDisplay = this.arabicNumbers.toArabic(exampleNumber);
        
        
        document.getElementById('preview-number').textContent = arabicDisplay;
        document.querySelector('.french-number').textContent = exampleNumber;
        
        
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

    
    startNumbersReview() {
        const difficulty = this.elements.numbersDifficulty.value;
        const count = parseInt(this.elements.numbersCount.value);
        
        
        this.numbersData = this.arabicNumbers.generateNumberSet(difficulty, count);
        
        
        this.filteredData = this.numbersData.map(item => ({
            id: `number_${item.western}`,
            type: 'numbers',
            arabic: item.arabic,
            translation: item.western.toString(),
            niveau: 'Chiffres',
            thematique: 'Nombres arabes',
            partie: difficulty === 'mixed' ? 'Mélange' : `${difficulty} chiffre${difficulty > 1 ? 's' : ''}`
        }));

        
        this.srs.cards = [];
        this.filteredData.forEach(item => this.srs.addCard(item));
        
        
        this.srs.resetSession();

        
        this.isNumbersReview = true;

        console.log('Démarrage de l\'entraînement aux chiffres:', this.filteredData.length, 'chiffres');

        this.showScreen('revision');
        this.showNextCard();
    }

    
    handleFailedWordsRepetitionEnd() {
        
        this.oldWordsList3 = [];
        
        
        this.showScreen('results');
        
        
        setTimeout(() => {
            if (this.oldWordsList1.length > 0) {
                const message = `Répétition terminée !\n\nIl reste ${this.oldWordsList1.length} mot(s) ancien(s) à réviser.\n\nVoulez-vous continuer avec une nouvelle série de 7 mots ?`;
                if (confirm(message)) {
                    this.prepareNextOldWordsSeries();
                } else {
                    
                    this.addContinueSeriesButton();
                }
            } else {
                alert('Félicitations ! Tous les mots anciens ont été révisés.\n\nRetour au menu principal.');
            }
        }, 100);
    }

    
    addContinueSeriesButton() {
        
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
            
            
            const returnBtn = resultsActions.querySelector('button:last-child');
            resultsActions.insertBefore(continueBtn, returnBtn);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new VocabApp();
});
