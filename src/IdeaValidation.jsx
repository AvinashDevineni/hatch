import { useRef } from 'react';

import Logo from '/logo.png';
import './IdeaValidation.css';

export default function IdeaValidation({ onSubmitClick }) {
    const inputRef = useRef();

    return (
        <>
            <header>
                <img src={Logo} alt="Hatch logo" className="logo" />
                <h1>Hatch</h1>
            </header>

            <div id='idea-validation-txt'>
                <h1>Validate Your Idea</h1>
                <p>Our AI analyzes your idea and provides vital feedback</p>
            </div>

            <div id="ideaContainer">
                <textarea ref={inputRef} placeholder='Enter your amazing idea (be as detailed as possible!)...' id="ideaInput" />
                <button
                    className='main'
                    onClick={async e => {
                        e.preventDefault();
                        onSubmitClick(inputRef.current.value);
                    }}>
                    Submit
                </button>
            </div>
        </>
    );
};