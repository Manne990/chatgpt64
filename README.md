# chatgpt64

En liten brygga som later en C64/C128 med CCGMS prata med ChatGPT via OpenAI API.

Maskinen fran 80-talet behover bara agera terminal. Servern gor allt som ar modernt och tungt: TCP, TLS, HTTP, JSON, API-nyckel, sessionshantering och formatanpassning till 40 eller 80 kolumner.

## Grundide

```text
C64/C128 + CCGMS
    -> WiFi-modem, nullmodem eller serial-till-server
    -> raw TCP/telnet-liknande socket
    -> chatgpt64
    -> OpenAI Responses API
```

Forsta malet ar en BBS-liknande prompt:

```text
CHATGPT/64 READY.
> 
```

Du skriver en rad i CCGMS, servern skickar fragan till OpenAI och svaret kommer tillbaka radbrutet for terminalen.

## Spec

- C64/C128 ska ansluta med CCGMS via WiFi-modem, telnet-liknande TCP eller seriell brygga.
- OpenAI API-nyckeln ska aldrig finnas pa C64:an, bara pa servern.
- Servern ska prata med OpenAI Responses API.
- Servern ska halla en enkel session per uppkoppling.
- Svar ska vara korta, textbaserade och C64-vanliga eftersom terminalen inte har scrollback.
- Utdata ska radbrytas for 40 kolumner som standard.
- ASCII-safe lage ska vara standard, med enkel translitterering av svenska tecken.
- C128/80-kolumnslage ska kunna anvanda bredare radbredd via miljovariabel.
- Terminalkommandon ska finnas for ny session, hjalp, korta/langa svar och avslut.
- Kodbasen ska vara liten nog att kunna koras pa en Raspberry Pi.

## Status

Forsta kodpasset innehaller:

- raw TCP-server
- enkel telnet-IAC-filtrering
- fjarr-echo for terminalprogram som vill ha BBS-kansla
- prompt och radbuffer
- `/help`, `/new`, `/short`, `/normal`, `/long`, `/c64`, `/ascii`, `/cls`, `/banner`, `/model`, `/quit`
- OpenAI Responses API-anrop via `fetch`
- `previous_response_id` per anslutning for fortsatt konversation
- kort svarslage som standard
- 40-kolumns radbrytning
- ASCII-translitterering
- valbart C64-farglage med PETSCII/control bytes
- PETSCII-inspirerad uppkopplingsbanner med fargade reverse-video-block

## Krav

- Node.js 20 eller senare
- En OpenAI API-nyckel

OpenAI rekommenderar Responses API for nya projekt:

- https://developers.openai.com/api/docs/guides/migrate-to-responses

## Kom igang

```sh
cd ~/Projects/chatgpt64
cp .env.example .env
$EDITOR .env
npm start
```

Servern lyssnar som standard pa port `6464`.

```text
CHATGPT64_HOST=0.0.0.0
CHATGPT64_PORT=6464
```

Fran ett WiFi-modem anslut till datorns IP och port `6464`. Exakt kommando beror pa modem-firmware, men ofta liknar det:

```text
ATDT192.168.1.50:6464
```

For var VPS:

```text
ATDT152.42.141.215:6464
```

## CI/CD

Repot har samma grundmonster som `swing-trader`:

- `.github/workflows/ci.yml` kor `npm ci` och `npm test` pa pull requests och push till `main`.
- `.github/workflows/deploy.yml` startar efter gron CI pa `main`, eller manuellt via `workflow_dispatch`.
- Deploy sker via SSH och `rsync` till servern.
- Systemd-tjansten installeras som `chatgpt64.service`.
- Serverns `.env` bevaras vid deploy och lases av systemd.

Skapa dessa GitHub secrets:

```text
CHATGPT64_APP_DIR
CHATGPT64_SSH_HOST
CHATGPT64_SSH_KEY
CHATGPT64_SSH_USER
```

Valfri secret om SSH inte gar pa port 22:

```text
CHATGPT64_SSH_PORT
```

Pa servern ska `CHATGPT64_APP_DIR/.env` innehalla minst:

```text
OPENAI_API_KEY=sk-...
```

Forsta deployen skapar en `.env` fran `.env.example` om filen saknas, men du maste fylla i riktig `OPENAI_API_KEY` pa servern innan ChatGPT-svar fungerar.

Deploy-anvandaren pa servern behover kunna kora `sudo install` och `sudo systemctl` for att installera och starta om systemd-tjansten, pa samma satt som i `swing-trader`.

## Terminalkommandon

```text
/help    visa hjalp
/new     starta ny ChatGPT-session
/short   korta svar, standardlage
/normal  lite fylligare svar
/long    tillat langre svar
/c64     C64-farglage
/ascii   plain ASCII-lage
/cls     rensa skarmen
/banner  visa uppkopplingsbanner igen
/model   visa aktiv modell
/quit    koppla ner
```

## C64-farger

ASCII-lage ar standard for maximal kompatibilitet. I C64-lage skickar servern Commodore control bytes for farg och clear screen, men haller vanlig text ASCII-saker eftersom den vagen redan fungerar bra med CCGMS/tcpser.

Vid uppkoppling visar servern en liten PETSCII-inspirerad banner. Den anvander Commodores farger och reverse-video-spaces som blockgrafik. Det gor den robust i CCGMS utan att vi maste lita pa exakt samma grafikfont pa varje setup.

Starta C64-farglage i en session:

```text
/c64
```

Ga tillbaka till plain ASCII:

```text
/ascii
```

Rensa skarmen:

```text
/cls
```

Visa bannern igen:

```text
/banner
```

For att starta alla anslutningar i C64-farglage, satt detta i serverns `.env`:

```text
CHATGPT64_TERMINAL=c64
```

Fargerna anvands sa har:

```text
cyan       prompt/banner
yellow     THINKING... och varningar
light blue system- och hjalptext
light red  fel
light green ChatGPT-svar
white      inmatning/reset
```

## Konfiguration

```text
OPENAI_API_KEY          kravs for riktiga svar
OPENAI_MODEL            standard: gpt-5.5
CHATGPT64_HOST          standard: 0.0.0.0
CHATGPT64_PORT          standard: 6464
CHATGPT64_WIDTH         standard: 40
CHATGPT64_TERMINAL      standard: ascii, kan vara c64
CHATGPT64_MAX_INPUT     standard: 1200
CHATGPT64_ASCII_ONLY    standard: 1
CHATGPT64_ECHO          standard: 1
CHATGPT64_CHAR_DELAY_MS standard: 0
```

`CHATGPT64_ASCII_ONLY=1` gor `a`, `a`, `o` av svenska specialtecken. Det ar fult men tryggt for forsta C64-testet. Sen kan vi bygga riktig PETSCII-konvertering.

## Nasta steg

- PETSCII-lage med battre C64-teckenkarta.
- Valfri personsokning: `-- MORE --`.
- XMODEM-export av langa svar.
- Seriell brygga direkt mot `/dev/tty.*`.
- En liten BBS-meny runt chatten.
