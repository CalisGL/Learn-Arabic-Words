# مراجعة المفردات العربية 🌙

Une application web moderne pour apprendre le vocabulaire arabe avec le système de répétition espacée.

## 🚀 Fonctionnalités

### 📚 Modes de révision
- **Révision normale** : Apprenez les mots et verbes par niveau et thématique
- **Révision intensive** 🎯 : Concentrez-vous sur vos mots les plus difficiles (>30% d'échec)
- **Révision personnalisée** 🎨 : Sélectionnez précisément les mots à réviser

### 🎓 Types de contenu
- **الاسماء** (Noms) : Vocabulaire général, noms et adjectifs avec pluriels
- **الافعال** (Verbes) : Conjugaisons complètes (passé, présent, impératif, masdar)

### 🧠 Système intelligent
- **Répétition espacée** : Les mots difficiles reviennent plus souvent
- **Statistiques détaillées** : Suivez vos progrès avec des métriques précises
- **Cartes adaptatives** : Les mots ratés sont répétés en fin de session

### 🔊 Audio intégré
- **Lecture arabe** : Écoutez la prononciation correcte (ResponsiveVoice)
- **Mode audio automatique** : Lecture automatique à chaque nouvelle carte
- **Support multivoix** : Voix masculine et féminine arabes

### 🎯 Interface intuitive
- **Mode inversé** : Testez-vous dans les deux sens (AR→FR ou FR→AR)
- **Navigation hiérarchique** : Sélection par niveau > thématique > partie
- **Design responsive** : Fonctionne sur tous les appareils

## 📊 Système de notation

- **❌ Incorrect (0 points)** : Vous ne connaissez pas du tout
- **😰 Difficile (1 point)** : Vous connaissez mais avec difficulté
- **✅ Correct (2 points)** : Vous connaissez bien
- **🚀 Facile (3 points)** : Vous maîtrisez parfaitement

## 🛠️ Installation

### Installation simple
1. Téléchargez tous les fichiers
2. Ouvrez `index.html` dans votre navigateur
3. Commencez à apprendre !

### Configuration audio (optionnelle)
Pour activer l'audio, vous devez obtenir une clé API ResponsiveVoice :

1. Allez sur [ResponsiveVoice.org](https://responsivevoice.org/)
2. Créez un compte et obtenez votre clé API
3. Remplacez `YOUR_API_KEY` dans `index.html` par votre vraie clé
4. Voir `README_Audio.md` pour plus de détails

## 📁 Structure du projet

```
site/
├── index.html              # Interface utilisateur
├── styles.css              # Styles et animations
├── script.js               # Logique principale
├── README.md               # Ce fichier
└── README_Audio.md         # Configuration audio
```

## 💾 Données et progression

### Sauvegarde automatique
- Vos statistiques sont sauvegardées automatiquement dans le navigateur
- Aucune connexion internet requise après le premier chargement
- Les données persistent entre les sessions

### Statistiques suivies
- **Total tentatives** : Nombre total de cartes vues
- **Taux de réussite** : Pourcentage de bonnes réponses
- **Cartes difficiles** : Mots avec >30% d'échec
- **Cartes maîtrisées** : Mots avec >80% de réussite (min 5 tentatives)

### Réinitialisation
Vous pouvez réinitialiser toutes vos statistiques depuis l'interface.

## 🎯 Comment utiliser

### Première utilisation
1. **Choisissez un type** : Mots ou Verbes
2. **Sélectionnez le contenu** : Développez les niveaux et choisissez les parties
3. **Configurez les options** : Mode inversé, audio automatique
4. **Commencez la révision** !

### Pendant la révision
- **Cliquez sur la carte** ou le bouton "Révéler" pour voir la réponse
- **Évaluez-vous honnêtement** avec les 4 boutons de notation
- **Écoutez l'audio** avec le bouton 🔊 en haut à gauche
- **Suivez votre progression** avec la barre en haut

### Modes spéciaux

#### Révision intensive 🎯
- Automatiquement proposée si vous avez des cartes difficiles
- Se concentre sur vos points faibles
- Disponible depuis l'écran de sélection ou après une session

#### Révision personnalisée 🎨
1. Choisissez "المراجعة الشخصية"
2. Sélectionnez le type (mots/verbes)
3. Choisissez une thématique
4. Cochez individuellement les mots désirés
5. Lancez votre session sur mesure

## 🔧 Fonctionnalités avancées

### Raccourcis clavier
- **Espace** : Révéler la réponse
- **1-4** : Noter la carte (1=Incorrect, 4=Facile)
- **Échap** : Retour à la sélection

### Modes d'affichage
- **Mode normal** : Arabe → Français
- **Mode inversé** : Français → Arabe
- **Audio automatique** : Lecture automatique du texte arabe

### Indicateurs visuels
- **🔄 Répétition** : Cette carte revient après un échec
- **🎯 Révision intensive** : Mode cartes difficiles actif
- **FR → AR / AR → FR** : Indicateur de mode en cours

## 📈 Algorithme de répétition espacée

L'application utilise un système adaptatif basé sur vos performances :

- **Cartes réussies** : Intervalle multiplié selon la facilité
- **Cartes ratées** : Remises immédiatement en fin de session
- **Difficulté dynamique** : Ajustée selon vos résultats
- **Priorisation intelligente** : Les cartes difficiles apparaissent plus souvent

## 🎨 Personnalisation

### Contenu
- Ajoutez vos propres mots dans le fichier script.js
- Respectez le format : `arabe;pluriel;traduction` (mots) ou `passé;présent;impératif;masdar;traduction` (verbes)

### Style
- Modifiez `styles.css` pour changer l'apparence
- Couleurs, polices et animations personnalisables

## 💡 Conseils d'apprentissage

### Pour les débutants
1. Commencez par "Niveau 1 - Thématique 1 - Partie 1"
2. Utilisez le mode normal (AR→FR) au début
3. Activez l'audio automatique pour la prononciation
4. Soyez patient et honnête dans vos évaluations

### Pour les avancés
1. Utilisez le mode inversé (FR→AR) pour tester votre production
2. Lancez des révisions intensives régulièrement
3. Créez des sessions personnalisées par sujet
4. Consultez vos statistiques pour identifier les lacunes

### Bonnes pratiques
- **Régularité** : 15-20 minutes par jour sont plus efficaces qu'une longue session
- **Honnêteté** : Notez-vous correctement pour un apprentissage optimal
- **Patience** : Les mots difficiles reviendront naturellement
- **Contexte** : Essayez d'utiliser les mots appris dans des phrases

## 📞 Contact et contribution

Ce projet est open source. N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Contribuer du nouveau vocabulaire
- Partager vos retours d'expérience

---

**بالتوفيق في تعلم اللغة العربية !** 🌟

*Bonne chance dans votre apprentissage de l'arabe !*
