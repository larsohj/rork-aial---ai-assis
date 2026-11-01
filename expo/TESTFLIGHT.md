# Ålesund – bygg og opplasting til TestFlight

Appen kan utvikles med Claude Code/Codex og bygges med Expo EAS uten Rork.
GitHub-handlingen bygger en signert iOS-app og ber EAS laste den opp til App
Store Connect. Apple behandler deretter opplastingen før den vises i TestFlight.
Dette sender ikke appen til App Review og publiserer den ikke offentlig.

## Status

EAS-profiler, lokale kontroller og GitHub-handlinger følger med prosjektet.
Appen er koblet til Expo-eieren `elosral75`, prosjekt
`9af2f753-47c2-4aae-bfbe-7c6dcc3ef5af`. Apple-app `6761432920` og team
`LM6829WTW7` er verifisert. Et nytt distribusjonssertifikat og en matchende
App Store-profil er opprettet og importert til EAS. EAS bekrefter at
signeringen er klar. Ingen signeringsnøkler eller passord skal legges i Git.

TestFlight hadde versjon 1.1.2, bygg 6, som utløpt. Ny versjon 1.1.2,
bygg 9, er bygget og lastet opp til App Store Connect. EAS bekrefter
`FINISHED` for både bygg og innsending 1. november 2026. Apple viser
bygg 9 som `Processing` i TestFlight etter mottak.
https://appstoreconnect.apple.com/teams/31d931df-a0bf-4ccc-b2c6-46d4957ca720/apps/6761432920/testflight/ios
Bygg:
https://expo.dev/accounts/elosral75/projects/7xg85oiv316atrlaj2lbx/builds/fc7fed0c-7fd2-408e-9dcd-90159b389f29
Innsending:
https://expo.dev/accounts/elosral75/projects/7xg85oiv316atrlaj2lbx/submissions/21efff9c-0152-4cbf-b611-8d839d1c2125

Bygg 8 feilet ved import av PKCS#12 i macOS. Samme sertifikat ble eksportert
på nytt med macOS-kompatibel PKCS#12-kryptering og importert på nytt til EAS.
Bygg 9 passerte signering og full native iOS-bygging. Appen er ikke sendt
til App Review eller publisert offentlig.

Kontoeieren har godkjent kildekodeoverføring, signeringsoppsett og API-nøkkel.
Developer Program-avtalen og API-vilkårene er godtatt. Nøkkelen
`Alesund EAS Submit`, ID `3C2GZL6826`, er opprettet med Developer-rolle og
knyttet til prosjektet i EAS for innsending. Privatnøkler ligger ikke i Git.
GitHub-skrivetilgang er bekreftet etter at appens repository ble lagt til i
integrasjonens valgte repositoryer. GitHub-handlingene følger med denne
endringen. EXPO_TOKEN må konfigureres som secret før TestFlight-handlingen
kan kjøres fra GitHub.

Bevar eksisterende bundle-ID `app.rork.7xg85oiv316atrlaj2lbx` dersom den allerede
er registrert på Apple-kontoen din. Rork-navnet i ID-en betyr ikke at Rork må
brukes. Hvis ID-en tilhører en annen Apple-konto, må en ledig ID registreres
og `ios.bundleIdentifier` og Apple-appen oppdateres sammen.

## Engangsoppsett

Kjør kommandoene fra `expo/`, med Node.js og Bun installert:

```bash
bun install --frozen-lockfile
npx eas-cli@27.2.0 login
npx eas-cli@27.2.0 init
```

Bruk din egen Expo-konto. Hvis appen allerede finnes på Expo-kontoen, koble til
det eksisterende prosjektet; opprett ellers ett prosjekt. `eas init` skriver
den ekte `extra.eas.projectId` til `app.json`. Det er en UUID, ikke Rork-sluggen.

