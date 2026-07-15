import * as emailService from '../server/email';

async function runTests() {
  const testEmail = 'arthuremanuelmota@gmail.com';
  const firstName = 'Arthur Teste';

  console.log('--- INICIANDO TESTES DE E-MAIL ---');

  // 1. Teste E-mail de Boas-vindas
  console.log('\n[Teste 1] Enviando e-mail de boas-vindas...');
  const welcomeResult = await emailService.sendWelcomeEmail(testEmail, firstName);
  console.log(`Resultado: ${welcomeResult ? 'SUCESSO' : 'FALHA'}`);

  // 2. Teste E-mail de Código de Verificação
  console.log('\n[Teste 2] Enviando e-mail de código de verificação...');
  const verificationResult = await emailService.sendVerificationCodeEmail(testEmail, firstName, '123456');
  console.log(`Resultado: ${verificationResult ? 'SUCESSO' : 'FALHA'}`);

  // 3. Teste E-mail de Recuperação de Senha
  console.log('\n[Teste 3] Enviando e-mail de recuperação de senha...');
  const resetResult = await emailService.sendPasswordResetEmail(testEmail, firstName, 'token-de-teste-123');
  console.log(`Resultado: ${resetResult ? 'SUCESSO' : 'FALHA'}`);

  console.log('\n--- FIM DOS TESTES ---');
  
  if (welcomeResult && verificationResult && resetResult) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal no script de teste:', err);
  process.exit(1);
});
