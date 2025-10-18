import { useRef, useState } from 'react'
import OpenAI from "openai";
import './App.css'
import Logo from '/logo.png'
import Lightbulb from '/lightbulb.png'
import Gear from '/gear.png'
import Rocket_Ship from '/rocketship.png'

// Initialize OpenAI
const client = new OpenAI({
  apiKey: 'YOUR_API_KEY',
  dangerouslyAllowBrowser: true
});

async function checkBusinessIdea(idea) {
  const response = await client.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "developer",
        content: [
          { type: "input_text", text: "You are a business/startup idea evaluation expert." }
        ]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: idea }
        ]
      }
    ],
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
            platformSupported: { type: "boolean" }
          },
          required: ["uniqueness", "feasibility", "platformSupported"],
          additionalProperties: false
        }
      }
    }
  });

  return response.output_text;
}

function App() {
  const [businessIdea, setBusinessidea] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const inputRef = useRef();

  switch (pageIdx) {
    // Landing page
    case 0:
      return (
        <div className="landing">
          <header>
            <img src={Logo} alt="Hatch logo" className="logo" />
            <h1>Automate your startup journey — from idea to launch</h1>
            <p className="mission">
              Our mission is simple: make startup building effortless, so more ideas can change the world.
            </p>
          </header>

          <div className="features">
            <div className="feature-card">
              <img src={Lightbulb} alt="lightbulb" />
              <h3>Validate your business Idea</h3>
              <p>AI insights on feasibility and demand</p>
            </div>

            <div className="feature-card">
              <img src={Gear} alt="gear" />
              <h3>Generate your MVP</h3>
              <p>Prototype and content created automatically</p>
            </div>

            <div className="feature-card">
              <img src={Rocket_Ship} alt="Rocket" />
              <h3>Launch & Grow</h3>
              <p>Create ads, get publicity and expand!</p>
            </div>
          </div>

          <button className="cta" onClick={() => setPageIdx(1)}>Try it now</button>
        </div>
      );

    // Input form
    case 1:
      return (
        <>
          <h1>Welcome to Hatch!</h1>
          <div id="ideaContainer">
            <form id="ideaExist">
              <label htmlFor="idea">Enter your business idea:</label>
              <input ref={inputRef} type="text" id="ideaExistInput" />
              <button
                type="submit"
                onClick={async e => {
                  e.preventDefault();
                  const res = await checkBusinessIdea(inputRef.current.value);
                  setBusinessidea(JSON.parse(res));
                  setPageIdx(2);
                }}
              >
                Submit
              </button>
            </form>
          </div>
        </>
      );

    // Results page
    case 2:
      console.log(businessIdea)
      return (
        <div className="results">
          <h2>Results</h2>
          <p>Is your business idea unique: {businessIdea.uniqueness}</p>
          <p>Is your business idea feasible: {businessIdea.feasibility}</p>
          <p>Is your platform supported: {`${businessIdea.platformSupported}`}</p>
        </div>
      );
  }
}

export default App;