Opprett eller velg iOS-appen i [App Store Connect](https://appstoreconnect.apple.com/).
Bruk samme bundle-ID som i `app.json`, norsk som hovedspråk og en unik SKU.
Kopier det numeriske **Apple ID**-feltet fra appinformasjonen; dette er `ASC_APP_ID`.

Konfigurer signeringssertifikat og provisioning-profil på EAS:

```bash
npx eas-cli@27.2.0 credentials:configure-build --platform ios --profile production
npx eas-cli@27.2.0 credentials --platform ios
```

I den siste kommandoen velger du production og **App Store Connect → Manage
your API Key → Set up your project to use an API Key for EAS Submit**. Velg
riktig Apple-team. Apple-pålogging og eventuell tofaktor utføres av kontoeieren.
Nøkkelen må ha tilstrekkelige rettigheter for opplasting. Følg Expo sine
instruksjoner for rollen kontoen bruker.

Legg det numeriske Apple ID-feltet inn i `submit.production.ios.ascAppId` i
`eas.json`. Alternativt kan du sette miljøvariabelen `ASC_APP_ID` og kjøre:

```bash
bun run release:configure
bun run release:check
npx eas-cli@27.2.0 build --platform ios --profile production
# Bruk bygg-ID-en fra EAS i neste kommando:
npx eas-cli@27.2.0 submit --platform ios --profile production --id BYGG_ID --no-auto-testflight-setup
```

Den første kjøringen er interaktiv slik at EAS kan fullføre eventuelle manglende
kontoinnstillinger. Bekreft at bygget og opplastingen lykkes i EAS og at appen
vises i TestFlight. Legg bare offentlige prosjektidentifikatorer i Git.

## GitHub-oppsett

Under repositoryets **Settings → Secrets and variables → Actions**:

| Type | Navn | Verdi |
| --- | --- | --- |
| Secret | `EXPO_TOKEN` | Personlig Expo access token fra din Expo-konto |
| Variable | `EXPO_PROJECT_ID` | `extra.eas.projectId` fra `app.json` |
| Variable | `ASC_APP_ID` | Numerisk Apple ID fra App Store Connect |
| Variable, valgfri | `EXPO_OWNER` | Eierens Expo-brukernavn eller organisasjon |

Prosjekt- og Apple-ID kan alternativt være sjekket inn i `app.json`/`eas.json`.
Handlingen godtar begge deler, men stopper ved motstridende identifikatorer.
Legg aldri Apple-passord, `.p8`-filer eller Expo-token i kildekoden, issues,
pull requests eller chat. Signering og Apple API-nøkkel håndteres i EAS.

Når EAS-oppsettet er bekreftet, velg **Actions → Build and upload to TestFlight
→ Run workflow**. Alternativt oppretter du en bevisst release-tag:

```bash
git tag ios-v1.0.0
git push origin ios-v1.0.0
```

Vanlige commits og pull requests kjører kontroller uten å starte skybygg.
Release-handlingen sjekker oppsett, TypeScript, konfigurasjonstester og iOS-bundling
før den ber EAS bygge. EAS øker build-nummeret automatisk. GitHub-jobben venter
ikke på skybygget: grønn jobb betyr at forespørselen er akseptert. Følg bygge- og
innsendingslenkene i loggen for endelig status; kontroller så TestFlight.

## Lokale kommandoer

```bash
bun run start
bun run start-web
bun run typecheck
bun run test:release
bunx expo export --platform web
bunx expo export --platform ios --output-dir dist-ios
```

Bruk Bun-låsfilen. `package-lock.json` skal ikke følge med EAS-opplastingen.
Start via Rork kan fortsatt forsøkes med `bun run start-rork`; Metro bruker
nå standard Expo-oppsett uten Rork-SDK og automatisk innsprøytet Rork-kode.

Før offentlig App Store-lansering gjenstår fysisk telefontest, personvernlenke,
butikktekst, skjermbilder, aldersvurdering og Apples gjennomgang. TestFlight
har også egne regler for ekstern betatesting.

Kilder: [iOS-opplasting](https://docs.expo.dev/submit/ios/),
[bygg fra CI](https://docs.expo.dev/build/building-on-ci/),
[automatisk innsending](https://docs.expo.dev/build/automate-submissions/).
