import React from "react";
import { useLocation } from "react-router";

const VisualizerId = () => {
  const location = useLocation();
  const { initialImage, name } = location.state || {};

  return (
    <div>
      <h1> {name || "Untitled Project"}</h1>

      <div className="visualizer">
        {initialImage && (
          <div className="image-container">
            <h2>Source Image</h2>
            <img src={initialImage} alt="Source Image" />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizerId;
