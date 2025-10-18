import Logo from '/logo.png'
import Lightbulb from '/lightbulb.png'
import Gear from '/gear.png'
import Rocket_Ship from '/rocketship.png';

import './Landing.css';

export default function Landing({ onTryNow }) {
    return (
        <>
            <div className="landing">
                <header>
                    <img src={Logo} alt="Hatch logo" className="logo" />
                    <h1>Hatch</h1>
                </header>

                <main>
                    <h1 id='hero'>Automate your startup journey — from idea to launch</h1>
                    <p className="mission">
                        Our mission is simple: make startup building effortless, so your ideas can change the world without risking your job.
                    </p>
                </main>

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

                <button className="main" onClick={onTryNow}>Try it now</button>
            </div>
        </>
    );
};