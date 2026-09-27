# Journal vocal

Première brique d'un projet de double numérique : enregistrer sa voix chaque
jour, transcrire automatiquement, et stocker le tout classé par date.

## Deux modes

- **Journal** : un enregistrement libre par jour, classé par date.
- **Questionnaire** : un questionnaire de personnalité structuré en 8
  chapitres (racines familiales, enfance, amour, travail, valeurs, épreuves,
  bonheur, messages pour les générations futures). Chaque question peut être
  enregistrée (et réenregistrée) individuellement ; la progression
  (X/Y questions répondues, par chapitre et au global) s'affiche en direct.

## Choix technique

Web app mobile (PWA) en HTML/CSS/JS pur, sans build ni backend :

- **Enregistrement audio** : API `MediaRecorder` du navigateur.
- **Transcription automatique** : API `SpeechRecognition` (native au
  navigateur, fonctionne en direct pendant l'enregistrement).
- **Stockage** : IndexedDB, dans le navigateur ; une seule table `entries`
  avec un champ `type` (`daily` ou `questionnaire`) qui distingue les deux
  modes.
- **Installable** sur l'écran d'accueil du téléphone via le manifest +
  service worker (mise en cache des fichiers statiques).

Le code est découpé en petits modules chargés en `<script>` classiques (pas
de build) : `db.js` (IndexedDB), `recorder.js` (moteur d'enregistrement +
transcription partagé), `questions.js` (contenu du questionnaire),
`journal.js` et `questionnaire.js` (logique de chaque mode), `app.js`
(bascule entre les onglets et initialisation).

Ce choix évite toute clé API, tout serveur et tout outillage de build : on
ouvre la page, on autorise le micro, et ça marche.

### Limite connue

`SpeechRecognition` est bien supporté sur Chrome/Android. Sur Safari/iOS le
support est partiel ou absent : l'enregistrement audio fonctionnera toujours,
mais la transcription pourra être vide. Une évolution possible serait
d'envoyer l'audio à un service de transcription serveur (ex. Whisper) pour
un support universel.

## Utilisation

Le micro n'est accessible que sur une origine sécurisée (HTTPS) ou en local.
Pour tester :

```bash
# Depuis le dossier du projet
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000` dans le navigateur (idéalement sur le
téléphone via le même réseau + une origine HTTPS, ou en déployant sur un
hébergeur statique comme GitHub Pages/Netlify/Vercel).

## Prochaines étapes possibles

- Déploiement sur un hébergeur statique HTTPS pour un usage réel sur mobile.
- Icônes d'app pour le manifest.
- Export/synchronisation des entrées (aujourd'hui tout reste en local sur
  l'appareil).
- Transcription serveur pour compatibilité universelle (iOS notamment).
