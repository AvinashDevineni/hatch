
import { useEffect, useState } from 'react'
import Landing from './Landing';
import IdeaValidation from './IdeaValidation';
import ValidationLoading from './ValidationLoading';
import ValidationResults from './ValidationResults';
import MarketingCreation from './MarketingCreation';
import OpenAI from "openai";
import Loader from './Loader';

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

async function estimateMetric(idea) {
  const response = await client.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content: "You are a business analyst that looks at new start-ups and provides possible metrics for the new business idea."
      },
      {
        role: "user",
        content: `Estimate key metrics for this idea: "${idea}". 
        Return JSON with:
        {
          "marketPotential": "High/Medium/Low",
          "estimatedCostToLaunch": "number (USD)",
          "expectedROI": "number representing percentage"
        }`
      }
    ],
    response_format: { type: "json_object" } // makes the response clean JSON
  });

  const metrics = JSON.parse(response.choices[0].message.content);
  console.log(metrics);
  return metrics;
}

function App() {
  const [ideaValidation, setIdeaValidation] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [idea, setIdea] = useState('');
  const [postTxt, setPostTxt] = useState(null);
  const [postImgObjUrl, setPostImgObjUrl] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [hasPosted, setHasPosted] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    return () => {
      if (postImgObjUrl) URL.revokeObjectURL(postImgObjUrl);
    }
  }, []);

  //Uses switch to move between different stages of website
  switch (pageIdx) {
    case 0:
      return <Landing onTryNow={() => setPageIdx(1)} />;

    case 1:
      return <IdeaValidation onSubmitClick={idea => {
        setIdea(idea);
        setPageIdx(2);

        Promise.all([
          checkBusinessIdea(idea).then(res => {
            const validation = JSON.parse(res);
            setIdeaValidation(validation);
          }),
          estimateMetric(idea).then(metrics => setMetrics(metrics))
        ]).then(() => setPageIdx(3)).catch(e => console.error(e));
      }} />;

    case 2:
      return <ValidationLoading />

    case 3:
      return <ValidationResults ideaValidation={ideaValidation} metrics={metrics} onCreateMvp={() => setPageIdx(5)}
        onCreateMarketing={() => setPageIdx(4)} />;

    case 4:
      return (
        <>
          {
            isPosting &&
            <>
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw',
                height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.55)'
              }} />
              <div style={{
                position: 'fixed', top: 0, left: 0, display: 'flex',
                justifyContent: 'center', alignItems: 'center',
                zIndex: 100, width: '100vw', height: '100vh',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Loader />
                  <h2>Posting on LinkedIn...</h2>
                </div>
              </div>
            </>
          }

          {
            hasPosted &&
            <>
              <div style={{
                position: 'fixed', top: 0, left: 0, width: '100vw',
                height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.55)'
              }} />
              <div style={{
                position: 'fixed', top: 0, left: 0, display: 'flex',
                justifyContent: 'center', alignItems: 'center',
                zIndex: 100, width: '100vw', height: '100vh',
              }}>
                <div style={{
                  width: '400px', height: '250px',
                  backgroundColor: '#ffffff', borderRadius: '30px',
                  padding: '10px 20px'
                }}>
                  <h1 style={{ textAlign: 'center' }}>LinkedIn Post Created!</h1>
                  <p style={{ color: '#0b1a33' }}>
                    A new marketing post has been created for you automatically! Enjoy your effortless and free marketing
                  </p>
                  <button className='main' style={{ marginTop: '40px' }} onClick={() => setHasPosted(false)}>Close</button>
                </div>
              </div>
            </>
          }

          <MarketingCreation idea={idea} postTxt={postTxt} postImgObjUrl={postImgObjUrl}
            onBackClick={() => setPageIdx(3)} onTxtFetch={txt => setPostTxt(txt)}
            onImgUrlFetch={url => setPostImgObjUrl(url)} onCreatePostClick={async () => {
              setIsPosting(true);

              const blob = await fetch(postImgObjUrl).then(res => res.blob());

              const formData = new FormData();
              formData.append('post_img', blob);
              formData.append('post_txt', postTxt);

              fetch('http://127.0.0.1:8000/post', {
                method: 'POST', body: formData
              }).then(res => console.log(res)).catch(e => console.error(e)).finally(() => {
                setIsPosting(false);
                setHasPosted(true);
              });
            }} />
        </>
      )

    // case 5:
    //   return <OnCreateMvp idea={idea} />
  }
}

export default App;
