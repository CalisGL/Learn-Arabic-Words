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
        this.userPrefix = 'default'; // Préfixe utilisateur pour la sauvegarde
        this.loadProgress();
    }

    // Charge les données de progression depuis le localStorage
    loadProgress() {
        const storageKey = `arabicVocabProgress_${this.userPrefix}`;
        const saved = localStorage.getItem(storageKey);
        this.progress = saved ? JSON.parse(saved) : {};
    }

    // Sauvegarde la progression
    saveProgress() {
        const storageKey = `arabicVocabProgress_${this.userPrefix}`;
        localStorage.setItem(storageKey, JSON.stringify(this.progress));
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
        this.currentUser = null;

        // Initialiser le gestionnaire GitHub
        // REMPLACEZ 'VOTRE_USERNAME' et 'VOTRE_REPO' par vos vraies valeurs
        this.githubManager = new GitHubUserManager('VOTRE_USERNAME', 'VOTRE_REPO');

        this.initializeElements();
        this.loadVocabularyData();
        this.setupEventListeners();
        this.checkLoginStatus();
    }

    // Initialise les éléments DOM
    initializeElements() {
        this.screens = {
            login: document.getElementById('login-screen'),
            selection: document.getElementById('selection-screen'),
            revision: document.getElementById('revision-screen'),
            results: document.getElementById('results-screen')
        };

        this.elements = {
            // Éléments de connexion
            usernameInput: document.getElementById('username'),
            loginBtn: document.getElementById('login-btn'),
            recentUsers: document.getElementById('recent-users'),
            userList: document.getElementById('user-list'),
            userInfo: document.getElementById('user-info'),
            currentUsername: document.getElementById('current-username'),
            logoutBtn: document.getElementById('logout-btn'),
            header: document.querySelector('.header'),
            
            // Éléments existants
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

    // Vérifie l'état de connexion au démarrage
    checkLoginStatus() {
        const savedUser = localStorage.getItem('currentUser');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        if (savedUser) {
            this.currentUser = savedUser;
            this.isAdmin = isAdmin;
            this.showLoggedInState();
        } else {
            this.showLoginScreen();
        }
        this.loadRecentUsers();
    }

    // Affiche l'état connecté
    showLoggedInState() {
        this.elements.currentUsername.textContent = this.currentUser;
        this.elements.userInfo.style.display = 'flex';
        this.elements.header.classList.add('logged-in');
        
        // Ajouter le bouton admin si administrateur
        if (this.isAdmin) {
            this.addAdminButton();
        }
        
        this.showScreen('selection');
        
        // Adapter la sauvegarde pour l'utilisateur actuel
        this.srs.userPrefix = this.currentUser;
    }

    // Affiche l'écran de connexion
    showLoginScreen() {
        this.elements.userInfo.style.display = 'none';
        this.elements.header.classList.remove('logged-in');
        this.showScreen('login');
    }

    // Charge les utilisateurs récents
    loadRecentUsers() {
        const recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        if (recentUsers.length > 0) {
            this.elements.recentUsers.style.display = 'block';
            this.elements.userList.innerHTML = '';
            
            recentUsers.slice(0, 5).forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                const username = typeof user === 'string' ? user : user.name;
                userItem.innerHTML = `
                    <span class="user-icon">👤</span>
                    <span>${username}</span>
                `;
                userItem.onclick = () => this.selectUser(username);
                this.elements.userList.appendChild(userItem);
            });
        }
    }

    // Sélectionne un utilisateur depuis la liste récente
    selectUser(username) {
        this.elements.usernameInput.value = username;
        this.elements.loginBtn.disabled = false;
    }

    // Sauvegarde un utilisateur dans la liste récente
    saveRecentUser(username) {
        let recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        
        // Supprimer l'utilisateur s'il existe déjà
        recentUsers = recentUsers.filter(user => user.name !== username);
        
        // Ajouter en première position avec la date
        recentUsers.unshift({
            name: username,
            lastLogin: Date.now()
        });
        
        // Garder seulement les 5 derniers
        recentUsers = recentUsers.slice(0, 5);
        
        localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
    }

    // Connexion de l'utilisateur
    async login() {
        const username = this.elements.usernameInput.value.trim();
        if (!username) return;
        
        // Vérifier si c'est le code admin
        if (username === 'Liska91240!') {
            this.currentUser = 'Administrateur';
            this.isAdmin = true;
            localStorage.setItem('currentUser', 'Administrateur');
            localStorage.setItem('isAdmin', 'true');
            this.showLoggedInState();
            this.showAdminPanel();
            return;
        }
        
        // Effacer les messages d'erreur précédents
        this.clearLoginError();
        
        // Afficher un indicateur de chargement
        const originalText = this.elements.loginBtn.querySelector('span').textContent;
        this.elements.loginBtn.querySelector('span').textContent = 'Vérification...';
        this.elements.loginBtn.disabled = true;
        
        try {
            // Vérifier si l'utilisateur existe
            const exists = await this.userExists(username);
            if (!exists) {
                this.showLoginError(`L'utilisateur "${username}" n'existe pas. Contactez l'administrateur pour créer un compte.`);
                return;
            }
            
            // Mettre à jour la dernière connexion
            await this.githubManager.updateLastLogin(username);
            
            this.currentUser = username;
            this.isAdmin = false;
            localStorage.setItem('currentUser', username);
            localStorage.removeItem('isAdmin');
            this.saveRecentUser(username);
            this.showLoggedInState();
        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            this.showLoginError('Erreur de connexion. Vérifiez votre connexion internet.');
        } finally {
            // Restaurer le bouton
            this.elements.loginBtn.querySelector('span').textContent = originalText;
            this.elements.loginBtn.disabled = false;
        }
    }

    // Déconnexion
    logout() {
        this.currentUser = null;
        this.isAdmin = false;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isAdmin');
        this.showLoginScreen();
        
        // Réinitialiser l'application
        this.currentType = null;
        this.selectedFilters.parties.clear();
        if (this.elements.filters) {
            this.elements.filters.classList.add('hidden');
        }
        
        // Supprimer le bouton admin s'il existe
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.remove();
        }
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
أَهْلًا وَسَهْلًا;;Bienvenue
صَبَاحُ الْخَيْرِ;;Bonjour
مَسَاءُ الْخَيْرِ;;Bonsoir
لَيْلَةٌ سَعِيدَةٌ;;Bonne nuit
تَصْبَحُ عَلَى خَيْرٍ;;Bonne nuit
إِلَى اللِّقَاءِ;;À la prochaine
أَرَاكَ غَدًا;;Je te vois demain
أَرَاكَ لاَحِقًا;;Je te vois plus tard
أَرَاكَ قَرِيبًا;;Je te vois bientôt
نَلْتَقِي فِيمَا بَعْدُ;;On se voit plus tard
مَعَ السَّلَامَةِ;;Au revoir
فِي أَمَانِ اللَّهِ;;Sous la protection d'Allah
وَدَاعًا;;À dieu
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
        // Écouteurs de connexion
        this.elements.usernameInput.addEventListener('input', () => {
            const username = this.elements.usernameInput.value.trim();
            this.elements.loginBtn.disabled = username.length === 0;
        });

        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.loginBtn.disabled) {
                this.login();
            }
        });

        this.elements.loginBtn.addEventListener('click', () => this.login());
        this.elements.logoutBtn.addEventListener('click', () => this.logout());

        // Sélection du type
        this.elements.typeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.selectType(btn.dataset.type));
        });

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
                    <div><strong>الترجمة :</strong> ${card.translation}</div>
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

    // ===== ADMINISTRATION =====
    
    // Ajoute le bouton admin dans l'interface
    addAdminButton() {
        // Éviter les doublons
        if (document.getElementById('admin-btn')) return;
        
        const adminBtn = document.createElement('button');
        adminBtn.id = 'admin-btn';
        adminBtn.className = 'admin-btn';
        adminBtn.innerHTML = '⚙️ Admin';
        adminBtn.title = 'Panneau d\'administration';
        adminBtn.onclick = () => this.showAdminPanel();
        
        this.elements.userInfo.appendChild(adminBtn);
    }

    // Affiche le panneau d'administration
    async showAdminPanel() {
        try {
            const users = await this.getAllUsers();
            
            // Debug : afficher le contenu
            console.log('=== DEBUG ADMIN PANEL ===');
            console.log('Utilisateurs trouvés:', users);
            console.log('Source: GitHub + localStorage fallback');
            
            const overlay = document.createElement('div');
            overlay.id = 'admin-overlay';
            overlay.className = 'admin-overlay';
            
            overlay.innerHTML = `
                <div class="admin-panel">
                    <div class="admin-header">
                        <h2>🔧 Panneau d'Administration</h2>
                        <button class="close-btn" onclick="closeAdminPanel()">✕</button>
                    </div>
                    
                    <div class="admin-content">
                        <div class="admin-section">
                            <h3>👥 Gestion des Utilisateurs (${users.length})</h3>
                            <div class="admin-actions">
                                <button class="admin-btn create-user" onclick="showCreateUserForm()">
                                    ➕ Créer un utilisateur
                                </button>
                            </div>
                            <div class="users-list" id="admin-users-list">
                                ${this.generateUsersHTML(users)}
                            </div>
                        </div>
                        
                        <div class="admin-section">
                            <h3>📊 Statistiques Globales</h3>
                            <div class="stats-grid">
                                ${this.generateStatsHTML(users)}
                            </div>
                        </div>
                        
                        <div class="admin-section">
                            <h3>🔍 Debug Info</h3>
                            <div class="debug-info">
                                <p><strong>Clés dans localStorage:</strong> ${Object.keys(localStorage).length}</p>
                                <p><strong>Clés de progression:</strong> ${Object.keys(localStorage).filter(k => k.startsWith('arabicVocabProgress_')).length}</p>
                                <p><strong>Utilisateurs récents:</strong> ${JSON.parse(localStorage.getItem('recentUsers') || '[]').length}</p>
                                <details>
                                    <summary>Voir toutes les clés</summary>
                                    <pre style="font-size: 0.8rem; max-height: 150px; overflow-y: auto;">${Object.keys(localStorage).join('\\n')}</pre>
                                </details>
                            </div>
                        </div>
                        
                        <div class="admin-section danger-zone">
                            <h3>⚠️ Zone Dangereuse</h3>
                            <button class="danger-btn" onclick="confirmClearAll()">
                                🗑️ Supprimer TOUS les comptes
                            </button>
                        </div>
                    </div>
                    
                    <div class="admin-footer">
                        <button class="admin-btn secondary" onclick="closeAdminPanel()">Fermer</button>
                        <button class="admin-btn primary" onclick="refreshAdminPanel()">🔄 Actualiser</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            // Fermer avec Escape
            document.addEventListener('keydown', this.handleAdminKeydown.bind(this));
        } catch (error) {
            console.error('Erreur lors de l\'affichage du panneau admin:', error);
            alert('Erreur lors du chargement du panneau d\'administration');
        }
    }

    // Génère le HTML pour la liste des utilisateurs
    generateUsersHTML(users) {
        if (users.length === 0) {
            return '<div class="no-users">Aucun utilisateur trouvé</div>';
        }
        
        return users.map(user => {
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Jamais';
            const progressData = this.getUserProgress(user.name);
            
            return `
                <div class="user-card">
                    <div class="user-info">
                        <div class="user-name">👤 ${user.name}</div>
                        <div class="user-details">
                            <span>Dernière connexion: ${lastLogin}</span>
                            <span>Progrès: ${progressData.totalAttempts} tentatives</span>
                            <span>Réussite: ${progressData.successRate}%</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        <button class="action-btn view" onclick="viewUserDetails('${user.name}')">👁️ Voir</button>
                        <button class="action-btn delete" onclick="confirmDeleteUser('${user.name}')">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Génère le HTML pour les statistiques
    generateStatsHTML(users) {
        const totalUsers = users.length;
        const totalAttempts = users.reduce((sum, user) => {
            const progress = this.getUserProgress(user.name);
            return sum + progress.totalAttempts;
        }, 0);
        
        const activeUsers = users.filter(user => {
            return user.lastLogin && (Date.now() - user.lastLogin) < (7 * 24 * 60 * 60 * 1000); // 7 jours
        }).length;
        
        return `
            <div class="stat-card">
                <div class="stat-number">${totalUsers}</div>
                <div class="stat-label">Utilisateurs total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${activeUsers}</div>
                <div class="stat-label">Actifs (7j)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalAttempts}</div>
                <div class="stat-label">Tentatives total</div>
            </div>
        `;
    }

    // Récupère tous les utilisateurs
    async getAllUsers() {
        try {
            // Essayer de récupérer depuis GitHub
            const gitHubUsers = await this.githubManager.getAllUsers();
            return gitHubUsers;
        } catch (error) {
            console.error('Erreur GitHub, utilisation localStorage:', error);
            
            // Fallback vers localStorage
            const users = [];
            const recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
            const foundUsers = new Set();
            
            // Scanner le localStorage pour tous les utilisateurs avec des données de progression
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('arabicVocabProgress_')) {
                    const username = key.replace('arabicVocabProgress_', '');
                    if (username !== 'Administrateur' && username !== 'default') {
                        foundUsers.add(username);
                    }
                }
            });
            
            // Ajouter les utilisateurs trouvés dans le localStorage avec leurs dernières connexions
            foundUsers.forEach(username => {
                const recentUser = recentUsers.find(u => {
                    const userName = typeof u === 'string' ? u : u.name;
                    return userName === username;
                });
                
                users.push({
                    name: username,
                    lastLogin: recentUser && typeof recentUser === 'object' ? recentUser.lastLogin : null
                });
            });
            
            // Ajouter les utilisateurs récents qui n'ont pas encore de données de progression
            recentUsers.forEach(user => {
                const username = typeof user === 'string' ? user : user.name;
                if (username !== 'Administrateur' && !foundUsers.has(username)) {
                    users.push({
                        name: username,
                        lastLogin: typeof user === 'object' ? user.lastLogin : null
                    });
                }
            });
            
            return users.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
        }
    }

    // Récupère les statistiques d'un utilisateur
    getUserProgress(username) {
        return this.githubManager.getUserProgress(username);
    }

    // Ferme le panneau admin
    closeAdminPanel() {
        const overlay = document.getElementById('admin-overlay');
        if (overlay) {
            overlay.remove();
        }
        document.removeEventListener('keydown', this.handleAdminKeydown);
    }

    // Gère les touches dans le panneau admin
    handleAdminKeydown(e) {
        if (e.key === 'Escape') {
            this.closeAdminPanel();
        }
    }

    // Actualise le panneau admin
    refreshAdminPanel() {
        this.closeAdminPanel();
        this.showAdminPanel();
    }

    // Confirme la suppression d'un utilisateur
    confirmDeleteUser(username) {
        console.log('=== DEBUG SUPPRESSION ===');
        console.log('Tentative de suppression de:', username);
        console.log('Clé de progression à supprimer:', `arabicVocabProgress_${username}`);
        console.log('Existe dans localStorage:', localStorage.getItem(`arabicVocabProgress_${username}`) !== null);
        
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?\n\nCette action est irréversible.`)) {
            this.deleteUser(username);
        }
    }

    // Supprime un utilisateur
    deleteUser(username) {
        console.log('=== SUPPRESSION EN COURS ===');
        console.log('Suppression de l\'utilisateur:', username);
        
        // Supprimer les données de progression
        const progressKey = `arabicVocabProgress_${username}`;
        const existsBefore = localStorage.getItem(progressKey) !== null;
        localStorage.removeItem(progressKey);
        const existsAfter = localStorage.getItem(progressKey) !== null;
        
        console.log('Données de progression supprimées:', existsBefore, '→', existsAfter);
        
        // Supprimer de la liste des utilisateurs récents
        let recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        console.log('Utilisateurs récents avant:', recentUsers);
        
        recentUsers = recentUsers.filter(user => {
            const userName = typeof user === 'string' ? user : user.name;
            return userName !== username;
        });
        
        localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
        console.log('Utilisateurs récents après:', recentUsers);
        
        alert(`Utilisateur "${username}" supprimé avec succès !`);
        this.refreshAdminPanel();
    }

    // Confirme la suppression de tous les comptes
    confirmClearAll() {
        const confirmation = prompt('Pour confirmer la suppression de TOUS les comptes, tapez exactement:\nSUPPRIMER TOUT');
        
        if (confirmation === 'SUPPRIMER TOUT') {
            this.clearAllUsers();
        } else if (confirmation !== null) {
            alert('Confirmation incorrecte. Suppression annulée.');
        }
    }

    // Supprime tous les utilisateurs
    clearAllUsers() {
        let deletedCount = 0;
        
        // Supprimer tous les comptes (sauf admin)
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('arabicVocabProgress_') && !key.includes('Administrateur')) {
                localStorage.removeItem(key);
                deletedCount++;
            }
        });
        
        // Vider la liste des utilisateurs récents
        localStorage.setItem('recentUsers', '[]');
        
        alert(`${deletedCount} compte(s) supprimé(s) avec succès !`);
        this.refreshAdminPanel();
    }

    // Affiche les détails d'un utilisateur
    viewUserDetails(username) {
        const progress = this.getUserProgress(username);
        const progressData = JSON.parse(localStorage.getItem(`arabicVocabProgress_${username}`) || '{}');
        
        let detailsHTML = `
            <div class="user-details-modal">
                <h3>📊 Détails - ${username}</h3>
                <div class="details-stats">
                    <p><strong>Cartes étudiées:</strong> ${progress.cardsCount}</p>
                    <p><strong>Tentatives totales:</strong> ${progress.totalAttempts}</p>
                    <p><strong>Réussites:</strong> ${progress.totalSuccesses}</p>
                    <p><strong>Taux de réussite:</strong> ${progress.successRate}%</p>
                </div>
                
                <h4>Cartes les plus difficiles:</h4>
                <div class="difficult-cards">
        `;
        
        // Trouver les cartes les plus difficiles
        const cards = Object.entries(progressData)
            .map(([id, data]) => ({
                id: id.split('_').pop(), // Dernière partie de l'ID
                failures: data.failures || 0,
                attempts: data.attempts || 0,
                failureRate: data.attempts > 0 ? Math.round((data.failures / data.attempts) * 100) : 0
            }))
            .filter(card => card.attempts > 0)
            .sort((a, b) => b.failureRate - a.failureRate)
            .slice(0, 5);
            
        if (cards.length > 0) {
            cards.forEach(card => {
                detailsHTML += `<p>• ${card.id} - ${card.failureRate}% d'échecs (${card.failures}/${card.attempts})</p>`;
            });
        } else {
            detailsHTML += '<p>Aucune donnée disponible</p>';
        }
        
        detailsHTML += `
                </div>
                <button onclick="closeUserDetails()" class="close-details-btn">Fermer</button>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'user-details-modal';
        modal.className = 'user-details-overlay';
        modal.innerHTML = detailsHTML;
        document.body.appendChild(modal);
    }

    // Ferme les détails utilisateur
    closeUserDetails() {
        const modal = document.getElementById('user-details-modal');
        if (modal) {
            modal.remove();
        }
    }

    // ===== GESTION DES UTILISATEURS =====
    
    // Vérifie si un utilisateur existe
    async userExists(username) {
        return await this.githubManager.userExists(username);
    }
    
    // Affiche un message d'erreur de connexion
    showLoginError(message) {
        // Supprimer le message précédent s'il existe
        this.clearLoginError();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'login-error';
        errorDiv.id = 'login-error';
        errorDiv.textContent = message;
        
        // Insérer après le bouton de connexion
        const loginBtn = this.elements.loginBtn;
        loginBtn.parentNode.insertBefore(errorDiv, loginBtn.nextSibling);
        
        // Auto-effacement après 5 secondes
        setTimeout(() => {
            this.clearLoginError();
        }, 5000);
    }
    
    // Efface le message d'erreur de connexion
    clearLoginError() {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Affiche le formulaire de création d'utilisateur
    showCreateUserForm() {
        const formHTML = `
            <div class="create-user-form" id="create-user-form">
                <h4>➕ Créer un nouvel utilisateur</h4>
                <div class="form-row">
                    <label for="new-username">Nom d'utilisateur :</label>
                    <input type="text" id="new-username" placeholder="Nom d'utilisateur..." maxlength="30">
                </div>
                <div class="form-actions">
                    <button class="admin-btn secondary" onclick="hideCreateUserForm()">Annuler</button>
                    <button class="admin-btn primary" onclick="createNewUser()">Créer</button>
                </div>
                <div id="create-user-error" class="create-user-error" style="display: none;"></div>
            </div>
        `;
        
        // Ajouter le formulaire après les actions
        const actionsDiv = document.querySelector('.admin-actions');
        if (actionsDiv) {
            actionsDiv.insertAdjacentHTML('afterend', formHTML);
            document.getElementById('new-username').focus();
        }
    }
    
    // Cache le formulaire de création d'utilisateur
    hideCreateUserForm() {
        const form = document.getElementById('create-user-form');
        if (form) {
            form.remove();
        }
    }
    
    // Crée un nouvel utilisateur
    async createNewUser() {
        const usernameInput = document.getElementById('new-username');
        const errorDiv = document.getElementById('create-user-error');
        const username = usernameInput.value.trim();
        
        console.log('🔧 Création utilisateur:', username);
        
        // Validation
        if (!username) {
            this.showCreateUserError('Veuillez saisir un nom d\'utilisateur');
            return;
        }
        
        if (username.length < 2) {
            this.showCreateUserError('Le nom d\'utilisateur doit contenir au moins 2 caractères');
            return;
        }
        
        if (username === 'Liska91240!' || username === 'Administrateur') {
            this.showCreateUserError('Ce nom d\'utilisateur est réservé');
            return;
        }
        
        // Vérifier si l'utilisateur existe déjà
        try {
            console.log('🔧 Vérification existence utilisateur...');
            const exists = await this.userExists(username);
            console.log('🔧 Utilisateur existe:', exists);
            
            if (exists) {
                this.showCreateUserError(`L'utilisateur "${username}" existe déjà`);
                return;
            }
            
            // Créer l'utilisateur
            console.log('🔧 Création de l\'utilisateur...');
            this.createUser(username);
        } catch (error) {
            console.error('Erreur lors de la vérification utilisateur:', error);
            this.showCreateUserError('Erreur lors de la vérification. Réessayez.');
        }
    }
    
    // Crée un utilisateur avec les données initiales
    createUser(username) {
        // Créer une entrée vide de progression pour marquer l'existence
        localStorage.setItem(`arabicVocabProgress_${username}`, '{}');
        
        // Ajouter à la liste des utilisateurs récents
        let recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        
        // Supprimer s'il existe déjà
        recentUsers = recentUsers.filter(user => {
            const userName = typeof user === 'string' ? user : user.name;
            return userName !== username;
        });
        
        // Ajouter le nouvel utilisateur
        recentUsers.unshift({
            name: username,
            lastLogin: Date.now()
        });
        
        // Garder seulement les 10 derniers (plus large pour les admins)
        recentUsers = recentUsers.slice(0, 10);
        
        localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
        
        // Masquer le formulaire et actualiser
        this.hideCreateUserForm();
        alert(`Utilisateur "${username}" créé avec succès !`);
        this.refreshAdminPanel();
    }
    
    // Affiche une erreur de création d'utilisateur
    showCreateUserError(message) {
        const errorDiv = document.getElementById('create-user-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Auto-effacement après 3 secondes
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    window.vocabApp = new VocabApp();
});

