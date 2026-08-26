# Balanço do 1º Semestre — Sport Club do Recife

Conversão para **HTML + CSS** do protótipo Figma
[Site sport timeline horizontal](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=0-1&m=dev).

Os dois frames do protótipo vivem numa **página só**, o `index.html`:

| Frame do Figma | Onde entra | Como rola |
| --- | --- | --- |
| `Desktop` · [node 1:2](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=1-2&m=dev) | palco de cima e palco de baixo | vertical |
| `Timeline horizontal` · [node 2001:3](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=2001-3&m=dev) | seção do meio, no lugar da linha do tempo vertical do frame 1:2 | horizontal |

Sem build, sem framework, sem dependências. Abra o `index.html` e funciona.

---

## Como rodar

**VS Code + Live Server** (recomendado):

1. Instale a extensão **Live Server** (`ritwickdey.LiveServer`) — já sugerida em `.vscode/extensions.json`.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.

**Ou por linha de comando**, em qualquer servidor estático:

```powershell
npx serve .
# ou
py -m http.server 5500
```

> Abrir o arquivo direto com `file://` também funciona, mas um servidor local
> evita surpresas com cache e caminhos relativos.

---

## Publicar (GitHub Pages)

Site estático, sem build: o Pages serve a pasta como está.

1. Crie um repositório **público** vazio em [github.com/new](https://github.com/new)
   (Pages em repositório privado exige plano pago). Sem README, o projeto já tem.
2. Ligue o remoto e publique:

   ```powershell
   git remote add origin https://github.com/SEU-USUARIO/sport-timeline.git
   git push -u origin main
   ```

3. No repositório: **Settings → Pages → Source: Deploy from a branch →
   `main` / `(root)` → Save**.

Em 1–2 minutos o site sai em `https://SEU-USUARIO.github.io/sport-timeline/`.

Três coisas que costumam quebrar nessa passagem e que aqui já estão resolvidas:

- **Maiúsculas.** O Windows ignora, o servidor do Pages (Linux) não. As 41
  referências locais foram checadas uma a uma contra os nomes reais — batem.
- **Caminhos.** Todos relativos, então funciona na subpasta `/sport-timeline/`
  sem `<base href>`.
- **Jekyll.** O `.nojekyll` na raiz desliga o processamento e serve os arquivos
  intactos.

Peso: 5,1 MB, maior arquivo 2,1 MB (`fechamento.png`) — folgado nos limites do
Pages (100 MB por arquivo, 1 GB no repositório).

---

## Uma página

`index.html` é o site inteiro: rola vertical, prende a timeline e rola
horizontal, solta e volta a rolar vertical. Não há segunda página, e nada além
da cadeia de `assets/css/desktop.css` é carregado — veja [Sobras](#sobras).

---

## O scroll: vertical → horizontal → vertical

A seção da linha do tempo (`.dk-pin`) recebe uma altura maior que a viewport;
dentro dela, `.dk-pin__viewport` é `position: sticky` e fica parada enquanto a
seção passa. O progresso dessa passagem vira deslocamento horizontal do trilho.

**Não há sequestro de `wheel`.** Quem rola continua sendo a página — por isso
roda do mouse, trackpad, toque com inércia, teclado (Page Down, setas,
Home/End) e barra de rolagem funcionam sem tratamento especial, e o retorno ao
fluxo vertical no fim da seção é automático.

### Por que não trava

Quatro decisões, todas comentadas no código:

1. **Quem anima é o CSS, não o JS.** `view-timeline` na seção +
   `animation-timeline` no trilho (`desktop/pin.css`). A animação roda no
   compositor: nenhum trabalho na thread principal por quadro, nem style
   recalc, nem JS. Onde o navegador não tem scroll-driven animations, o
   `desktop.js` assume — e aí escreve `transform` direto no elemento, dentro de
   um `requestAnimationFrame`. O `@supports` do CSS e o `CSS.supports()` do JS
   testam a mesma condição; só um dos dois caminhos fica ativo.
2. **O caminho JS lê `scrollY`, não `getBoundingClientRect()`.** O topo da
   seção é medido uma vez no layout e guardado. Ler geometria a cada quadro,
   logo depois de escrever estilo, forçaria um relayout síncrono por quadro —
   o clássico "layout thrashing".
3. **`will-change` entra e sai.** O trilho escalado tem ~6 milhões de pixels;
   promovê-lo a camada o tempo todo custa memória de textura e atrapalha o
   scroll vertical, que não precisa dele. Um `IntersectionObserver` liga a
   promoção só perto da seção. No caminho CSS nem isso é preciso.
4. **`overscroll-behavior-x`, não `overscroll-behavior`.** No modo de
   degradação a timeline é uma janela rolável; conter os dois eixos fazia a
   roda do mouse sobre ela **parar a página inteira**. Só o X é contido agora.

As fotos da timeline nascem `loading="lazy"`, mas dentro do pin elas só
entrariam na viewport quando o trilho já as tivesse trazido — carregando e
decodificando no meio do percurso, que é onde um engasgo aparece. O mesmo
`IntersectionObserver` antecipa a carga ao se aproximar da seção, sem penalizar
o carregamento inicial: quem está lendo a carta ainda não baixou nada disso.

### Degradação

Sem `data-pin="on"` (JS desligado, `prefers-reduced-motion`, abaixo de 640px ou
quando a timeline já cabe na largura) a mesma marcação vira uma janela rolável,
navegável por `←` `→` `Home` `End`. Nenhum conteúdo fica inalcançável em
nenhum dos dois modos.

Conferido em Chrome headless nos dois caminhos (CSS e JS) e nos dois modos
(pin ligado a 1440px, degradado a 500px): mesmo enquadramento, mesmo percurso.

### Escala, e por que não reflow

O frame é um desenho 1:1 de posicionamento absoluto. Refluir as colunas em
telas menores mudaria o desenho — que é justamente o que não se quer. Então a
página mantém a geometria do Figma intacta e o palco inteiro é **reduzido**
proporcionalmente. `--dk-scale` é o único botão: 1 até 1280px de viewport,
`clientWidth / 1280` abaixo disso.

Medido com `document.scrollWidth - clientWidth` em cada largura:

| Viewport | `--dk-scale` | Overflow horizontal | Percurso da timeline |
| --- | --- | --- | --- |
| 1920 | 1,000 | 0 | 870px |
| 1600 | 1,000 | 0 | 683px |
| 1440 | 1,000 | 0 | 843px |
| 1366 | 1,000 | 0 | 546px |
| 1280 | 0,988 | 0 | 722px |
| 1024 | 0,788 | 0 | 888px |
| 820  | 0,628 | 0 | 2252px |

A timeline usa uma escala própria (`--tlh-scale`), calculada para a **faixa
realmente ocupada** pelo desenho — o frame tem 1983px de altura mas o conteúdo
vive entre ~195 e ~1832, e escalar pela altura cheia desperdiçaria as margens
vazias. Essa faixa é medida em tempo de execução, então continua correta se o
desenho mudar.

Quando existir um layout mobile de verdade, ele entra como um `@media` em
`desktop/canvas.css` que zera a escala e troca `.dk-stage__canvas` por um fluxo
normal; nenhuma outra folha precisa saber disso.

---

## Fidelidade

Conferida contra o render 1:1 do Figma: **diferença média de 0,73%** por pixel
na página inteira, e as faixas que sobram são só recompressão de foto, não
deslocamento. Três coisas precisaram de tratamento e estão comentadas nas folhas:

- **Empilhamento.** No protótipo o `FECHAMENTO` fica **acima** do texto de
  fechamento — o alfa da imagem é que deixa ler. Como o `transform` do palco já
  cria um contexto de empilhamento, isso sai de graça pela ordem do DOM: fundos
  de baixo antes do conteúdo, o `FECHAMENTO` depois. Sem `z-index`.
- **Primeira linha (`--dk-baseline-fix`).** Onde a entrelinha é menor que a
  altura natural da fonte (títulos de seção e os 15 números grandes), o Chrome
  sobe os glifos e o Figma não. A diferença medida — 0,2525em — some com um
  `translateY` único. Se a versão da Poppins mudar, remeça.
- **`text-transform: capitalize`.** Em elemento posicionado absolutamente o
  Chrome não capitaliza a *primeira* palavra (só da segunda em diante). As
  legendas dos cartões já vêm com a inicial maiúscula no HTML por causa disso.

Cinco legendas têm `<br>` fixo: o Figma quebra a linha antes do que o Chrome
quebraria na mesma largura. As quebras são as do protótipo, não invenção.

Da linha do tempo especificamente:

- **Coordenadas** saem do Dev Mode e vivem todas na folha de estilo, agrupadas
  por mês. Nenhuma posição está inline no HTML.
- **Ficaram de fora** seis nós que estão no arquivo mas **fora dos limites do
  frame** (x ≥ 4872 ou y ≥ 2041) e portanto recortados pelo próprio Figma:
  o título "Gestão em números", a nota de rodapé e quatro fotos duplicadas.
- `foto-k8` veio **em branco** na exportação do fill; o valor certo é o segundo
  fill do nó `2003:1183`. Se reexportar, confira essa foto.
- **Quebras de linha** dos blocos de texto são as do Figma: cada bloco é um
  único text node com recuos manuais, preservados via `white-space: pre-wrap`.
  O bloco de junho estoura a altura declarada do nó (456 px) — no Figma também
  estoura, então o comportamento está correto.
- Único acréscimo ao desenho: `:focus-visible` nos quatro CTAs, que o protótipo
  não especifica.

Fundos em `assets/img/desktop/` continuam **PNG** — todos têm canal alfa, e
converter para JPEG viraria um retângulo preto. `fechamento.png` sozinho pesa
2,1 MB (reduzido de 6 MB); é o maior arquivo do projeto. Fotos da timeline em
`assets/img/timeline/`, reduzidas para 2× o tamanho exibido (~2 MB no total;
os originais somavam 77 MB). `foto-k13` e `foto-k17` ficaram no tamanho nativo
porque a origem já era menor que 2×.

---

## Estrutura

```
sport-timeline/
├─ index.html                     # ★ a entrega: frame 1:2 + timeline horizontal
├─ .nojekyll                      # GitHub Pages: serve os arquivos como estão
├─ assets/
│  ├─ css/
│  │  ├─ desktop.css              # ★ índice de imports (a cadeia inteira)
│  │  ├─ base/
│  │  │  ├─ tokens.css            # ← cores, fontes, escalas + grupo --fig-*
│  │  │  └─ frame-reset.css       # ← reset da página
│  │  ├─ modules/
│  │  │  └─ timeline-horizontal.css   # ★ o desenho da timeline (namespace tlh-)
│  │  └─ desktop/
│  │     ├─ canvas.css            # palcos, escala, fundos full-bleed
│  │     ├─ sections.css          # carta, hero, números, resultados, fechamento
│  │     └─ pin.css               # ★ sticky + scroll horizontal
│  ├─ js/
│  │  └─ desktop.js               # ★ escala + pin (vanilla, sem dependências)
│  └─ img/
│     ├─ timeline/                # exports do frame 2001:3 (fotos e SVGs)
│     └─ desktop/                 # fundos full-bleed do frame 1:2
└─ README.md
```

`modules/timeline-horizontal.css` continua sem saber onde está montado: só
descreve o desenho do frame 2001:3 em coordenadas absolutas. Quem decide escala
e posicionamento é o consumidor — hoje, o pin do `index.html`. Foi assim que a
timeline pôde ser embutida sem tocar no desenho.

Convenção de nomes: **BEM enxuto** — `.bloco__elemento` e `.bloco--variante`.
Nenhuma regra usa `!important` e nenhum seletor passa de 2 níveis de
especificidade.

---

## Sobras

O projeto teve antes mais duas peças, hoje fora dele:

- um `index.html` com uma releitura **responsiva** do protótipo em colunas
  fluidas — o nome passou a ser o da entrega;
- um `timeline-horizontal.html`, a timeline sozinha em tamanho real, usada para
  conferir o desenho contra o Figma.

Os 33 arquivos que só eles consumiam (`main.css` e seus 20 imports, `main.js`,
os PNGs da linha do tempo vertical, os placeholders) foram removidos: **2,26 MB**
a menos. A lista exata não foi escrita à mão — saiu de um caminhamento pelo
grafo de referências a partir do `index.html`, e depois do corte as 41
referências restantes foram reconferidas uma a uma.

Nada disso se perdeu. O primeiro commit do repositório tem tudo; para
recuperar:

```powershell
git show <primeiro-commit>:assets/css/main.css
# ou, para trazer de volta um arquivo inteiro:
git checkout <primeiro-commit> -- assets/css/main.css
```

---

## Onde mexer

### Cores, fontes e espaçamentos

Tudo em [`assets/css/base/tokens.css`](assets/css/base/tokens.css). Nenhum hex
está escrito fora desse arquivo — trocar o vermelho institucional é uma linha.

O grupo `--fig-*` é o que as páginas usam de fato (valores do Dev Mode):

| Token | Valor | Uso |
| --- | --- | --- |
| `--fig-bg` | `#111111` | fundo dos frames |
| `--fig-red` | `#e23a34` | títulos, molduras, eixo, botões |
| `--fig-yellow` | `#f9df28` | números, meses e texto sobre vermelho |
| `--fig-body` | `#cec8c4` | corpo de texto |
| `--fig-shadow` | `#b50600` | sombra sólida do botão do organograma |

O mesmo arquivo ainda guarda os grupos `--color-*` e `--tl-*`, que pertenciam
ao site responsivo. Nenhuma regra viva os lê hoje — são declarações inertes,
alguns bytes, sem efeito na página. Deixei porque são a única memória da
paleta alternativa; se for unificar, decida antes qual dos dois conjuntos vale.

### Geometria dos frames

Três números aparecem em dois lugares — `base/tokens.css` (grupo `--fig-*`) e
o topo de `assets/js/desktop.js`:

```
1280   largura do frame "Desktop"
4746   largura do frame "Timeline horizontal"
1983   altura  do frame "Timeline horizontal"
```

Mudou o frame no Figma? Atualize os dois lados.

### Tipografia

Poppins via Google Fonts (`500;600;700`). Para publicar sem depender de CDN,
baixe os `.woff2`, coloque em `assets/fonts/` e troque o `<link>` do
`index.html` por um `@font-face` com `font-display: swap`.

### Adicionar um mês na linha do tempo

Todo o desenho está em `modules/timeline-horizontal.css`, agrupado por mês e em
coordenadas absolutas do frame. Um mês novo é: um `<article class="tlh-month-group">`
no HTML, um bloco de coordenadas na folha, e o `left` do `.tlh-node--end` e a
`width` do `.tlh-axis` estendidos até a nova ponta. O canvas (`4746px`) cresce
junto — e como ele é a largura do frame, atualize também `TL_W` no
`desktop.js`. O percurso horizontal se recalcula sozinho a partir daí.

A ordem do DOM é sempre cronológica (dez → jun) independente do lado do eixo.
Isso mantém a leitura correta em leitor de tela e em navegação por teclado.

---

## Acessibilidade

- Estrutura de headings sem saltos (`h1` → `h2` → `h3`).
- A trilha horizontal é `role="group"`; no modo degradado recebe `tabindex="0"`
  e é navegável por `←` `→` `Home` `End`. Com o pin ligado ela sai da ordem de
  tabulação (não é rolável por si só) e os CTAs lá dentro continuam focáveis.
- Foco visível em dourado (`:focus-visible`), contraste ≥ 4.5:1 no corpo de texto.
- `prefers-reduced-motion` desliga o pin: a timeline vira uma janela rolável comum.
- Fotos decorativas de fundo com `alt=""` + `aria-hidden`; fotos de conteúdo com
  `alt` descritivo (revise os textos alternativos com quem produziu as fotos —
  descrevi pelo que aparece nas exportações).

---

## Compatibilidade

Chrome/Edge 111+, Firefox 113+, Safari 16.4+. Usa `grid`, custom properties,
`clamp()`, `aspect-ratio`, `100svh` e `mask-image`.

As **scroll-driven animations** (`view-timeline`) pedem Chrome/Edge 115+,
Safari 26+ ou Firefox 144+. Abaixo disso o `@supports` não casa e o
`desktop.js` faz o mesmo percurso — o resultado na tela é idêntico, só sai da
thread principal em vez do compositor.

Sem JavaScript nenhum, a página segue completa e legível: a timeline vira uma
janela rolável por scroll, toque e teclado.
