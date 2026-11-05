require('dotenv').config();
const app = require('./app');
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const iniciar = async () => {
  await db.connectDatabase();

  app.listen(PORT, () => {
    console.log('');
    console.log('  Urban Reports API  [MySQL + Docker]');
    console.log('─────────────────────────────────────────────────────');
    console.log(` API interna em http://localhost:${PORT}`);
    console.log(`  Banco: ${process.env.DB_HOST || 'localhost'}/${process.env.DB_NAME || 'base_projeto_integrador'}`);
    console.log('─────────────────────────────────────────────────────');
    console.log('');
  });
};

iniciar().catch(err => {
  console.error('❌ Falha ao iniciar:', err.message);
  process.exit(1);
});
