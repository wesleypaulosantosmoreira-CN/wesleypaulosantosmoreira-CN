# 🎓 Plataforma de Ensino Pro (Manual do Professor)

Este app foi criado para garantir que seus alunos assistam às aulas de verdade, sem "pular" partes do vídeo.

## 🛡️ Sistema Anti-Skip (Como funciona?)
O sistema rastreia o progresso do aluno segundo a segundo. Se o aluno tentar arrastar a barra de vídeo para frente:
1. O vídeo volta automaticamente para o último ponto assistido.
2. Uma mensagem de bloqueio aparece na tela.
3. O aluno só consegue avançar conforme o tempo do vídeo passa naturalmente.

## 🛠️ Primeiros Passos para o Professor

### 1. Criar sua Conta de Administrador
- Clique em **Cadastrar**.
- Preencha seus dados.
- No campo **Código de Administrador**, use o código secreto: `MAM2024`.
- Isso liberará os botões de "Adicionar Aula" e "Banco de Questões" para você.

### 2. Adicionando Aulas
- Você pode usar links diretos (.mp4) ou do **Dropbox**.
- Se usar Dropbox, basta copiar o link de compartilhamento. O sistema ajusta o link sozinho para rodar como vídeo.

### 3. Gerando a Prova com IA
- Vá em **Banco de Questões** (ícone de lista no topo).
- Clique em **Gerar 60 com IA**.
- O sistema lerá seus títulos e descrições de aulas e criará a prova automaticamente.

## 🌐 Deixando o site Online
Recomendamos o uso da **Vercel** conectado ao seu GitHub. Lembre-se de configurar a variável de ambiente `API_KEY` com sua chave do Google AI Studio para que a geração de provas funcione.

---
Dúvidas? O sistema de comentários envia as perguntas dos alunos direto para sua planilha de controle!