
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');

// Inicialização do cliente
const client = new Client();

client.on('qr', qr => qrcode.generate(qr, { small: true }));

client.on('ready', () => {
    console.log('Bot está pronto!');
});

// Leitura do catálogo JSON
const catalogo = JSON.parse(fs.readFileSync('./catalogo.json', 'utf-8'));

// Configurações
const saudacoesSimples = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa'];
const horarioAtendimento = { inicio: 8, fim: 18 }; // 8h às 18h

// Função para verificar se estamos dentro do horário comercial
function dentroDoHorarioComercial() {
    const hora = new Date().getHours();
    return hora >= horarioAtendimento.inicio && hora < horarioAtendimento.fim;
}

// Função para buscar no catálogo
function buscarNoCatalogo(texto) {
    texto = texto.toLowerCase();
    for (const produto of catalogo.produtos) {
        if (texto.includes(produto.nome.toLowerCase())) {
            return `🔍 *${produto.nome}*\n${produto.descricao}`;
        }
    }
    return null;
}

// Função de fallback para o ChatGPT
async function enviarParaChatGPT(mensagem) {
    const mensagens = [
        {
            role: 'system',
            content: 'Você é um atendente virtual da empresa Blasfen, especializada em vendas de lubrificantes industriais. Responda com clareza, profissionalismo e seja objetivo. Tire dúvidas sobre produtos, aplicações, preços, entregas e indique soluções conforme a necessidade do cliente. Faça um atendimento humanizado.'
        },
        {
            role: 'user',
            content: mensagem
        }
    ];

    const resposta = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: mensagens,
    }, {
        headers: {
            'Authorization': `Bearer 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`,
            'Content-Type': 'application/json'
        },
    });

    return resposta.data.choices[0].message.content.trim();
}

// Tratamento de mensagens
client.on('message_create', async message => {
    if (message.fromMe) return;
    const agora = Date.now();
    const recebida = message.timestamp * 1000;

    if ((agora - recebida) > 1000 * 60 * 5) {
    return; // Ignora mensagens com mais de 5 minutos
    }

    const texto = message.body.toLowerCase().trim();

    if (!dentroDoHorarioComercial()) {
        return message.reply('⏰ Nosso atendimento é de segunda a sexta, das 8h às 18h. Por favor, deixe sua mensagem e retornaremos assim que possível.');
    }

    if (saudacoesSimples.includes(texto)) {
        return message.reply(`Olá! 👋 Eu sou o assistente virtual da *Blasfen*.

Como posso te ajudar hoje?

1️⃣ Ver catálogo 📄
2️⃣ Falar com um atendente humano 👤
3️⃣ Dúvidas sobre um produto ❓

Digite o número da opção desejada ou mande sua dúvida.`);
    }

    if (texto === '1') {
        await message.reply('📄 Aqui está o nosso catálogo:');
        const media = MessageMedia.fromFilePath('./catalogo.pdf');
        return client.sendMessage(message.from, media);
    }

    if (texto === '2') {
        return message.reply('👤 Encaminhando sua solicitação para um de nossos atendentes. Por favor, aguarde.');
    }

    // Verifica se o texto menciona um produto do catálogo
    const respostaCatalogo = buscarNoCatalogo(texto);
    if (respostaCatalogo) {
        return message.reply(respostaCatalogo);
    }

    // Se a mensagem for curta ou genérica demais, peça mais contexto
    if (texto.length < 3) {
        return message.reply('🤔 Poderia me dar mais detalhes para que eu possa ajudar melhor?');
    }

    // Fallback para ChatGPT
    try {
        const respostaIA = await enviarParaChatGPT(texto);
        await message.reply(respostaIA);
    } catch (error) {
        console.error('Erro com ChatGPT:', error.message);
        await message.reply('❌ Desculpe, houve um erro ao tentar responder. Por favor, tente novamente mais tarde.');
    }
});

// Inicialização do bot
client.initialize();
