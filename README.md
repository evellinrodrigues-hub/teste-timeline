# Balanço do 1º Semestre — Sport Club do Recife

Conversão para **HTML + CSS** do protótipo Figma
[Site sport timeline horizontal](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=0-1&m=dev).

Os dois frames do protótipo vivem numa **página só**, o `index.html`:

| Frame do Figma | Onde entra | Como rola |
| --- | --- | --- |
| `Desktop V. ATUAL` · [node 2096:128](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=2096-128&m=dev) | palcos de cima, do meio e de baixo | vertical |
| `Timeline horizontal` · [node 2001:3](https://www.figma.com/design/pbginA9oIVfWl4W9JVCtvb/Site-sport-timeline-horizontal?node-id=2001-3&m=dev) | seção fixada, no lugar da linha do tempo vertical do frame do desktop | horizontal |

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

- **Maiúsculas.** O Windows ignora, o servidor do Pages (Linux) não. As
  referências locais foram checadas uma a uma contra os nomes reais — batem.
- **Caminhos.** Todos relativos, então funciona na subpasta `/sport-timeline/`
  sem `<base href>`.
- **Jekyll.** O `.nojekyll` na raiz desliga o processamento e serve os arquivos
  intactos.

Peso: 8,8 MB, maior arquivo 2,1 MB (`fechamento.png`) — folgado nos limites do
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

As fotos nascem `loading="lazy"`, e isso engasgaria o scroll nas duas pontas da
seção fixada. **Na entrada:** dentro do pin as fotos da timeline só entrariam
na viewport quando o trilho já as tivesse trazido — carregando e decodificando
no meio do percurso. **Na saída:** as 26 fotos da grade antes/depois aparecem
todas de uma vez no instante em que o pin solta. O mesmo `IntersectionObserver`
antecipa as duas levas ao se aproximar da seção, sem penalizar o carregamento
inicial: quem está lendo a carta ainda não baixou nada disso.

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

Medido com `document.scrollWidth - clientWidth` em cada largura, na
página inteira (CDP, viewport de 900px de altura):

| Viewport | `--dk-scale` | Overflow horizontal | Altura do documento | Pin | Percurso |
| --- | --- | --- | --- | --- | --- |
| 1920 | 1,000 | 0 | 10108 | ligado | 740px |
| 1600 | 1,000 | 0 | 10428 | ligado | 1060px |
| 1440 | 1,000 | 0 | 10588 | ligado | 1220px |
| 1366 | 1,000 | 0 | 10662 | ligado | 1294px |
| 1280 | 1,000 | 0 | 10748 | ligado | 1380px |
| 1152 | 0,900 | 0 | 10029 | ligado | 1508px |
| 1024 | 0,800 | 0 |  9310 | ligado | 1636px |
|  900 | 0,703 | 0 |  8614 | ligado | 1760px |
|  820 | 0,641 | 0 |  8165 | ligado | 1840px |
|  768 | 0,600 | 0 |  7873 | ligado | 1892px |
|  640 | 0,500 | 0 |  7154 | ligado | 2020px |
|  560 | 0,438 | 0 |  4605 | degradado | — |
|  480 | 0,375 | 0 |  4076 | degradado | — |
|  414 | 0,323 | 0 |  3639 | degradado | — |
|  360 | 0,281 | 0 |  3282 | degradado | — |

Zero de overflow horizontal em todas elas, e não por sorte: os únicos
elementos de largura fixa da página — o canvas de cada palco e o trilho
da timeline — vivem dentro de um `overflow: hidden`, então nenhuma
largura de viewport pode empurrá-los para fora.

A timeline usa uma escala própria (`--tlh-scale`), calculada para a **faixa
realmente ocupada** pelo desenho — o canvas tem 1983px de altura mas o conteúdo
vive entre ~29 (o título de março) e ~1836 (o CTA de abril), e escalar pela
altura cheia desperdiçaria as margens vazias. Essa faixa é medida em tempo de
execução, então continua correta se o desenho mudar — e mudou: cada item novo
num mês acima do eixo empurra o topo da faixa para cima.

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
- **O desenho inteiro andou** entre a versão transcrita e a atual: exatamente
  −61px em x e +110px em y, conferido nos nove nós do eixo. A folha guarda os
  valores já deslocados de volta, e o topo dela explica como converter um
  valor novo lido no Dev Mode. Não foi rebaseada porque trocaria uma centena
  de números por outros equivalentes, sem diferença na tela.
- **Ficaram de fora** os nós que o designer estaciona **fora dos limites do
  frame** e que o próprio Figma recorta: o título "Gestão em números", uma
  nota de rodapé e quatro fotos duplicadas.
- **Quebras de linha** dos blocos de texto são as do Figma: cada bloco é um
  único text node com recuos manuais, preservados via `white-space: pre-wrap`.
- **Os arquivos das fotos têm o nome do nó** (`foto-k21.jpg` = nó
  `55432356482_1c16c217a3_k 21`). É o que torna barata a conferência da
  próxima revisão: o nome no Dev Mode é o nome no disco.
- **A pílula de JULHO não está centrada no próprio nó**: fica 66px à direita
  dele. Todos os outros oito meses estão centrados. Está assim no Figma, então
  está assim aqui; se o design corrigir, o `left` certo é 4105.
- Único acréscimo ao desenho: `:focus-visible` nos quatro CTAs, que o protótipo
  não especifica.

**Agosto** é o único mês com uma foto só — o placar, um retrato alto demais
para a moldura deitada. É também o único sem bloco de sócio: no lugar dele vem
a nota de que o relatório ainda está em fechamento.

### O enquadramento das fotos

Na maioria dos nós o Figma simplesmente preenche a moldura, e um
`object-fit: cover` reproduz isso. Mas em **seis** deles o designer arrastou e
ampliou o fill por dentro — e aí `cover` erra o corte, às vezes muito
(no retrato do futsal, a imagem aparece a 240% da altura da moldura).

Esses seis declaram quatro variáveis com os percentuais do Dev Mode:

```css
.tlh-photo--jul-b { --tlh-crop-x: -7.23%; --tlh-crop-y: -62.54%;
                    --tlh-crop-w: 128.19%; --tlh-crop-h: 240.35%; }
```

As porcentagens se resolvem contra a área **interna** do nó (a moldura de 2px
já descontada), que é a mesma referência do Dev Mode — então os valores entram
sem conversão. Quem não declara nada cai no `cover` de sempre. Conferido em
headless: as quinze caixas de `<img>` batem com os percentuais do Figma.

Fundos em `assets/img/desktop/` continuam **PNG** — todos têm canal alfa, e
converter para JPEG viraria um retângulo preto. `fechamento.png` sozinho pesa
2,1 MB (reduzido de 6 MB); é o maior arquivo do projeto.

As 16 imagens da timeline (`assets/img/timeline/`, 2,1 MB) saem dos **fills**,
que o Figma serve no tamanho original — 86 MB no total. Cada uma foi reduzida
para **2× a área que ocupa no nó**, o que nos nós com enquadramento próprio é
mais que 2× a moldura: o retrato do futsal aparece a 128% × 240% dela, então o
arquivo tem 936×1170 e não 738×492. Nenhuma foi ampliada — três origens já
eram menores que o alvo e ficaram como estavam.

As 26 fotos da grade antes/depois, em `assets/img/ilha/` (3,4 MB), são a
exceção da casa: vêm do **export do nó** em 402×269 (2× o tamanho exibido) e
por isso já trazem a moldura vermelha de 1,35px desenhada dentro do arquivo.
É por isso que `.dk-ilha-item__shot` **não** tem `border` — repetir a moldura
em CSS a dobraria. As fotos da timeline seguem o caminho oposto: arquivo sem
moldura, borda em CSS.

---

## O que a última revisão do protótipo trouxe

A pendência que este arquivo registrava — o Figma ter reescrito seis meses já
publicados — **foi aplicada**, junto com o resto da revisão. O que entrou:

**No frame do desktop** (que virou `Desktop V. ATUAL`, node 2096:128):

- seção nova **"A ILHA QUE O TORCEDOR MERECE"**, com treze comparações
  antes/depois — 26 fotos, rótulos e pílulas de estado. É o palco do meio;
- nota de rodapé nova em "Resultados do semestre" (*"os dados apresentados
  referem-se ao período de janeiro a junho"*);
- três legendas reescritas ou reposicionadas: `569.423.444 m`, `65` e `+50`.

Todo o resto do frame — carta, hero, organograma, gestão em números,
resultados e fechamento — bate com o que já estava publicado. O bloco de
baixo desceu −697px em bloco na revisão, sem mudar nada relativo.

**Na linha do tempo** (node 2001:3):

| Mês | O que mudou |
| --- | --- |
| dezembro | bloco reescrito ("3 folhas do futebol atrasadas, 40 mil no caixa e a sede inutilizável", renegociação com a empreiteira, revitalização da Ilha); "Definição ticketeira" virou "Negociação e escolha da Ticketeira para as próximas temporadas"; **as duas fotos trocaram** — agora são a limpeza do gramado e a lavagem das cadeiras |
| janeiro | entram "Negociações em decorrência das rescisões do exercício anterior (2025)", "Renovação Betnacional, com expansão para patrocínio master no futebol feminino" e "Obras nos banheiros da sede" |
| fevereiro | entram hóquei, parceria Montebello e mastro do bandeirão; "Rádio Ilha + Betnacional" virou "Rádio Ilha Betnacional" |
| março | entram o ERP Protheus, a Gestão à Vista com KPIs e BI, o Almoxarifado de Enxoval, o 46º título pernambucano e os uniformes Kappa |
| abril | entram o escudo 3D e a convocação de Mia Hopkins |
| maio | trecho do futebol feminino reescrito; entram o parquinho, as convocações de Pedro Victor e Zé Lucas e a conclusão do teto do Salão Social; "telão" virou "placar eletrônico" |
| junho | entra o Grupo de Trabalho das ressalvas das Demonstrações Financeiras de 2025; trecho da sede/CT reescrito; entram a reforma do campo auxiliar e a convocação de Yan |
| julho | entram o Leão Camp e a venda de Zé Lucas; **ganhou bloco "Resultados programa de sócio"**, que antes ia só até junho |
| agosto | bloco reescrito; **as duas fotos viraram uma** (o placar eletrônico) e entrou a nota sobre o relatório em fechamento |

Uma revisão posterior ainda **removeu quebras manuais** em janeiro e março —
itens que eram um `<li>` mais uma linha recuada viraram um `<li>` só — e
empurrou sete blocos de texto para a direita (entre +13 e +18px), junto com o
bloco de sócio de abril. Tudo relido do Dev Mode.

E uma terceira revisão **trocou sete fotos**, sem mexer em uma vírgula do
texto nem em uma coordenada — o tipo de mudança que os metadados não denunciam
(o nome do nó continua o mesmo) e que só apareceu ao comparar o render do
Figma com o da página, lado a lado, na mesma escala:

| Foto | Era | Virou |
| --- | --- | --- |
| janeiro, esquerda (`k21`) | treino físico no campo | banheiro da sede reformado |
| janeiro, direita (`k15`) | cabeceio no treino | apresentação do relatório "6 meses de reorganização institucional" |
| março, direita (`k8`) | sócios com os mascotes | elenco erguendo a taça do Pernambucano de 2026 |
| abril, esquerda (`k14`) | crianças com os mascotes | escudo 3D no gramado, sob fogos |
| maio, esquerda (`k17`) | sócia no banco de reservas | show para a torcida em ação de relacionamento |
| maio, direita (`k18`) | fogos sobre o telão | placar eletrônico anunciando Diego Hernandez |
| julho, esquerda (`k24`) | quadra de futsal | largada da 3ª Corrida do Sport |

Junto vieram seis **enquadramentos próprios** de fill que a página não
reproduzia (ver acima). Na prática, comparar só coordenadas e texto não basta
nesse arquivo: vale sempre um render lado a lado.

Isso mexeu na **posição** dos blocos, não só no texto: nos quatro meses acima
do eixo o conteúdo é ancorado embaixo, então cada item novo empurra título e
corpo para cima. Maio foi o que mais subiu — o título saiu de `top: 195` para
`top: 46`. Todas as coordenadas foram relidas do Dev Mode.

O eixo encurtou de 5283 para 5186px e o `axis.svg` foi **regerado** nessa
largura (ele tem `preserveAspectRatio="none"`; esticar o arquivo antigo
deformaria os tracejados). A ponta do eixo voltou a ser um nó visível no
arquivo, agora com 16px — a ressalva que este README registrava caiu.

### Onde a página se afasta do protótipo

Quatro deslizes de digitação do Figma foram corrigidos **a pedido**, e a
página deixou de reproduzi-los. Cada um tem uma nota no ponto exato do
`index.html`; se o protótipo for atualizado, as notas saem:

| Onde | No Figma | Na página |
| --- | --- | --- |
| Resultados, cartão `65` | "Catracas operando **perando** em 12 portões" | "Catracas operando em 12 portões" |
| Gestão em números, cartão `+50` | "**NovosContratos** de patrocinadores" | "Novos contratos de patrocinadores" |
| Linha do tempo, julho | **item de lista vazio** entre "Leão Camp" e "Venda do jogador Zé Lucas", que rende um marcador solto | linha em branco num `<p>`, como em todos os outros intervalos do bloco: mesma altura, sem marcador |
| Linha do tempo, julho | "Lançamento do **1ª** projeto Leão Camp" | "1º projeto" |

Fora isso, o único acréscimo ao desenho continua sendo o `:focus-visible` dos
CTAs e do botão do organograma, que o protótipo não especifica.

Uma observação que **não** virou mudança, porque é do desenho e não do código:
a seção fixada se chama "A TRANSFORMAÇÃO CHEGA À ILHA E AO TORCEDOR" e logo
abaixo dela vem outra chamada "A ILHA QUE O TORCEDOR MERECE".

Os textos alternativos das 26 fotos da grade e das 16 da linha do tempo foram
escritos pelo que aparece em cada exportação. Vale uma revisão de quem
produziu as fotos.

---

## Estrutura

```
sport-timeline/
├─ index.html                     # ★ a entrega: frame do desktop + timeline
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
│  │     ├─ ilha.css              # ★ a grade antes/depois (namespace dk-ilha-)
│  │     └─ pin.css               # ★ sticky + scroll horizontal
│  ├─ js/
│  │  └─ desktop.js               # ★ escala + pin (vanilla, sem dependências)
│  └─ img/
│     ├─ timeline/                # exports do frame 2001:3 (fotos e SVGs)
│     ├─ ilha/                    # as 26 fotos antes/depois (export dos nós)
│     └─ desktop/                 # fundos full-bleed do frame do desktop
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
1280   largura do frame do desktop
5845   largura do canvas da timeline
1983   altura  do canvas da timeline
```

Mudou o frame no Figma? Atualize os dois lados. (O CSS do pin lê os tokens,
então só existem esses dois pontos de verdade.)

**5845 não é a largura do frame.** O desenho termina em 5623 — a ponta do
eixo, contando o ponto final — e o resto do frame é folga que o designer
deixou para os nós estacionados fora dos limites. Reproduzir a largura cheia
acrescentaria centenas de pixels de preto para rolar. O valor aqui é a ponta
do eixo mais os mesmos ~230px de respiro que o frame tinha quando ia só até
junho.

As alturas dos três palcos verticais estão em `desktop/canvas.css`, com o
recorte do frame anotado ao lado de cada uma.

### Tipografia

Poppins via Google Fonts (`500;600;700`). Para publicar sem depender de CDN,
baixe os `.woff2`, coloque em `assets/fonts/` e troque o `<link>` do
`index.html` por um `@font-face` com `font-display: swap`.

### Adicionar um mês na linha do tempo

Todo o desenho está em `modules/timeline-horizontal.css`, agrupado por mês e em
coordenadas absolutas. Foi este o caminho para julho e agosto:

1. **Converter as coordenadas.** O Figma reposiciona o desenho inteiro quando o
   frame cresce. Entre a versão de junho e a de agosto tudo andou **+324px em x
   e +133px em y** — confira o deslocamento em um mês cujo texto *não* mudou
   (fevereiro serviu) antes de confiar nele, e subtraia dos valores novos.
2. Um `<article class="tlh-month-group">` no HTML, na ordem cronológica.
3. Um bloco de coordenadas na folha (nó, haste, pílula, título, corpo, fotos).
4. Estender a `width` do `.tlh-axis` e o `left` do `.tlh-node--end`, e **regerar
   `assets/img/timeline/axis.svg` na largura nova** — ele tem
   `preserveAspectRatio="none"`, então esticar o mesmo arquivo deformaria os
   tracejados em vez de acrescentar tracejados.
5. Atualizar `--fig-tl-w` em `tokens.css` e `TL_W` em `desktop.js`.
6. Estender o período no `<title>`, na `<meta description>` e no `<h1>` do
   `index.html` — os três dizem "de dezembro de 2025 a agosto de 2026" e
   andam juntos. É a única coisa da página que não se atualiza sozinha.

O percurso horizontal se recalcula sozinho a partir daí.

A ordem do DOM é sempre cronológica (dez → ago) independente do lado do eixo.
Isso mantém a leitura correta em leitor de tela e em navegação por teclado.

### Acrescentar um item na grade antes/depois

`desktop/ilha.css` já descreve o desenho **interno** de um item — rótulo, as
duas fotos, o "x" e as pílulas. Conferidas uma a uma no Dev Mode, essas
distâncias são idênticas nos treze itens: variam no quarto decimal. Então
acrescentar um item é:

1. Um `<figure class="dk-ilha-item dk-ilha-item--nome">` no HTML, com o rótulo,
   as duas fotos e as duas pílulas (`--antes`, `--depois` ou `--andamento-a` /
   `--andamento-b`, conforme o estado de cada foto).
2. **Uma linha** de CSS com o par `left`/`top` do rótulo, já rebaseado em
   −5322px no y. A coluna da esquerda fica em `left: 158px`, a da direita em
   `668px`.
3. Exportar as fotos pelo **nó** (não pelo fill), em 2×, para a moldura vir
   junto — ver a nota de fidelidade acima.
4. Se a grade crescer, esticar `--dk-stage-h` de `.dk-stage--ilha` em
   `desktop/canvas.css`. O corte hoje é 5322 → 7479.

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
