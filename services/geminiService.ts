
import { Question } from '../types';

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Environment variable access failed");
  }
  return null;
};

export const generateQuestionsFromContent = async (contentContext: string): Promise<Question[] | null> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("API Key not found or process.env not supported");
    return null;
  }

  try {
    // Dynamic import for performance and error handling
    // @ts-ignore
    const { GoogleGenAI, Type } = await import("@google/genai");
    
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: 'O enunciado da pergunta clara e objetiva.',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Uma lista de exatamente 4 opções de resposta plausíveis.',
          },
          correctAnswer: {
             type: Type.INTEGER,
             description: 'O índice da resposta correta (0, 1, 2 ou 3).'
          }
        },
        required: ["text", "options", "correctAnswer"],
      },
    };

    const prompt = `
      Você é um especialista em design instrucional e pedagogia. 
      Com base no conteúdo das aulas fornecido abaixo, crie um Banco de Questões com EXATAMENTE 60 perguntas de múltipla escolha.
      
      Diretrizes:
      1. As perguntas devem cobrir todos os módulos proporcionalmente.
      2. Evite perguntas óbvias; foque na aplicação do conhecimento.
      3. Garanta que apenas uma alternativa esteja correta.
      4. O tom deve ser profissional e educativo.
      
      Conteúdo das Aulas para Referência:
      ${contentContext}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 4000 } // Adicionado para melhor raciocínio na criação pedagógica
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const parsedQuestions = JSON.parse(jsonText);
    
    return parsedQuestions.map((q: any) => ({
        id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer
    }));

  } catch (error) {
    console.error("Erro ao gerar perguntas com IA:", error);
    return null;
  }
};
