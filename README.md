# BPMN-Labor – Unterrichtseinheit 4

Eigenständiger digitaler Lernkurs für Informatik, Klasse 11 am Beruflichen Gymnasium.

## Inhalt

- **Kapitel 1:** Pools, Lanes und Zuständigkeiten (5 reguläre Aufgaben)
- **Kapitel 2:** Nachrichtenfluss, sendendes und empfangendes Nachrichten-Zwischenereignis (8 Aufgaben)
- **Kapitel 3:** Datenobjekte und Datenassoziationen (6 Aufgaben)
- **Kapitel 4:** Normales Endereignis und Terminierungs-Endereignis (7 Aufgaben)
- **Kapitel 5:** BPMN-Werkstatt in draw.io mit eigenständigem Modellieren aus Beschreibungstexten (10 Aufgaben)
- **Zusätzlich:** Vier Bonusmissionen, zehn Testaufgaben, Kompetenzcheckliste.

Die BPMN-Syntaxlegende enthält **sämtliche Elemente aus UE 2, UE 3 und UE 4**. Für UE 5 sind keine weiteren neuen Symbole vorgesehen. Der Kurs führt einen fiktiven Hoodie-Fall bei CampusPrint fort.

## Installation mit GitHub und Netlify

1. ZIP entpacken. In GitHub ein **neues Repository** anlegen und **den Inhalt des Projektordners** hochladen (also `index.html`, `app.js`, `course-data.js`, `netlify.toml`, `package.json`, `assets/`, `netlify/`, `scripts/`, `tests/`, `README.md`).
2. In Netlify über **Add new project → Import an existing project** das GitHub-Repository auswählen.
3. Die `netlify.toml` definiert Build-Befehl `npm run build`, Publish-Verzeichnis `dist` und Functions-Ordner `netlify/functions`. Auf Node.js >=22.13 achten.
4. In **Site configuration → Environment variables** die Variable `TEACHER_ACCESS_CODE` mit **mindestens 12 Zeichen** anlegen. Dieser Code darf nicht in GitHub eingetragen werden. Änderungen an Umgebungsvariablen erfordern einen neuen Deploy.
5. Site deployen; auf der veröffentlichten URL als Lehrkraft mit Klasse, Nickname, Passwort und dem Lehrercode registrieren. Die Schüler registrieren sich mit derselben Klassenbezeichnung und eigenem Nickname + Passwort.
6. **Live-Test:** Lehrerregistrierung, Schüleranmeldung, Fortschritt auf zwei Geräten, Lehrer-Dashboard, Passwortreset und PDF-Portfolio auf der veröffentlichten Website prüfen.

**Kein Supabase und kein SQL-Editor.** Die Speicherung erfolgt über **Netlify Functions + Netlify Blobs**. Eine allgemeine `AUTH`-Umgebungsvariable wird nicht benötigt; der Lehrercode ist das einzige zum Einrichten erforderliche Geheimnis. Nutzerpasswörter werden mit Scrypt und Salt gehasht. Sitzungen verwenden HttpOnly-/Secure-Cookies.

**Wichtig:** UE 4 besitzt eigene Blobs-Speicher (`bpmn-ue4-*`) und ein eigenes Sitzungscookie. Bei einer separaten Netlify-Site werden Konten und Ergebnisse aus UE 2 und 3 nicht automatisch übernommen.

## Arbeiten mit draw.io

- **Keine Uploads:** Die Schülerinnen und Schüler zeichnen auf ihren Geräten und speichern ihre `.drawio`-Dateien lokal.
- **Bearbeitbare Vorlagen:** Nur bei Korrektur-/Ergänzungsaufgaben können `.drawio`-Dateien direkt an der Aufgabe heruntergeladen und in draw.io geöffnet werden.
- **Eigenständige Fälle:** Bei komplexen Textaufgaben wird eine eigene Zeichnung ohne Startvorlage verlangt.
- **Musterlösung:** Nach einer Rückfrage wird eine Musterbeschreibung und ein bearbeitbares Beispiel-Diagramm angeboten. Die Lernenden vergleichen und bewerten ihre Arbeit selbst.
- **PDF-Portfolio:** Dokumentiert die bisher bearbeiteten Aufgaben, eingegebenen Antworten und die Selbstbewertungen – **keine Diagrammdateien oder Screenshots**.

## Testbefehle

```sh
npm install
npm test
npm run check
npm run build
node scripts/render-smoke.mjs
```

Die vorhandenen Tests prüfen Aufgaben, Lösungsschlüssel, Vorlagen, Seitendarstellung und simulierte Serverfunktionen. Vor dem Schulbetrieb ist ein **produktiver Live-Test in Netlify** notwendig; lokal simulierte Funktionen ersetzen keinen Live-Test der Blob-Speicherung und des PDF-Exports.

## Datenschutz und Quellen

Bei Registrierung werden ein pseudonymer Nickname, eine Klassenkennung, ein Passwort-Hash und Lernfortschritte gespeichert. Das Lehrerkonto kann Ergebnisse innerhalb seiner Klasse ansehen, löschen und Passwörter zurücksetzen. Eine schulische Datenschutzprüfung und geeignete Informationen für Lernende sind vor der Veröffentlichung erforderlich.

Fachliche Grundlagen: BPMN 2.0.2, Object Management Group, und die vorliegenden Lehrplanpassagen zur Modellierung von Geschäftsprozessen. Für didaktische Beispiele sind die Unternehmen, Bestellungen und Abläufe bewusst fiktiv. Das eingebundene BPMN-Video dient als punktuelle Ergänzung, seine Beispiele werden nicht ungeprüft übernommen.

Die KI-Kennzeichnung im Footer nennt ChatGPT (GPT-6) und weist darauf hin, dass die fachliche Schlussprüfung und Freigabe durch die Lehrkraft vor dem produktiven Einsatz erfolgen müssen.
