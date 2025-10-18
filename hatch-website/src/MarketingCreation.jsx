import { useEffect, useState } from "react";
import Logo from '/logo.png'

import './MarketingCreation.css';

export default function MarketingCreation({ idea, postTxt, postImgObjUrl, onBackClick, onTxtFetch, onImgUrlFetch, onCreatePostClick }) {
    useEffect(() => {
        const txtController = new AbortController();
        if (!postTxt) {
            const txtSignal = txtController.signal;
            fetch('http://127.0.0.1:8000/txt', {
                signal: txtSignal, method: 'POST',
                body: JSON.stringify({ idea })
            }).then(res => res.json()).then(res => onTxtFetch(res['post-txt']))
                .catch(e => console.error(e));
        }



        const imgController = new AbortController();
        if (!postImgObjUrl) {
            const imgSignal = imgController.signal;
            let objUrl = '';
            fetch('http://127.0.0.1:8000/img', {
                signal: imgSignal, method: 'POST',
                body: JSON.stringify({ idea })
            }).then(res => res.blob()).then(res => {
                objUrl = URL.createObjectURL(res);
                onImgUrlFetch(objUrl);
            }).catch(e => console.error(e));
        }

        return () => {
            txtController.abort();
            imgController.abort();
        };
    }, []);

    return (
        <>
            <header>
                <img src={Logo} alt="Hatch logo" className="logo" />
                <h1>Hatch</h1>
            </header>

            <h1>Post Information</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
                <div className='post-info' style={{ textAlign: 'left' }}>
                    <h2>Post Text</h2>
                    {
                        postTxt ?
                            <p style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{postTxt}</p>
                            :
                            <>
                                <div className='skeleton' style={{ width: '60%', height: '25px' }} />
                                <div className='skeleton' style={{ width: '80%', height: '25px' }} />
                                <br />
                                <div className='skeleton' style={{ width: '90%', height: '25px' }} />
                                <div className='skeleton' style={{ width: '85%', height: '25px' }} />
                                <div className='skeleton' style={{ width: '35%', height: '25px' }} />
                            </>
                    }
                </div>
                <div className='post-info'>
                    <h2>Post Image</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        {
                            !postImgObjUrl ? <span className='skeleton' style={{ width: '400px', height: '400px' }} />
                                :
                                <>
                                    <img src={postImgObjUrl} style={{ width: '400px', height: '400px' }} />
                                    <button className='main'><a href={postImgObjUrl} target="_blank">Download Image</a></button>
                                </>
                        }
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                <button className='secondary' onClick={onBackClick}>Go Back</button>
                <button className='main' onClick={onCreatePostClick}>Create Post</button>
            </div>
        </>
    );
};