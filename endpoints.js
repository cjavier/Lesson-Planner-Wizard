import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';

const router = express.Router();
dotenv.config();

export default function setupEndpoints(app, collection) {
  // Función para obtener contenido
  const get_content = async (contentData) => {
    const { Skill, AgeGroup, Goal } = contentData;

    // Concatenar Skill, AgeGroup y Goal en una sola oración
    const queryText = `${Skill} for ${AgeGroup} focused on ${Goal}`;
    console.log(`Fetching content for query: ${queryText}`);

    try {
      // Hacer la consulta al endpoint
      const response = await axios.post('http://localhost:5001/query', {
        queryText: queryText,
      });

      // Extraer y retornar las metadatas del resultado
      const metadatas = response.data.results.metadatas;
      console.log('Metadatas:', metadatas);

      return metadatas;
    } catch (error) {
      console.error('Error fetching content:', error);
      throw error;
    }
  };

  // Endpoint para consultar la base de datos de Chroma
  app.post('/query', async (req, res) => {
    const queryText = req.body.queryText;

    if (!queryText) {
      return res.status(400).json({ error: 'Query text is required.' });
    }

    try {
      // Usamos la colección ya existente, no la recreamos
      if (!collection) {
        return res.status(500).json({ error: 'Collection not initialized.' });
      }

      // Ejecutar la consulta
      const results = await collection.query({
        queryTexts: queryText,
        nResults: 5, // Número de resultados a retornar
      });

      // Devolver los resultados como JSON
      res.json({ results: results });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred during the query.' });
    }
  });

  // Inicializa el cliente de OpenAI
  let assistant;

  const initOpenAIAssistant = async () => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.REACT_APP_OPENAI_API_KEY, // Usa directamente OpenAI con la configuración correcta
      });

      // Inicializamos el asistente con OpenAI
      assistant = openai;
      console.log("OpenAI assistant initialized");
    } catch (error) {
      console.error("Error initializing OpenAI assistant:", error);
    }
  };

  // Inicializa el asistente al arrancar el servidor
  initOpenAIAssistant();

  // Función para manejar el estado del run
  const handleRunStatus = async (threadId, run) => {
    // Check if the run is completed
    if (run.status === "completed") {
      let messages = await assistant.beta.threads.messages.list(threadId);
      console.log("Messages from completed run:", messages.data);
      return messages.data;
    } else if (run.status === "requires_action") {
      console.log("Run requires action. Handling tool outputs...");
      return await handleRequiresAction(threadId, run);
    } else {
      console.error("Run did not complete:", run);
      throw new Error("Run did not complete.");
    }
  };

  // Función para manejar las herramientas que requieren output
  const handleRequiresAction = async (threadId, run) => {
    if (
      run.required_action &&
      run.required_action.submit_tool_outputs &&
      run.required_action.submit_tool_outputs.tool_calls
    ) {
      // Loop through each tool in the required action section
      const toolOutputs = await Promise.all(
        run.required_action.submit_tool_outputs.tool_calls.map(async (tool) => {
          if (tool.function.name === "get_content") {
            const { Skill, AgeGroup, Goal } = JSON.parse(tool.function.arguments);
            const result = await get_content({ Skill, AgeGroup, Goal });
            return {
              tool_call_id: tool.id,
              output: JSON.stringify(result),
            };
          }
        })
      );

      // Submit all tool outputs at once
      if (toolOutputs.length > 0) {
        console.log("Submitting tool outputs...");
        run = await assistant.beta.threads.runs.submitToolOutputsAndPoll(
          threadId,
          run.id,
          { tool_outputs: toolOutputs }
        );
        console.log("Tool outputs submitted successfully.");
      } else {
        console.log("No tool outputs to submit.");
      }

      // Check status after submitting tool outputs
      return handleRunStatus(threadId, run);
    }
  };

  // Endpoint para crear un nuevo thread
  app.post('/createThread', async (req, res) => {
    try {
      const thread = await assistant.beta.threads.create();
      res.json({ threadId: thread.id });
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: 'Error creating thread' });
    }
  });

  // Endpoint para enviar un mensaje a un thread existente
  app.post('/sendMessageToThread', async (req, res) => {
    const { threadId, message } = req.body;
    console.log(`Sending message to Thread ID: ${threadId}, Message: ${message}`);

    if (!threadId || !message) {
      return res.status(400).json({ error: 'Thread ID and message are required' });
    }

    try {
      // Enviar el mensaje al thread
      console.log(`Sending message to Thread`);
      await assistant.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
      });

      // Crear un "run" con el asistente y hacer el polling
      let run = await assistant.beta.threads.runs.createAndPoll(threadId, {
        assistant_id: process.env.ASSISTANT_ID, 
      });
      console.log(`Run Started with ID: ${run.id}`);

      // Manejar el estado del run
      const finalMessages = await handleRunStatus(threadId, run);

      // Devolver el último mensaje al frontend
      const lastMessage = finalMessages
        .filter((msg) => msg.run_id === run.id && msg.role === "assistant")
        .pop();

      res.json({ message: lastMessage?.content[0]?.text?.value || "No response from assistant." });
    } catch (error) {
      console.error("Error sending message to thread:", error);
      res.status(500).json({ error: 'Error sending message to thread' });
    }
  });
}
