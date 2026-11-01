# Ålesund – hva skjer?

- Mobil-/webappen ligger i `expo/`. Datainnhentingen ligger i det separate
  repositoryet `larsohj/iaal`; appen leser den publiserte JSON-filen derfra.
- Bruk Bun 1.4.4 og `expo/bun.lock`. Ikke legg til npm- eller Yarn-låsfiler.
- Utvikling: `cd expo` og `bun run start` eller `bun run start-web`.
- Kontroller: `bun run typecheck`, `bun run test:release`,
  `bunx expo export --platform web` og
  `bunx expo export --platform ios --output-dir dist-ios`.
- Les `expo/TESTFLIGHT.md` før du arbeider med Apple/EAS. Bevar appens
  identifikatorer og koble bare til kontoer og prosjekter eieren har valgt.
- Ikke skriv hemmeligheter i Git. Expo-token hører hjemme i GitHub Actions
  secrets; Apple-signering og API-nøkkel konfigureres i EAS.
- TestFlight-handlingen utløses manuelt eller av `ios-v*`-tagger. En akseptert
  EAS-forespørsel er ikke dokumentasjon på vellykket bygg eller opplasting.
- Rork har GitHub-synkronisering. Bevar pågående brukerarbeid og unngå
  unødvendige omskrivinger av appen.
