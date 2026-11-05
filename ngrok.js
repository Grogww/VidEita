require('dotenv').config({ path: '.env.ngrok' });

const ngrok = require('@ngrok/ngrok');

(async function () {
  const token = process.env.NGROK_AUTHTOKEN;
  if (!token || token === 'SEU_TOKEN_AQUI') {
    console.error('NGROK_AUTHTOKEN não configurado.');
    console.error('Copie .env.ngrok.example para .env.ngrok e cole o seu token do ngrok.');
    process.exit(1);
  }

  try {
    const listener = await ngrok.forward({
      addr: 8080,
      authtoken: token
    });

    console.log('VidEita online em:');
    console.log(listener.url());

    process.stdin.resume();
  } catch (error) {
    console.error('Erro ao iniciar ngrok:');
    console.error(error);
  }
})();
