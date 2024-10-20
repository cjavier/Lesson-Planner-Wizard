
import axios from 'axios';

export const get_content = async (contentData: { Skill: string, AgeGroup: string, Goal: string }) => {
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


  export const tools = [
    {
      type: "function",
      function: {
        "name": "get_content",
        "description": "Search for content in everydayspeech based on Skill, Age Group and Goal.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "Skill": {
              "type": "string",
              "description": "The skill the user wants to work on."
            },
            "AgeGroup": {
              "type": "string",
              "description": "The age group of the content to be returned."
            },
            "Goal": {
              "type": "string",
              "description": "The goal to achieve with that content."
            }
          },
          "additionalProperties": false,
          "required": ["Skill", "AgeGroup", "Goal"]
        }
      }
    }
  ];
  