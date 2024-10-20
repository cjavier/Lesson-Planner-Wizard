import express from 'express';
import compression from 'compression';
import path from 'path';
import { ChromaClient } from 'chromadb';
import fs from 'fs';
import csv from 'csv-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Definir __dirname en ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware para CORS
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(compression());
app.use(express.json());

// Inicializar ChromaClient
const client = new ChromaClient();
let collection; // Variable para almacenar la colección

// Función para borrar y crear una colección nueva (solo se usa en la inicialización)
async function createNewCollection(client, collectionName) {
  try {
    // Intentar eliminar la colección si ya existe
    await client.deleteCollection({ name: collectionName });
    console.log(`Collection '${collectionName}' deleted successfully.`);
  } catch (error) {
    console.log(`Error deleting collection (it might not exist yet): ${error}`);
  }

  // Crear la nueva colección
  collection = await client.createCollection({ name: collectionName });
  console.log(`Collection '${collectionName}' created successfully.`);
  return collection;
}

// Función para procesar el CSV y agregar los documentos a la colección
async function processCsvAndAddToCollection(collection) {
  let documents = [];
  let metadatas = [];
  let ids = [];
  let id = 1;

  return new Promise((resolve, reject) => {
    fs.createReadStream('eds-content-data.csv') // Asegúrate de que la ruta sea correcta
      .pipe(csv())
      .on('data', (row) => {
        const documentContent = row['Content.title'];
        const metadata = {
          contentId: row['Content.id'],
          contentName: row['Content.title'],
          contentURL: row['Content.Link'],
          contentType: row['Content.type'],
          contentGoal: row['Goal (from Goal content)'],
          contentAge: row['Age'],
          contentLevel: row['Current Level'],
          contentSkill: row['SCC Unit Title'],
        };

        documents.push(documentContent);
        metadatas.push(metadata);
        ids.push(`id${id}`);
        id++;
      })
      .on('end', async () => {
        console.log('CSV file successfully processed');
        await collection.add({
          documents: documents,
          metadatas: metadatas,
          ids: ids,
          embeddings: null, // Para evitar el intento de generación de embeddings
        });
        console.log('Data added to the collection successfully');
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Inicialización de la base de datos y procesamiento del CSV
async function initializeDatabase() {
  collection = await createNewCollection(client, 'eds_content');
  await processCsvAndAddToCollection(collection);
  console.log('Database initialized successfully.');
}

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

// Inicializar la base de datos antes de levantar el servidor
initializeDatabase()
  .then(() => {
    // Servir el frontend estático si es necesario
    app.use(express.static(path.join(__dirname, 'build')));

    // Cualquier otra ruta redirige al frontend
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
    });

    // Levantar el servidor en el puerto especificado
    app.listen(PORT, () => {
      console.log(`Server is running on: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error initializing the database:', error);
  });
