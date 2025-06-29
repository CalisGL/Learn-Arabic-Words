// Gestionnaire d'utilisateurs via GitHub
class GitHubUserManager {
    constructor(repoOwner, repoName) {
        this.repoOwner = repoOwner;
        this.repoName = repoName;
        this.apiBase = 'https://api.github.com';
        this.usersFile = 'users.json';
        this.cachedUsers = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.lastCacheTime = 0;
    }

    // Récupère le contenu du fichier users.json depuis GitHub
    async fetchUsersFromGitHub() {
        try {
            const now = Date.now();
            
            // Utiliser le cache si pas expiré
            if (this.cachedUsers && (now - this.lastCacheTime) < this.cacheExpiry) {
                return this.cachedUsers;
            }

            const response = await fetch(
                `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${this.usersFile}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Arabic-Vocab-App'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            
            // Mettre en cache
            this.cachedUsers = content;
            this.lastCacheTime = now;
            
            return content;
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            // Fallback vers localStorage en cas d'erreur
            return this.getFallbackUsers();
        }
    }

    // Fallback vers localStorage si GitHub n'est pas accessible
    getFallbackUsers() {
        const recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        return {
            users: recentUsers.map(user => ({
                name: typeof user === 'string' ? user : user.name,
                createdAt: typeof user === 'object' ? user.lastLogin : Date.now(),
                lastLogin: typeof user === 'object' ? user.lastLogin : Date.now(),
                progress: {}
            })),
            lastUpdated: Date.now()
        };
    }

    // Vérifie si un utilisateur existe
    async userExists(username) {
        try {
            const usersData = await this.fetchUsersFromGitHub();
            return usersData.users.some(user => user.name === username);
        } catch (error) {
            console.error('Erreur lors de la vérification utilisateur:', error);
            // Fallback vers localStorage
            const recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
            return recentUsers.some(user => {
                const userName = typeof user === 'string' ? user : user.name;
                return userName === username;
            });
        }
    }

    // Récupère tous les utilisateurs
    async getAllUsers() {
        try {
            const usersData = await this.fetchUsersFromGitHub();
            return usersData.users.sort((a, b) => (b.lastLogin || 0) - (a.lastLogin || 0));
        } catch (error) {
            console.error('Erreur lors de la récupération des utilisateurs:', error);
            return this.getFallbackUsers().users;
        }
    }

    // Met à jour la dernière connexion d'un utilisateur
    async updateLastLogin(username) {
        try {
            const usersData = await this.fetchUsersFromGitHub();
            const user = usersData.users.find(u => u.name === username);
            
            if (user) {
                user.lastLogin = Date.now();
                // Pour l'instant, on sauvegarde seulement en localStorage
                // La sauvegarde vers GitHub nécessiterait un token d'authentification
                this.saveToLocalStorage(username);
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            this.saveToLocalStorage(username);
        }
    }

    // Sauvegarde dans localStorage (backup)
    saveToLocalStorage(username) {
        let recentUsers = JSON.parse(localStorage.getItem('recentUsers') || '[]');
        
        // Supprimer l'utilisateur s'il existe déjà
        recentUsers = recentUsers.filter(user => {
            const userName = typeof user === 'string' ? user : user.name;
            return userName !== username;
        });
        
        // Ajouter en première position avec la date
        recentUsers.unshift({
            name: username,
            lastLogin: Date.now()
        });
        
        // Garder seulement les 10 derniers
        recentUsers = recentUsers.slice(0, 10);
        
        localStorage.setItem('recentUsers', JSON.stringify(recentUsers));
    }

    // Récupère les statistiques d'un utilisateur (depuis localStorage)
    getUserProgress(username) {
        const progressKey = `arabicVocabProgress_${username}`;
        const progress = JSON.parse(localStorage.getItem(progressKey) || '{}');
        
        let totalAttempts = 0;
        let totalSuccesses = 0;
        
        Object.values(progress).forEach(card => {
            totalAttempts += card.attempts || 0;
            totalSuccesses += card.successes || 0;
        });
        
        const successRate = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 0;
        
        return {
            totalAttempts,
            totalSuccesses,
            successRate,
            cardsCount: Object.keys(progress).length
        };
    }

    // Invalide le cache (force un rechargement)
    invalidateCache() {
        this.cachedUsers = null;
        this.lastCacheTime = 0;
    }
}

// Export pour utilisation dans script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubUserManager;
}
