import React from 'react';
import './css/loader.css'; // Import the CSS file

export const Loader = ({ active }: { active: boolean }) => {
    if (!active) return null;

    return (
        <div className="universal-loader-overlay">
            <div className="universal-loader-box">
                <div className="universal-loader-spinner"></div>
                <div className="universal-loader-text">Processing...</div>
            </div>
        </div>
    );
};