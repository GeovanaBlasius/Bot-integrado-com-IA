const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
    let historico = [];
    try {
        historico = JSON.parse(fs.readFileSync('./historico.json', 'utf8'));
    } catch (error) {
        return res.send('<h2>❌ Nenhum atendimento registrado ainda.</h2>');
    }

    const total = historico.length;

    const ultimos = historico.slice(-10).reverse();

    const produtos = {};
    for (const h of historico) {
        if (h.produto) {
            produtos[h.produto] = (produtos[h.produto] || 0) + 1;
        }
    }

    const topProdutos = Object.entries(produtos)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, qtd]) => `<li>${nome} — ${qtd}x</li>`)
        .join('');
        
    const html = `
        <h1>📊 Painel de Atendimentos</h1>
        <p>Total de atendimentos: <strong>${total}</strong></p>

        <h2>🕘 Últimos atendimentos</h2>
        <ul>
            ${ultimos.map(h => `<li>${h.horario} — ${h.numero}: ${h.mensagem}</li>`).join('')}
        </ul>

        <h2>🔥 Produtos mais buscados</h2>
        <ul>${topProdutos || '<li>Nenhum produto registrado</li>'}</ul>
    `;

    res.send(html);
});

app.listen(PORT, () => {
    console.log(`✅ Painel disponível em: http://localhost:${PORT}`);
});
 //inicialização node painel.js