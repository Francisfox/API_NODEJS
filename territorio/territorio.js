// ---------------------------------------------------------------------------
// Territorio Ativo - demonstracao.
//
// Uma pagina so, ao lado do jogo, reaproveitando o login que ja existe no
// server.js. Tudo vive neste arquivo: os dados ficticios, a regra de acesso
// e o HTML.
//
// Os dados sao INVENTADOS. Nenhum cliente, contrato ou pessoa real aparece
// aqui - a demonstracao e da regra de acesso, nao dos numeros.
//
// A regra: cada pessoa ve apenas as linhas em que e gerente de contas ou
// gerente comercial. O corte acontece no SERVIDOR, antes de existir HTML.
// Filtrar no navegador nao valeria nada: as linhas alheias ja teriam sido
// enviadas, e bastaria abrir o codigo-fonte da pagina para le-las.
// ---------------------------------------------------------------------------
import express from 'express';

// Nomes ficticios para os gerentes. A posicao casa com a lista de e-mails
// autorizados que o server.js passa - assim nenhum e-mail e repetido aqui.
const NOMES = [
    'Ana Ribeiro Alves',
    'Bruno Castilho Nunes',
    'Carla Menezes Duarte',
    'Diego Fontes Aguiar',
    'Elisa Tavares Pinto',
    'Fabio Queiroz Lemos',
    'Gisele Amorim Rocha',
    'Helena Barros Vieira',
    'Igor Salgado Freitas',
    'Julia Prado Bittencourt',
];

const GRUPOS = ['Aurora Industrial', 'Bandeirante Log', 'Cedro Alimentos', 'Delta Saude',
    'Estrela Varejo', 'Farol Educacional', 'Granito Engenharia', 'Horizonte Seguros',
    'Ipe Farmaceutica', 'Jacaranda Textil'];
