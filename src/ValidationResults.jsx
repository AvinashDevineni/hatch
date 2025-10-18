import Logo from '/logo.png';

import './ValidationResults.css';

export default function ValidationResults({ ideaValidation, onCreateMvp, onCreateMarketing }) {
    return (
        <>
            <header>
                <img src={Logo} alt="Hatch logo" className="logo" />
                <h1>Hatch</h1>
            </header>

            <h1 id='idea-validation'>Idea Validation Results</h1>

            <div id='results'>
                <div className='result'>
                    <div className='progress'>
                        <div className='progress-fill' style={{ width: `${ideaValidation.uniqueness * 10}%` }} />
                    </div>
                    <h2>Uniqueness: {(ideaValidation.uniqueness * 10).toFixed(0)}%</h2>
                </div>

                <div className='result'>
                    <div className='progress'>
                        <div className='progress-fill' style={{ width: `${ideaValidation.feasibility * 10}%` }} />
                    </div>
                    <h2>Feasibility: {(ideaValidation.feasibility * 10).toFixed(0)}%</h2>
                </div>

                <div className='result'>
                    <h2>Feedback</h2>
                    <p>{ideaValidation.platformSupported ? 'Your idea can easily be implemented as a web application by our agentic AI.' : 'Your idea is difficult to implement as a web application.'}</p>
                    <p><strong>Additional Feedback:</strong> {ideaValidation.feedback}</p>
                </div>
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', width: 'fit-content',
                    alignItems: 'center', gap: '15px'
                }}>
                    <button className='secondary' style={{ width: '100%' }} onClick={onCreateMvp}>Create an MVP</button>
                    <button className='secondary' style={{ width: '100%' }} onClick={onCreateMarketing}>Create marketing posts</button>
                    <button className='main' style={{ width: '100%' }} onClick={() => window.location.reload()}>Restart</button>
                </div>
            </div>
        </>
    );
};