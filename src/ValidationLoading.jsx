import './ValidationLoading.css';
import Logo from '/logo.png'

export default function ValidationLoading() {
    return (
        <>
            <header>
                <img src={Logo} alt="Hatch logo" className="logo" />
                <h1>Hatch</h1>
            </header>

            <div id='info-wrapper'>
                <span className="loader"></span>
                <p>Generating feedback for your idea...</p>
            </div>
        </>
    );
};