// Fonctions globales pour le panneau d'administration
window.closeAdminPanel = function() {
    if (window.vocabApp) {
        window.vocabApp.closeAdminPanel();
    }
};

window.refreshAdminPanel = function() {
    if (window.vocabApp) {
        window.vocabApp.refreshAdminPanel();
    }
};

window.confirmDeleteUser = function(username) {
    if (window.vocabApp) {
        window.vocabApp.confirmDeleteUser(username);
    }
};

window.confirmClearAll = function() {
    if (window.vocabApp) {
        window.vocabApp.confirmClearAll();
    }
};

window.viewUserDetails = function(username) {
    if (window.vocabApp) {
        window.vocabApp.viewUserDetails(username);
    }
};

window.closeUserDetails = function() {
    if (window.vocabApp) {
        window.vocabApp.closeUserDetails();
    }
};

window.showCreateUserForm = function() {
    if (window.vocabApp) {
        window.vocabApp.showCreateUserForm();
    }
};

window.hideCreateUserForm = function() {
    if (window.vocabApp) {
        window.vocabApp.hideCreateUserForm();
    }
};

window.createNewUser = async function() {
    if (window.vocabApp) {
        await window.vocabApp.createNewUser();
    }
};

window.showCreateUserForm = function() {
    if (window.vocabApp) {
        window.vocabApp.showCreateUserForm();
    }
};

window.hideCreateUserForm = function() {
    if (window.vocabApp) {
        window.vocabApp.hideCreateUserForm();
    }
};
// j