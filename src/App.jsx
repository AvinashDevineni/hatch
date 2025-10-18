import { useState } from 'react'
import Landing from './Landing';
import IdeaValidation from './IdeaValidation';
import ValidationLoading from './ValidationLoading';
import ValidationResults from './ValidationResults';
import OpenAI from "openai";

//Creating constant for new Open AI with API Key
const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  dangerouslyAllowBrowser: true
});

//Checking business validity 
async function checkBusinessIdea(idea) {
  const response = await client.responses.create({
    model: "gpt-5",
    //Asks for business idea input
    input: [
      {
        role: "developer",
        content: [
          { type: "input_text", text: "You are a business/startup idea evaluation expert. You will be given an idea by a budding entrepreneur." }
        ]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: idea }
        ]
      }
    ],
    //Assessing the uniqueness, feasibility, and if it is platform supported. 
    text: {
      format: {
        type: "json_schema",
        name: "business_uniqueness_and_feasibility",
        strict: true,
        schema: {
          type: "object",
          properties: {
            uniqueness: {
              type: "number",
              minimum: 0, maximum: 10,
              description: 'How unique the idea is on a scale from 0-10.'
            },
            feasibility: {
              type: "number",
              minimum: 0, maximum: 10,
              description: 'How feasible the idea is on a scale from 0-10.'
            },
            feedback: {
              type: 'string',
              description: 'Feedback/precautionary warnings for the founder. Must be short and to the point (~150 characters maximum).'
            },
            platformSupported: { 
              type: "boolean",
              description: 'Whether or not the idea can be implemented as a web application'
            }
          },
          required: ["uniqueness", "feasibility", "platformSupported", 'feedback'],
          additionalProperties: false
        }
      }
    }
  });

  return response.output_text;
}

function App() {
  const [ideaValidation, setIdeaValidation] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [idea, setIdea] = useState('');

  //Uses switch to move between different stages of website
  switch (pageIdx) {
    case 0:
      return <Landing onTryNow={() => setPageIdx(1)} />;

    case 1:
      return <IdeaValidation onSubmitClick={idea => {
        setIdea(idea);
        checkBusinessIdea(idea).then(res => {
          const validation = JSON.parse(res);
          setIdeaValidation(validation);
          setPageIdx(3);
        });

        setPageIdx(2);
      }} />;

    case 2:
      return <ValidationLoading />

    case 3:
      return <ValidationResults ideaValidation={ideaValidation} onCreateMvp={() => {

      }} onCreateMarketing={() => {
        setPageIdx(4);
      }} />;

    case 4:
      return <MarketingCreation idea={idea} />
  }
}

export default App;