const FILIAIS = ['Sao Paulo', 'Campinas', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba'];
const DIRETORIAS = ['Diretoria Sudeste', 'Diretoria Sul', 'Diretoria Nacional'];
const SEGMENTOS = ['Industria', 'Varejo', 'Saude', 'Educacao', 'Servicos'];
const STATUS = ['Ativo', 'Ativo', 'Ativo', 'Em renovacao', 'Suspenso'];

// Sorteio deterministico (LCG): o servidor pode reiniciar no meio de uma
// demonstracao sem embaralhar a carteira de todo mundo.
function gerarLinhas(pessoas) {
    let s = 20260906;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const sorteia = a => a[Math.floor(rnd() * a.length)];

    const linhas = [];
    for (let i = 1; i <= 20; i++) {
        // Gerente de contas e comercial diferentes na mesma linha: e o que
        // permite ver os dois papeis funcionando.
        const contas = sorteia(pessoas);
        let comerc = sorteia(pessoas);
        while (comerc === contas && pessoas.length > 1) comerc = sorteia(pessoas);

        linhas.push({
            id: i,
            codigo: `CT-${9000 + i}`,
            grupo: sorteia(GRUPOS),
            status: sorteia(STATUS),
            gerenteContas: contas.nome,
            gerenteComerc: comerc.nome,
            filial: sorteia(FILIAIS),
            diretoria: sorteia(DIRETORIAS),
            segmento: sorteia(SEGMENTOS),
        });
    }
    return linhas;
}

// Toda saida de dado no HTML passa por aqui. Sem isso, um valor com '<'
// viraria marcacao dentro da pagina.
function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------------------------------------------------------------------
// criarTerritorio(opcoes) -> router do Express
//
//   emails  - lista de e-mails autorizados, na ordem; a posicao define o nome
//             ficticio do gerente (NOMES)
//   masters - e-mails que enxergam TODAS as linhas
// ---------------------------------------------------------------------------
export function criarTerritorio({ emails = [], masters = [] } = {}) {
    const pessoas = emails.slice(0, NOMES.length).map((email, i) => ({
        email: String(email).toLowerCase(),
        nome: NOMES[i],
    }));
    const linhas = gerarLinhas(pessoas);
    const ehMaster = e => masters.some(m => String(m).toLowerCase() === e);

    // O recorte de UMA pessoa. Toda rota comeca por aqui - e por isso que uma
    // rota nova nasce filtrada em vez de precisar lembrar do filtro.
    function escopoDe(email) {
        const e = String(email || '').toLowerCase();
        const eu = pessoas.find(p => p.email === e);
        const master = ehMaster(e);

        if (!eu && !master) return { nome: e, master: false, linhas: [] };

        const minhas = master
            ? linhas.map(l => ({ ...l, papel: 'Master' }))
            : linhas
                .filter(l => l.gerenteContas === eu.nome || l.gerenteComerc === eu.nome)
                .map(l => ({
                    ...l,
                    papel: l.gerenteContas === eu.nome ? 'Gerente de contas' : 'Gerente comercial',
                }));

        return { nome: eu ? eu.nome : e, email: e, master, linhas: minhas };
    }

    const router = express.Router();

    router.get('/', (req, res) => {
        const escopo = escopoDe(req.session && req.session.email);
        res.send(pagina(escopo, linhas.length));
    });

    return router;
}

function pagina(escopo, totalGeral) {
    const linhas = escopo.linhas.map(l => `
            <tr>
                <td class="cod">${esc(l.codigo)}</td>
                <td>${esc(l.grupo)}</td>
                <td>${esc(l.segmento)}</td>
                <td>${esc(l.filial)}</td>
                <td>${esc(l.diretoria)}</td>
                <td><span class="st st-${esc(l.status.split(' ')[0].toLowerCase())}">${esc(l.status)}</span></td>
                <td class="papel">${esc(l.papel)}</td>
            </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Territorio Ativo</title>
    <style>
        :root {
            --tinta: #1d2b38; --fraca: #64748b; --linha: #e2e8f0;
            --papel: #ffffff; --fundo: #f1f5f9; --marca: #243544;
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--fundo); color: var(--tinta);
               font: 14px/1.5 -apple-system, "Segoe UI", Arial, sans-serif; }
        header { background: var(--marca); color: #fff; padding: 14px 24px;
                 display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        header h1 { font-size: 17px; margin: 0; font-weight: 600; }
        header nav { margin-left: auto; display: flex; gap: 8px; }
        header a { color: #fff; text-decoration: none; font-size: 13px;
                   padding: 6px 12px; border: 1px solid rgba(255,255,255,.35);
                   border-radius: 6px; }
        header a:hover { background: rgba(255,255,255,.12); }
        main { max-width: 1100px; margin: 24px auto; padding: 0 24px; }
        .aviso { background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12;
                 padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .resumo { color: var(--fraca); margin-bottom: 12px; font-size: 13px; }
        .resumo strong { color: var(--tinta); }
        .caixa { background: var(--papel); border: 1px solid var(--linha);
                 border-radius: 10px; overflow: hidden; }
        .rolagem { overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--linha);
                 white-space: nowrap; }
        th { background: #f8fafc; font-size: 12px; text-transform: uppercase;
             letter-spacing: .04em; color: var(--fraca); }
        tr:last-child td { border-bottom: 0; }
        tbody tr:hover { background: #f8fafc; }
        .cod { font-family: Consolas, monospace; }
        .papel { color: var(--fraca); }
        .st { padding: 2px 8px; border-radius: 999px; font-size: 12px;
              background: #ecfdf5; color: #065f46; }
        .st-em { background: #fffbeb; color: #92400e; }
        .st-suspenso { background: #fef2f2; color: #991b1b; }
        .vazio { padding: 40px 20px; text-align: center; color: var(--fraca); }
    </style>
</head>
<body>
    <header>
        <h1>Territorio Ativo</h1>
        <nav>
            <a href="/menu">Menu</a>
            <a href="/game/index.html">Jogo</a>
        </nav>
    </header>
    <main>
        <div class="aviso"><strong>Demonstracao.</strong> Todos os dados desta tela
            sao ficticios. Nenhum cliente, contrato ou pessoa real aparece aqui.</div>

        <p class="resumo">
            ${esc(escopo.nome)} &mdash;
            <strong>${escopo.linhas.length}</strong> de ${totalGeral} registros
            ${escopo.master
                ? '(visao master: todos os registros)'
                : 'em que voce e gerente de contas ou gerente comercial'}
        </p>

        <div class="caixa">
        ${escopo.linhas.length === 0 ? `
            <p class="vazio">Nenhum registro na sua carteira.</p>` : `
            <div class="rolagem">
            <table>
                <thead>
                    <tr><th>Contrato</th><th>Grupo</th><th>Segmento</th><th>Filial</th>
                        <th>Diretoria</th><th>Status</th><th>Seu papel</th></tr>
                </thead>
                <tbody>${linhas}
                </tbody>
            </table>
            </div>`}
        </div>
    </main>
</body>
</html>`;
}
